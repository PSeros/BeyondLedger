"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type DetailModalProps = {
  icon?: ReactNode;
  title: string;
  titleTrailing?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export default function DetailModal({icon, title, titleTrailing, subtitle, footer, children}: DetailModalProps) {
  const router = useRouter();

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
      <Modal.Container size="lg">
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
          <Modal.Body className="-mx-6 px-6 py-1">{children}</Modal.Body>
          {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
