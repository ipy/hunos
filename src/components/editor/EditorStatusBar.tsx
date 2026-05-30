import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import type { Editor } from "@tiptap/react";
import { deriveNoteStatsFromEditor } from "@/utils/noteStats";

interface EditorStatusBarProps {
  editor: Editor;
  lineWidth?: number;
}

export function EditorStatusBar({
  editor,
  lineWidth = 42,
}: EditorStatusBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    refresh();
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const { wordCount, charCount } = useMemo(
    () => deriveNoteStatsFromEditor(editor),
    [editor, revision],
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: theme.colors.textTertiary,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
  };

  return (
    <footer
      data-testid="editor-status-bar"
      style={{
        flexShrink: 0,
        display: "flex",
        justifyContent: "center",
        padding: "2px 24px 4px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: `${lineWidth}em`,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          ...labelStyle,
        }}
      >
        <span>
          <span data-testid="editor-status-words">
            {wordCount.toLocaleString()}
          </span>{" "}
          {t("editor.status.words")}
        </span>
        <span aria-hidden style={{ opacity: 0.45 }}>
          ·
        </span>
        <span>
          <span data-testid="editor-status-chars">
            {charCount.toLocaleString()}
          </span>{" "}
          {t("editor.status.chars")}
        </span>
      </div>
    </footer>
  );
}
