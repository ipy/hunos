import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useAdaptiveLayout, type LayoutMode } from "@/hooks/useAdaptiveLayout";
import { Icon } from "@/components/common/Icon";
import { SketchPad } from "./SketchPad";
import {
  INLINE_FORMAT_ITEMS,
  type InlineFormatItem,
} from "./inlineFormatActions";
import type { Editor } from "@tiptap/react";
import { insertImageFromToolbarPicker } from "./imageInsertUtils";
import { applyBulletListToolbarCommand } from "./listToolbarUtils";
import {
  isToolbarFormatOverlayOpen,
  runToolbarActionWithOverlaySelection,
  runToolbarChain,
} from "@/utils/editorOverlaySelection";
import { getToolbarItemLabel } from "./toolbarItemLabels";
import {
  resolveDesktopToolbarItems,
  resolveMobileToolbarItems,
} from "./editorToolbarItems";

interface EditorToolbarProps {
  editor: Editor | null;
  formatOverlayOpen?: boolean;
  /** When set, keeps toolbar tabs aligned with EditorScreen chrome (desktop Aa/¶ strips). */
  layoutMode?: LayoutMode;
}

type ToolbarButton = InlineFormatItem;

const BLOCK_ITEMS: ToolbarButton[] = [
  {
    icon: "heading1",
    label: "H1",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleHeading({ level: 1 }),
      ),
    isActive: (e) => e.isActive("heading", { level: 1 }),
  },
  {
    icon: "heading2",
    label: "H2",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleHeading({ level: 2 }),
      ),
    isActive: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    icon: "heading3",
    label: "H3",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleHeading({ level: 3 }),
      ),
    isActive: (e) => e.isActive("heading", { level: 3 }),
  },
  {
    icon: "list",
    label: "•",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        applyBulletListToolbarCommand(e, chain),
      ),
    isActive: (e) => e.isActive("bulletList"),
  },
  {
    icon: "orderedList",
    label: "1.",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleOrderedList(),
      ),
    isActive: (e) => e.isActive("orderedList"),
  },
  {
    icon: "taskList",
    label: "☑",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleTaskList(),
      ),
    isActive: (e) => e.isActive("taskList"),
  },
  {
    icon: "quote",
    label: "❝",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleBlockquote(),
      ),
    isActive: (e) => e.isActive("blockquote"),
  },
  {
    icon: "code",
    label: "</>",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.toggleCodeBlock(),
      ),
    isActive: (e) => e.isActive("codeBlock"),
  },
  {
    icon: "divider",
    label: "—",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.setHorizontalRule(),
      ),
  },
];

const INSERT_ITEMS_BASE: ToolbarButton[] = [
  {
    icon: "image",
    label: "🖼",
    action: (e) => {
      void insertImageFromToolbarPicker(e);
    },
  },
  {
    icon: "camera",
    label: "📷",
    action: (e) => {
      void insertImageFromToolbarPicker(e, { capture: "environment" });
    },
  },
  {
    icon: "table",
    label: "⊞",
    action: (e) =>
      runToolbarChain(e, isToolbarFormatOverlayOpen(), (chain) =>
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
      ),
  },
];

interface SketchState {
  editing: boolean;
  initialImage?: string;
  nodePos?: number;
}

export function EditorToolbar({
  editor,
  formatOverlayOpen = false,
  layoutMode,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const adaptiveLayout = useAdaptiveLayout();
  const layout = layoutMode ?? adaptiveLayout;
  const [activeTab, setActiveTab] = useState<"format" | "blocks" | "insert">(
    "format",
  );
  const [sketchState, setSketchState] = useState<SketchState | null>(null);
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
    return () => {
      editor.off("transaction", onUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor]);

  const handleAction = useCallback(
    (action: (e: Editor) => void) => {
      if (!editor) return;
      runToolbarActionWithOverlaySelection(editor, formatOverlayOpen, action);
      setTick((t) => t + 1);
    },
    [editor, formatOverlayOpen],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src && detail?.pos !== undefined) {
        setSketchState({
          editing: true,
          initialImage: detail.src,
          nodePos: detail.pos,
        });
      }
    };
    window.addEventListener("hunos-edit-sketch", handler);
    return () => window.removeEventListener("hunos-edit-sketch", handler);
  }, []);

  if (!editor) return null;

  const INSERT_ITEMS: ToolbarButton[] = [
    ...INSERT_ITEMS_BASE,
    {
      icon: "pencil",
      label: "✏",
      action: () => {
        setSketchState({ editing: false });
      },
    },
  ];

  const handleSketchSave = (dataUrl: string) => {
    if (!editor) {
      setSketchState(null);
      return;
    }
    if (sketchState?.editing && sketchState.nodePos !== undefined) {
      const { tr } = editor.state;
      const node = editor.state.doc.nodeAt(sketchState.nodePos);
      if (node) {
        tr.setNodeMarkup(sketchState.nodePos, undefined, {
          ...node.attrs,
          src: dataUrl,
          "data-sketch": "true",
        });
        editor.view.dispatch(tr);
      }
    } else {
      const { state } = editor;
      const { selection } = state;
      const selectedNode = state.doc.nodeAt(selection.from);
      if (selectedNode && selectedNode.type.name === "image") {
        const insertPos = selection.from + selectedNode.nodeSize;
        const { tr } = state;
        const imgNode = state.schema.nodes.image.create({
          src: dataUrl,
          "data-sketch": "true",
        });
        tr.insert(insertPos, imgNode);
        editor.view.dispatch(tr);
      } else {
        editor.chain().focus().setImage({ src: dataUrl }).run();
        requestAnimationFrame(() => {
          const { state: s } = editor;
          const { $from } = s.selection;
          const pos = $from.pos - 1;
          const node = s.doc.nodeAt(pos);
          if (node && node.type.name === "image") {
            const { tr } = s;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              "data-sketch": "true",
            });
            editor.view.dispatch(tr);
          }
        });
      }
    }
    setSketchState(null);
  };

  const isMobile = layout === "mobile";
  const isDesktop = layout === "desktop";
  const useTabbedToolbar = isMobile || isDesktop;
  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();
  const toolbarItemGroups = {
    format: INLINE_FORMAT_ITEMS,
    blocks: BLOCK_ITEMS,
    insert: INSERT_ITEMS,
  };
  const desktopTab: "format" | "blocks" =
    activeTab === "format" ? "format" : "blocks";
  const items = isMobile
    ? resolveMobileToolbarItems(activeTab, toolbarItemGroups)
    : isDesktop
      ? resolveDesktopToolbarItems(desktopTab, toolbarItemGroups)
      : [...INLINE_FORMAT_ITEMS, ...BLOCK_ITEMS, ...INSERT_ITEMS];

  return (
    <>
      {sketchState && (
        <SketchPad
          onSave={handleSketchSave}
          onCancel={() => setSketchState(null)}
          initialImage={sketchState.initialImage}
        />
      )}
      <div
        data-testid="editor-toolbar"
        style={{
          borderTop: `1px solid ${theme.colors.borderLight}`,
          flexShrink: 0,
          backgroundColor: theme.isDark
            ? "rgba(28,28,30,0.95)"
            : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {useTabbedToolbar && (
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              padding: "0 8px",
            }}
          >
            <button
              type="button"
              data-testid="editor-toolbar-tab-format"
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveTab("format");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                cursor: "pointer",
                background: "none",
                fontSize: 12,
                fontWeight: "600",
                color:
                  activeTab === "format"
                    ? theme.colors.accent
                    : theme.colors.textTertiary,
                borderBottom:
                  activeTab === "format"
                    ? `2px solid ${theme.colors.accent}`
                    : "2px solid transparent",
                touchAction: "manipulation",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              Aa
            </button>
            <button
              type="button"
              data-testid="editor-toolbar-tab-blocks"
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveTab("blocks");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                cursor: "pointer",
                background: "none",
                fontSize: 12,
                fontWeight: "600",
                color:
                  activeTab === "blocks" || activeTab === "insert"
                    ? theme.colors.accent
                    : theme.colors.textTertiary,
                borderBottom:
                  activeTab === "blocks" || activeTab === "insert"
                    ? `2px solid ${theme.colors.accent}`
                    : "2px solid transparent",
                touchAction: "manipulation",
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              ¶
            </button>
            {isMobile && (
              <>
                <button
                  type="button"
                  data-testid="editor-toolbar-tab-insert"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setActiveTab("insert");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    cursor: "pointer",
                    background: "none",
                    fontSize: 12,
                    fontWeight: "600",
                    color:
                      activeTab === "insert"
                        ? theme.colors.accent
                        : theme.colors.textTertiary,
                    borderBottom:
                      activeTab === "insert"
                        ? `2px solid ${theme.colors.accent}`
                        : "2px solid transparent",
                    touchAction: "manipulation",
                    transition: "color 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  +
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor.commands.blur()}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: "none",
                    fontSize: 12,
                    fontWeight: "500",
                    color: theme.colors.textTertiary,
                    touchAction: "manipulation",
                  }}
                >
                  ⌨↓
                </button>
              </>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            padding: "6px 8px",
            gap: 3,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {isMobile && (
            <>
              <button
                type="button"
                data-testid="editor-undo"
                disabled={!canUndo}
                aria-label={t("common.actions.undo")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (touchHandledRef.current) {
                    touchHandledRef.current = false;
                    return;
                  }
                  if (canUndo) {
                    editor.commands.undo();
                    setTick((t) => t + 1);
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  touchHandledRef.current = true;
                  if (canUndo) {
                    editor.commands.undo();
                    setTick((t) => t + 1);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: 8,
                  border: "none",
                  cursor: canUndo ? "pointer" : "default",
                  backgroundColor: "transparent",
                  opacity: canUndo ? 1 : 0.35,
                  touchAction: "manipulation",
                  transition:
                    "background-color 0.15s ease, transform 0.1s ease",
                }}
              >
                <Icon
                  name="undo"
                  size={17}
                  color={theme.colors.textSecondary}
                />
              </button>
              <button
                type="button"
                data-testid="editor-redo"
                disabled={!canRedo}
                aria-label={t("common.actions.redo")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (touchHandledRef.current) {
                    touchHandledRef.current = false;
                    return;
                  }
                  if (canRedo) {
                    editor.commands.redo();
                    setTick((t) => t + 1);
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  touchHandledRef.current = true;
                  if (canRedo) {
                    editor.commands.redo();
                    setTick((t) => t + 1);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: 8,
                  border: "none",
                  cursor: canRedo ? "pointer" : "default",
                  backgroundColor: "transparent",
                  opacity: canRedo ? 1 : 0.35,
                  touchAction: "manipulation",
                  transition:
                    "background-color 0.15s ease, transform 0.1s ease",
                }}
              >
                <Icon
                  name="redo"
                  size={17}
                  color={theme.colors.textSecondary}
                />
              </button>
            </>
          )}
          {items.map((item, idx) => {
            const active = item.isActive?.(editor) ?? false;
            const ariaLabel = getToolbarItemLabel(t, item.icon, item.label);
            return (
              <button
                key={`${item.icon}-${idx}`}
                type="button"
                data-testid={`editor-toolbar-btn-${item.icon}`}
                aria-label={ariaLabel}
                title={ariaLabel}
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
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: active
                    ? theme.colors.accentLight
                    : "transparent",
                  touchAction: "manipulation",
                  transition:
                    "background-color 0.15s ease, transform 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.backgroundColor =
                      theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    e.currentTarget.style.backgroundColor = active
                      ? theme.colors.accentLight
                      : "transparent";
                }}
              >
                <Icon
                  name={item.icon}
                  size={17}
                  color={
                    active ? theme.colors.accent : theme.colors.textSecondary
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
