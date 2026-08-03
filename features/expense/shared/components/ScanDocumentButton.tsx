"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Modal} from "@heroui/react";
import {useRouter} from "next/navigation";
import {LuUpload} from "react-icons/lu";
import UploadDropzoneModal from "@/features/expense/shared/components/UploadDropzoneModal";
import {deleteFileAsset} from "@/features/expense/shared/db/fileMutations";
import {processOcrUpload, retryOcrUpload, uploadForOcr} from "@/features/ocr/db/ocrActions";
import {closeToast, pushToast} from "@/lib/scanToasts";

type ScanDocumentButtonProps = {
  // Whether the AI provider is configured (enabled + has an API key). The button is hidden otherwise.
  aiEnabled: boolean;
};

type ErrorInfo = {fileId: number; fileName: string; message: string};

// The expense-toolbar "Upload" button (Phase 8d): opens a drag-and-drop picker, then scans each chosen
// document through the OCR pipeline into a Bill. Lives on BOTH /expense/variable and /expense/fixed —
// scanning always creates a variable Bill (never a Contract), so the button is identical on either page.
// Progress is tracked entirely in HeroUI toasts: a spinner while processing, a checkmark + "Open bill"
// on success, an alert + "View details" on failure. Sits in a ButtonGroup, so it forwards the
// __button_group_child marker onto the real Button. Renders nothing when AI is not configured.
export default function ScanDocumentButton({aiEnabled, ...buttonProps}: ScanDocumentButtonProps) {
  const router = useRouter();
  const t = useTranslations("scan");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Runs the (slow) extraction for an already-uploaded file, closing the processing toast `key` and
  // replacing it with a success or failure toast. Shared by the initial scan and the Retry action.
  async function finishPipeline(
    key: string,
    fileId: number,
    fileName: string,
    process: (id: number) => Promise<Awaited<ReturnType<typeof processOcrUpload>>>,
  ) {
    try {
      const result = await process(fileId);
      closeToast(key);
      pushToast(t("billAdded"), {
        variant: "success",
        timeout: 6000,
        description: `${result.supplierName} · ${format.number(result.totalAmount, "currency")}`,
        actionProps: {
          children: t("openBill"),
          onPress: () => router.push(`/expense/variable/${result.billId}`),
        },
      });
      router.refresh();
    } catch (error) {
      closeToast(key);
      const message = error instanceof Error ? error.message : tErrors("ocrFailed");
      pushToast(t("scanFailed"), {
        variant: "danger",
        timeout: 10000,
        description: message,
        actionProps: {
          children: t("viewDetails"),
          onPress: () => setErrorInfo({fileId, fileName, message}),
        },
      });
    }
  }

  // Uploads one file, then runs the pipeline — each file gets its own independent toast.
  async function startScan(file: File) {
    const fileName = file.name;
    const key = pushToast(t("scanning", {name: fileName}), {isLoading: true, timeout: 0});
    let fileId: number;
    try {
      const formData = new FormData();
      formData.append("file", file);
      ({fileId} = await uploadForOcr(formData));
    } catch (error) {
      closeToast(key);
      pushToast(t("uploadFailedTitle"), {
        variant: "danger",
        timeout: 8000,
        description: error instanceof Error ? error.message : tErrors("uploadFailed"),
      });
      return;
    }
    await finishPipeline(key, fileId, fileName, processOcrUpload);
  }

  function onSubmit(files: File[]) {
    for (const file of files) void startScan(file);
  }

  function onRetry() {
    if (!errorInfo) return;
    const {fileId, fileName} = errorInfo;
    setErrorInfo(null);
    const key = pushToast(t("scanning", {name: fileName}), {isLoading: true, timeout: 0});
    void finishPipeline(key, fileId, fileName, retryOcrUpload);
  }

  function onDiscard() {
    if (!errorInfo) return;
    const {fileId} = errorInfo;
    setErrorInfo(null);
    void deleteFileAsset(fileId).catch(() => undefined); // best-effort cleanup of the failed upload
  }

  // Hidden entirely when the AI provider isn't configured — there's nothing to scan into.
  if (!aiEnabled) return null;

  return (
    <>
      <Button {...buttonProps} onPress={() => setPickerOpen(true)}>
        <ButtonGroup.Separator/>
        <LuUpload/>
        {t("upload")}
      </Button>

      <UploadDropzoneModal isOpen={pickerOpen} onOpenChange={setPickerOpen} onSubmit={onSubmit}/>

      <Modal.Backdrop
        isOpen={errorInfo !== null}
        variant="blur"
        onOpenChange={(open) => {
          if (!open) setErrorInfo(null);
        }}
      >
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            <Modal.Header className="flex-row items-start gap-3">
              <div className="min-w-0 flex-1">
                <Modal.Heading className="block truncate text-base font-semibold">{t("scanFailed")}</Modal.Heading>
                <p className="mt-0.5 truncate text-sm text-muted">{errorInfo?.fileName}</p>
              </div>
            </Modal.Header>
            {/* Modal.Body forces text-muted on its content; re-assert text-foreground so the message reads normally. */}
            <Modal.Body className="-mx-6 px-6 py-1">
              <p className="text-sm text-foreground">{errorInfo?.message}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onPress={onDiscard}>
                {t("discardUpload")}
              </Button>
              <Button type="button" variant="primary" onPress={onRetry}>
                {tCommon("retry")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
