import {DEFAULT_MISTRAL_BASE_URL, type AiSettings} from "@/features/settings/db/aiSettings";

// Low-level client for Mistral's Document AI OCR endpoint (POST /v1/ocr), used by both extraction
// modes in extract.ts (Phase 8c). The AI SDK does not cover OCR, so this is a direct REST call.
// Provider-generic: host/model/key all come from AiSettings.

export type OcrInput = {bytes: Uint8Array; mimeType: string};

export type OcrResult = {
  markdown: string; // all pages joined; empty when only an annotation was requested
  annotation: string | null; // Mode A: the document_annotation JSON string; else null
};

const OCR_TIMEOUT_MS = 120_000;

// Maps a stored file's MIME type to the /v1/ocr `document` chunk. Mistral accepts PDFs as a
// `document_url` data URI and images as an `image_url` data URI.
function buildDocumentChunk(input: OcrInput): Record<string, string> {
  const base64 = Buffer.from(input.bytes).toString("base64");
  const mime = input.mimeType.toLowerCase();

  if (mime === "application/pdf") {
    return {type: "document_url", document_url: `data:application/pdf;base64,${base64}`};
  }
  if (mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg" || mime === "image/webp") {
    const normalized = mime === "image/jpg" ? "image/jpeg" : mime;
    return {type: "image_url", image_url: `data:${normalized};base64,${base64}`};
  }
  throw new Error(`Unsupported document type for OCR: ${input.mimeType} (expected PDF or image).`);
}

type OcrResponse = {
  pages?: {markdown?: string}[];
  document_annotation?: string | null;
};

// Runs OCR. Passing `annotationJsonSchema` switches on Mode A (Mistral OCRs and shapes the result to
// the schema server-side, returned as a JSON string in `document_annotation`); omitting it returns
// plain page markdown for Mode B's separate extraction step. Throws a friendly error on any failure
// so the caller (8d) can mark the FileAsset FAILED.
export async function runOcr(
  input: OcrInput,
  settings: AiSettings,
  annotationJsonSchema?: Record<string, unknown>,
): Promise<OcrResult> {
  if (settings.apiKey.trim() === "") {
    throw new Error("No API key configured — set one in Settings.");
  }

  const baseUrl = (settings.baseUrl?.trim() || DEFAULT_MISTRAL_BASE_URL).replace(/\/+$/, "");
  const body: Record<string, unknown> = {
    model: settings.ocrModel,
    document: buildDocumentChunk(input),
  };
  if (annotationJsonSchema) {
    body.document_annotation_format = {
      type: "json_schema",
      json_schema: {name: "bill_draft", schema: annotationJsonSchema, strict: true},
    };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/ocr`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("OCR request timed out.");
    }
    throw new Error("Could not reach the OCR provider.");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("OCR authentication failed — check the API key.");
    }
    const detail = await res.text().catch(() => "");
    throw new Error(`OCR request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : "."}`);
  }

  const data = (await res.json()) as OcrResponse;
  const markdown = (data.pages ?? [])
    .map((page) => page.markdown ?? "")
    .join("\n\n")
    .trim();

  return {markdown, annotation: data.document_annotation ?? null};
}
