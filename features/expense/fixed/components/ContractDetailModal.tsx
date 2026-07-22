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
// "opens" it). Rendered as a controlled ModalOverlay (Modal.Backdrop) directly — NOT wrapped
// in Modal (a DialogTrigger), which would expect a pressable trigger child and warn. Any
// dismissal (backdrop, Esc) navigates back via router.back(), unmounting the @modal slot.
export default function ContractDetailModal({title, footer, children}: ContractDetailModalProps) {
  const router = useRouter();

  return (
    <Modal.Backdrop
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
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
  );
}
