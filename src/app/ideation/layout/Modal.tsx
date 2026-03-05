"use client";

import { useEffect, useRef } from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal-dialog" onClose={onClose}>
      <div className="modal-content">
        {title && <h2 className="modal-title">{title}</h2>}
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
