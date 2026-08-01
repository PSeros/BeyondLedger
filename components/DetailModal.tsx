"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type DetailModalProps = {
  icon?: ReactNode;
  title: string;
  // Rendered inline right after the title (e.g. a category chip beside a Bill's supplier title).
  titleTrailing?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export default function DetailModal({icon, title, titleTrailing, subtitle, footer, children}: DetailModalProps) {
  const router = useRouter();

  // Route-driven modal: it's always open (its presence in the @modal slot is what "opens" it),
  // so it's driven straight from the controlled ModalOverlay (Modal.Backdrop) instead of a
  // DialogTrigger. Skipping the Modal root + a hidden Modal.Trigger avoids react-aria's Pressable
  // ("child must be focusable" / "PressResponder without a pressable child") warnings a trigger-
  // less DialogTrigger emits. Any dismissal (backdrop, Esc, close button) → onOpenChange(false)
  // → router.back(), which unmounts the slot.
  return (
    <Modal.Backdrop
      isOpen
      variant={"blur"}
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger/>
          <Modal.Header className="flex-row items-start gap-3">
            {icon ? (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Modal.Heading className="min-w-0 truncate text-base font-semibold">{title}</Modal.Heading>
                {titleTrailing}
              </div>
              {subtitle ? (
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">{subtitle}</div>
              ) : null}
            </div>
          </Modal.Header>
          {/* The scroll body spans into the dialog's p-6 (-mx-6) but re-insets its content
              (px-6) so the overflow clip edge — and the scrollbar — sit in the gutter, not over
              the content or clipping input focus rings. */}
          <Modal.Body className="-mx-6 px-6 py-1">{children}</Modal.Body>
          {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
