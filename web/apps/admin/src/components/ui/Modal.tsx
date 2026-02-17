import React from "react";
import { Bar, Dialog as Ui5Dialog, Title } from "@ui5/webcomponents-react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <Ui5Dialog
      open={isOpen}
      onClose={onClose}
      className="admin-ui5-modal"
      header={
        <Bar
          className="admin-ui5-modal-header"
          endContent={
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        >
          <Title level="H5" size="H5">
            {title}
          </Title>
        </Bar>
      }
    >
      <div className="admin-ui5-modal-body">{children}</div>
    </Ui5Dialog>
  );
}
