"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type DetailModalProps = {
  /** Accent-tinted badge icon shown at the left of the header. */
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
};

// Backs the intercepted-route detail modals (Bill + Contract): always open — its presence in
// the route is what "opens" it — controlled via isOpen. Any dismissal (backdrop, Esc, close
// button, the footer's Close) navigates back via router.back(), which unmounts the @modal slot.
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
      {/*
        A route-driven modal has no visible trigger, but Modal (a DialogTrigger) expects a
        pressable child — without one react-aria warns "PressResponder rendered without a
        pressable child". This hidden Modal.Trigger satisfies that; opening is driven by isOpen.
      */}
      <Modal.Trigger className="hidden" aria-hidden="true" tabIndex={-1}/>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            {/* !flex-row overrides .modal__header's flex-col so the badge sits left of the titles.
                The close trigger is absolutely positioned (top-right), so it stays out of this row. */}
            <Modal.Header className="!flex-row items-start gap-3">
              {icon ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <Modal.Heading className="block truncate !text-base !font-semibold">{title}</Modal.Heading>
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
