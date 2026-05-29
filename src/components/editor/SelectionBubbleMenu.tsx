import React, { useEffect, useRef, useState, useCallback } from "react";
import { isTextSelection } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { INLINE_FORMAT_ITEMS } from "./inlineFormatActions";
import {
  isEditorSuggestionMenuOpen,
  isLinkEditorOpen,
} from "@/utils/editorSuggestionMenu";

function shouldShowSelectionBubbleMenu({
  editor,
  element,
  view,
  state,
  from,
  to,
}: {
  editor: Editor;
  element: HTMLElement;
  view: EditorView;
  state: EditorState;
  from: number;
  to: number;
}): boolean {
  const { doc, selection } = state;
  const { empty } = selection;

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && isTextSelection(state.selection);
  const isChildOfMenu = element.contains(document.activeElement);
  const hasEditorFocus = view.hasFocus() || isChildOfMenu;

  if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) {
    return false;
  }
  if (isEditorSuggestionMenuOpen()) return false;
  if (isLinkEditorOpen()) return false;
  if (editor.isActive("codeBlock")) return false;

  return true;
}

interface SelectionBubbleMenuProps {
  editor: Editor | null;
}

export function SelectionBubbleMenu({ editor }: SelectionBubbleMenuProps) {
  const theme = useTheme();
  const [, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const touchHandledRef = useRef(false);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    editor.on("transaction", onUpdate);
    editor.on("selectionUpdate", onUpdate);
    return () => {
      editor.off("transaction", onUpdate);
      editor.off("selectionUpdate", onUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor]);

  const handleAction = useCallback(
    (action: (e: Editor) => void) => {
      if (!editor) return;
      action(editor);
      setTick((t) => t + 1);
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="selectionBubbleMenu"
      updateDelay={100}
      shouldShow={shouldShowSelectionBubbleMenu}
      tippyOptions={{
        duration: 150,
        placement: "top",
        offset: [0, 10],
        zIndex: 200,
        popperOptions: {
          modifiers: [
            {
              name: "flip",
              options: { fallbackPlacements: ["bottom", "top"] },
            },
            {
              name: "preventOverflow",
              options: {
                boundary: "viewport",
                padding: 8,
                altAxis: true,
              },
            },
          ],
        },
      }}
    >
      <div
        role="toolbar"
        aria-label="Text formatting"
        style={{
          display: "flex",
          gap: 4,
          padding: "4px 6px",
          borderRadius: 10,
          border: `1px solid ${theme.colors.borderLight}`,
          backgroundColor: theme.isDark
            ? "rgba(28,28,30,0.95)"
            : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: theme.isDark
            ? "0 4px 20px rgba(0,0,0,0.45)"
            : "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        {INLINE_FORMAT_ITEMS.map((item) => {
          const active = item.isActive?.(editor) ?? false;
          return (
            <button
              key={item.icon}
              type="button"
              aria-label={item.label}
              aria-pressed={active}
              onMouseDown={(e) => {
                e.preventDefault();
                if (touchHandledRef.current) {
                  touchHandledRef.current = false;
                  return;
                }
                handleAction(item.action);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                touchHandledRef.current = true;
                handleAction(item.action);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                backgroundColor: active
                  ? theme.colors.accentLight
                  : "transparent",
                touchAction: "manipulation",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.backgroundColor =
                    theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = active
                  ? theme.colors.accentLight
                  : "transparent";
              }}
            >
              <Icon
                name={item.icon}
                size={18}
                color={
                  active ? theme.colors.accent : theme.colors.textSecondary
                }
              />
            </button>
          );
        })}
      </div>
    </BubbleMenu>
  );
}
