import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Editor } from "@tiptap/react";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { getFindInNoteState, findInNotePluginKey } from "./FindInNoteExtension";

interface EditorFindBarProps {
  editor: Editor;
  onClose: () => void;
}

export function EditorFindBar({ editor, onClose }: EditorFindBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [matchCount, setMatchCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const syncFromEditor = useCallback(() => {
    const state = getFindInNoteState(editor.state);
    setMatchCount(state?.matches.length ?? 0);
    setActiveIndex(state?.activeIndex ?? -1);
  }, [editor]);

  const handleClose = useCallback(() => {
    const savedSelection = getFindInNoteState(editor.state)?.savedSelection;
    editor.commands.closeFindInNote();
    if (savedSelection) {
      editor.commands.setTextSelection(savedSelection);
      editor.commands.focus();
    }
    onClose();
  }, [editor, onClose]);

  useEffect(() => {
    editor.commands.openFindInNote();
    syncFromEditor();
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [editor, syncFromEditor]);

  useEffect(() => {
    editor.on("transaction", syncFromEditor);
    return () => {
      editor.off("transaction", syncFromEditor);
    };
  }, [editor, syncFromEditor]);

  useEffect(() => {
    const handleClosed = () => {
      const state = getFindInNoteState(editor.state);
      if (!state?.open) onClose();
    };
    editor.on("transaction", handleClosed);
    return () => {
      editor.off("transaction", handleClosed);
    };
  }, [editor, onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      editor.commands.setFindInNoteQuery(query);
    }, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          editor.commands.findInNotePrevious();
        } else {
          editor.commands.findInNoteNext();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor, handleClose]);

  useEffect(() => {
    return () => {
      const pluginState = findInNotePluginKey.getState(editor.state);
      if (pluginState?.open) {
        editor.commands.closeFindInNote();
      }
    };
  }, [editor]);

  const displayIndex = matchCount > 0 ? activeIndex + 1 : 0;
  const countLabel =
    matchCount > 0
      ? t("editor.find.matchCount", {
          current: displayIndex,
          total: matchCount,
        })
      : query.trim()
        ? t("editor.find.noResults")
        : "";

  return (
    <div
      data-testid="editor-find-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        backgroundColor: theme.isDark
          ? "rgba(50,50,52,0.95)"
          : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
        zIndex: 40,
        position: "relative",
      }}
    >
      <Icon name="search" size={16} color={theme.colors.textTertiary} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor.commands.findInNoteNext();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            handleClose();
          }
        }}
        placeholder={t("editor.find.placeholder")}
        aria-label={t("editor.find.placeholder")}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 14,
          color: theme.colors.text,
          minWidth: 0,
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: theme.colors.textTertiary,
          minWidth: 56,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {countLabel}
      </span>
      <button
        type="button"
        onClick={() => editor.commands.findInNotePrevious()}
        aria-label={t("editor.find.previous")}
        title={t("editor.find.previous")}
        style={navButtonStyle(theme)}
      >
        <Icon
          name="chevronDown"
          size={16}
          color={theme.colors.textSecondary}
          className="find-nav-up"
        />
      </button>
      <button
        type="button"
        onClick={() => editor.commands.findInNoteNext()}
        aria-label={t("editor.find.next")}
        title={t("editor.find.next")}
        style={navButtonStyle(theme)}
      >
        <Icon name="chevronDown" size={16} color={theme.colors.textSecondary} />
      </button>
      <button
        type="button"
        onClick={handleClose}
        aria-label={t("editor.find.close")}
        title={t("editor.find.close")}
        style={navButtonStyle(theme)}
      >
        <Icon name="close" size={16} color={theme.colors.textSecondary} />
      </button>
      <style>{`
        .find-nav-up {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}

function navButtonStyle(
  theme: ReturnType<typeof useTheme>,
): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: theme.radius.full,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 32,
  };
}
