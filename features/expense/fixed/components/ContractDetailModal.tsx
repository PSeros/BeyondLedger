"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type ContractDetailModalProps = {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
};

// Backs the intercepted-route modal: it's always open (its presence in the route is what
// "opens" it), controlled via isOpen. Any dismissal (backdrop, Esc, close button) navigates
// back via router.back(), which unmounts the @modal slot.
export default function ContractDetailModal({title, footer, children}: ContractDetailModalProps) {
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
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
