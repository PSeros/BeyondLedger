"use client";

import type {ReactNode} from "react";
import {Modal} from "@heroui/react";
import {useRouter} from "next/navigation";

type ContractDetailModalProps = {
  title: string;
  children: ReactNode;
};

// Backs the intercepted-route modal: it's always open (its presence in the route is what
// "opens" it), and any dismissal (backdrop, Esc, close button) navigates back to the
// intercepted-from list page via router.back(), which unmounts the @modal slot.
export default function ContractDetailModal({title, children}: ContractDetailModalProps) {
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
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger/>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
