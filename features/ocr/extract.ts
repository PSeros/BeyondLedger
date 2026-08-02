import {generateObject} from "ai";
import {createMistral} from "@ai-sdk/mistral";
import {client} from "@/lib/prisma";
import type {AiSettings} from "@/features/settings/db/aiSettings";
import {DEFAULT_MISTRAL_BASE_URL} from "@/features/settings/db/aiSettings";
import {type BillDraft, type BillDraftSchema, UNCATEGORIZED, billDraftJsonSchema, buildBillDraftSchema} from "@/features/ocr/schema";
import {type OcrInput, runOcr} from "@/features/ocr/mistralOcr";

// The pluggable extraction interface (Phase 8c): a document's bytes → a validated BillDraft, using
// whichever pipeline mode is configured. Both modes are constrained to the caller's existing item
// categories (see schema.ts). Pure of DB writes except a read of the category list; turning the
// draft into a Bill is 8d.

const EXTRACTION_INSTRUCTION =
  "You are extracting structured data from a purchase receipt or invoice. Return the supplier " +
  "name, document number (or null), the document date as YYYY-MM-DD, the grand total, and the line " +
  `items. For each line item, choose its category ONLY from the allowed list; if none fit, use "${UNCATEGORIZED}".`;

// Loads the existing item-category names the extraction should be constrained to.
async function getItemCategoryNames(): Promise<string[]> {
  const rows = await client.itemCategory.findMany({select: {name: true}, orderBy: {name: "asc"}});
  return rows.map((row) => row.name);
}

// Mode A — Document AI one-shot: Mistral OCRs and shapes the result to our JSON schema server-side.
async function documentAiExtract(
  input: OcrInput,
  settings: AiSettings,
  schema: BillDraftSchema,
): Promise<BillDraft> {
  const {annotation} = await runOcr(input, settings, billDraftJsonSchema(schema));
  if (!annotation) {
    throw new Error("OCR returned no structured annotation.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(annotation);
  } catch {
    throw new Error("OCR returned malformed annotation JSON.");
  }
  return schema.parse(parsed);
}

// Mode B — Separated: OCR to markdown, then a chat model extracts structured data from that text.
async function separatedExtract(
  input: OcrInput,
  settings: AiSettings,
  schema: BillDraftSchema,
): Promise<BillDraft> {
  const {markdown} = await runOcr(input, settings);
  if (markdown.trim() === "") {
    throw new Error("OCR produced no text to extract from.");
  }

  const baseUrl = settings.baseUrl?.trim();
  const mistral = createMistral({
    apiKey: settings.apiKey,
    baseURL: baseUrl ? `${baseUrl.replace(/\/+$/, "")}/v1` : `${DEFAULT_MISTRAL_BASE_URL}/v1`,
  });

  const {object} = await generateObject({
    model: mistral(settings.extractModel),
    schema,
    system: EXTRACTION_INSTRUCTION,
    prompt: `Document text:\n\n${markdown}`,
  });
  return object;
}

export async function extract(input: OcrInput, settings: AiSettings): Promise<BillDraft> {
  const schema = buildBillDraftSchema(await getItemCategoryNames());
  return settings.pipelineMode === "SEPARATED"
    ? separatedExtract(input, settings, schema)
    : documentAiExtract(input, settings, schema);
}
