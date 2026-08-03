import {z} from "zod";

// The structured shape we ask Mistral to extract from an uploaded document (Phase 8c). The schema
// is built PER REQUEST from the caller's existing categories: the supplier's `supplierCategory` and
// each line item's `category` are Zod enums locked to the existing names (plus the "Uncategorized"
// escape hatch), so the model can only ever map to categories that already exist — never invent new
// ones. This constraint reaches both pipeline modes: generateObject enforces the Zod schema directly
// (Mode B), and z.toJSONSchema() emits the same `enum` into the strict json_schema sent to /v1/ocr
// (Mode A).

export const UNCATEGORIZED = "Uncategorized";

// Builds a Zod enum from existing category names: de-duplicated (case-insensitively) with the
// "Uncategorized" escape hatch guaranteed present and last.
function buildCategoryEnum(names: string[]) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const name of [...names, UNCATEGORIZED]) {
    const key = name.toLowerCase();
    if (name.trim() !== "" && !seen.has(key)) {
      seen.add(key);
      values.push(name);
    }
  }
  // z.enum needs a non-empty tuple type; the cast is safe because `values` always holds ≥1 entry.
  return z.enum(values as [string, ...string[]]);
}

export function buildBillDraftSchema(itemCategoryNames: string[], supplierCategoryNames: string[]) {
  const itemCategoryEnum = buildCategoryEnum(itemCategoryNames);
  const supplierCategoryEnum = buildCategoryEnum(supplierCategoryNames);

  return z.object({
    supplierName: z.string().describe("The merchant / supplier / store name on the document."),
    supplierCategory: supplierCategoryEnum.describe(
      `The supplier's business category (e.g. groceries, utilities, electronics). Pick the closest ` +
        `match from this fixed list; use "${UNCATEGORIZED}" if none fit.`,
    ),
    documentNumber: z
      .string()
      .nullable()
      .describe("Invoice or receipt number, or null if none is printed."),
    date: z.string().describe("The document date as an ISO calendar date, YYYY-MM-DD."),
    total: z.number().describe("The grand total amount paid."),
    lineItems: z
      .array(
        z.object({
          name: z.string().describe("The purchased item's name."),
          category: itemCategoryEnum.describe(
            `Pick the closest matching category from this fixed list; use "${UNCATEGORIZED}" if none fit.`,
          ),
          quantity: z.number().describe("Quantity purchased (1 if not stated)."),
          unitPrice: z.number().describe("Price per unit."),
        }),
      )
      .describe("The individual purchased line items. Empty if the document has no itemization."),
  });
}

export type BillDraftSchema = ReturnType<typeof buildBillDraftSchema>;
export type BillDraft = z.infer<BillDraftSchema>;

// JSON Schema for Mistral Mode A's document_annotation_format. Uses Zod v4's NATIVE converter
// (the separate `zod-to-json-schema` package does not support Zod v4). Strips the top-level
// `$schema` meta key, which Mistral's json_schema.schema does not expect.
export function billDraftJsonSchema(schema: BillDraftSchema): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
