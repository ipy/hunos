import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import {
  isEditorSuggestionMenuOpen,
  isLinkEditorOpen,
} from "@/utils/editorSuggestionMenu";
import { isEditorFormatOverlayPanelOpen } from "@/utils/editorOverlaySelection";
import { reparentBubbleMenuElement } from "./bubbleMenuHostUtils";
import {
  isTableControlContext,
  TABLE_CONTROL_ITEMS,
} from "./tableControlActions";

const TABLE_BUBBLE_MENU_KEY = "tableBubbleMenu";

function shouldShowTableBubbleMenu({
  editor,
  element,
  view,
}: {
  editor: Editor;
  element: HTMLElement;
  view: EditorView;
  state: EditorState;
}): boolean {
  const isChildOfMenu = element.contains(document.activeElement);
  const hasEditorFocus = view.hasFocus() || isChildOfMenu;

  if (!hasEditorFocus || !editor.isEditable) return false;
  if (!isTableControlContext(editor)) return false;
  if (isEditorSuggestionMenuOpen()) return false;
  if (isLinkEditorOpen()) return false;
  if (isEditorFormatOverlayPanelOpen()) return false;

  return true;
}

interface TableBubbleMenuProps {
  editor: Editor | null;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const touchHandledRef = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = menuRef.current;
    const host = hostRef.current;
    if (!editor || !element || editor.isDestroyed) return;

    const plugin = BubbleMenuPlugin({
      pluginKey: TABLE_BUBBLE_MENU_KEY,
      editor,
      element,
      updateDelay: 100,
      shouldShow: shouldShowTableBubbleMenu,
      tippyOptions: {
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
      },
    });

    editor.registerPlugin(plugin);
    return () => {
      if (!editor.isDestroyed) {
        editor.unregisterPlugin(TABLE_BUBBLE_MENU_KEY);
      }
      reparentBubbleMenuElement(host, element);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setTick((n) => n + 1));
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
    (action: (e: Editor) => boolean) => {
      if (!editor) return;
      action(editor);
      setTick((n) => n + 1);
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div ref={hostRef} aria-hidden="true">
      <div ref={menuRef} style={{ visibility: "hidden" }}>
        <div
          role="toolbar"
          aria-label={t("editor.table.menuLabel", {
            defaultValue: "Table controls",
          })}
          data-testid="table-bubble-menu"
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
          {TABLE_CONTROL_ITEMS.map((item) => {
            const enabled = item.canExecute(editor);
            const ariaLabel = t(item.labelKey);
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`table-bubble-${item.id}`}
                aria-label={ariaLabel}
                title={ariaLabel}
                disabled={!enabled}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!enabled) return;
                  if (touchHandledRef.current) {
                    touchHandledRef.current = false;
                    return;
                  }
                  handleAction(item.action);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  if (!enabled) return;
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
                  cursor: enabled ? "pointer" : "default",
                  backgroundColor: "transparent",
                  opacity: enabled ? 1 : 0.35,
                  touchAction: "manipulation",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (enabled) {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.surfaceHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
