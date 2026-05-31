import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  testId = "confirm-dialog",
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      data-testid={`${testId}-backdrop`}
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        aria-describedby={`${testId}-message`}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: theme.colors.background,
          borderRadius: 14,
          padding: "20px 20px 16px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          id={`${testId}-title`}
          style={{
            margin: "0 0 8px",
            fontSize: 17,
            fontWeight: 700,
            color: theme.colors.text,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </h2>
        <p
          id={`${testId}-message`}
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            lineHeight: 1.45,
            color: theme.colors.textSecondary,
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            data-testid={`${testId}-cancel`}
            onClick={onCancel}
            style={{
              border: `1px solid ${theme.colors.borderLight}`,
              background: theme.colors.surface,
              color: theme.colors.text,
              borderRadius: theme.radius.full,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {cancelLabel ?? t("common.actions.cancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
            style={{
              border: "none",
              background: theme.colors.accent,
              color: theme.colors.accentText,
              borderRadius: theme.radius.full,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {confirmLabel ?? t("common.actions.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
