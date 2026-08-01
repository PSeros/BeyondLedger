"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type DetailModalProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export default function DetailModal({icon, title, subtitle, footer, children}: DetailModalProps) {
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
              <Modal.Heading className="block truncate text-base font-semibold">{title}</Modal.Heading>
              {subtitle ? <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p> : null}
            </div>
          </Modal.Header>
          <Modal.Body>{children}</Modal.Body>
          {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
