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

  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <Modal.Trigger className="hidden" aria-hidden="true" tabIndex={-1}/>
      <Modal.Backdrop variant={"blur"}>
        <Modal.Container>
          {/* HeroUI's dialog size presets top out at --container-lg (32rem); override to a wider
              max so the detail/edit content (esp. the item-edit rows) has room to breathe. */}
          <Modal.Dialog className="!max-w-3xl">
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
    </Modal>
  );
}
