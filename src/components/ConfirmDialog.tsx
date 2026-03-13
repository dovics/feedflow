"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button by default
      confirmButtonRef.current?.focus();

      // Trap focus within dialog
      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const focusableElements = [confirmButtonRef.current, cancelButtonRef.current].filter(Boolean);
          if (focusableElements.length === 2) {
            if (e.shiftKey && document.activeElement === confirmButtonRef.current) {
              cancelButtonRef.current?.focus();
            } else if (!e.shiftKey && document.activeElement === cancelButtonRef.current) {
              confirmButtonRef.current?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="bg-theme-surface rounded-lg shadow-xl max-w-md w-full p-6">
        <h2
          id="confirm-dialog-title"
          className="text-xl font-semibold text-theme-primary mb-2"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          className="text-theme-secondary mb-6"
        >
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-4 py-2 text-theme-primary bg-theme-surface hover:bg-theme-surface/80 rounded-md transition-colors focus-ring"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md transition-colors focus-ring ${
              isDangerous
                ? "text-white bg-red-600 hover:bg-red-700"
                : "text-white bg-accent hover:bg-accent/80"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
