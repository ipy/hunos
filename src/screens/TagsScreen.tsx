import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useTagStore } from "@/store/tagStore";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { Icon } from "@/components/common/Icon";
import type { TagTreeNode } from "@/types/graph";
import type { LayoutMode } from "@/hooks/useAdaptiveLayout";

interface TagsScreenProps {
  layout?: LayoutMode;
}

function TagItem({
  node,
  depth = 0,
  onNavigate,
}: {
  node: TagTreeNode;
  depth?: number;
  onNavigate?: () => void;
}) {
  const theme = useTheme();
  const { activeTagId, setActiveTag, toggleExpand } = useTagStore();
  const { loadNotesByTag } = useNoteStore();
  const { navigate } = useUIStore();
  const isActive = activeTagId === node.id;
  const hasChildren = node.children.length > 0;

  const handleClick = () => {
    setActiveTag(node.id);
    loadNotesByTag(node.id);
    navigate("noteList");
    onNavigate?.();
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          paddingLeft: 12 + depth * 18,
          cursor: "pointer",
          backgroundColor: isActive ? theme.colors.accentLight : "transparent",
          borderRadius: theme.radius.md,
          margin: "1px 6px",
          transition: "background-color 0.2s ease, transform 0.1s ease",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {hasChildren && (
          <button
            type="button"
            aria-expanded={node.isExpanded}
            aria-label={node.displayName}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: 24,
              height: 24,
              margin: -4,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              transform: node.isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            }}
          >
            <Icon
              name="chevronDown"
              size={12}
              color={theme.colors.textTertiary}
            />
          </button>
        )}
        {!hasChildren && <span style={{ width: 16 }} />}
        <Icon
          name="tag"
          size={15}
          color={isActive ? theme.colors.accent : theme.colors.textTertiary}
        />
        <span
          style={{
            flex: 1,
            fontSize: 14,
            color: isActive ? theme.colors.accent : theme.colors.text,
            fontWeight: isActive
              ? theme.fontWeight.medium
              : theme.fontWeight.regular,
            letterSpacing: -0.1,
          }}
        >
          {node.displayName}
        </span>
        {node.noteCount > 1 && (
          <span
            style={{
              fontSize: 11,
              color: theme.colors.textTertiary,
              minWidth: 18,
              textAlign: "right",
              fontWeight: theme.fontWeight.medium,
              opacity: 0.7,
            }}
          >
            {node.noteCount}
          </span>
        )}
      </div>
      {hasChildren &&
        node.isExpanded &&
        node.children.map((child) => (
          <TagItem
            key={child.id}
            node={child}
            depth={depth + 1}
            onNavigate={onNavigate}
          />
        ))}
    </>
  );
}

export function TagsScreen({ layout = "mobile" }: TagsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { tagTree, loadTags, setActiveTag } = useTagStore();
  const { loadNotes } = useNoteStore();
  const { navigate, hideSidebar } = useUIStore();

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleAllNotes = () => {
    setActiveTag(null);
    loadNotes({ status: "active" });
    navigate("noteList");
    hideSidebar();
  };

  const handleArchive = () => {
    setActiveTag(null);
    loadNotes({ status: "archived" });
    navigate("noteList");
    hideSidebar();
  };

  const handleTrash = () => {
    setActiveTag(null);
    loadNotes({ status: "trashed" });
    navigate("noteList");
    hideSidebar();
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "transparent",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 16px 12px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
            letterSpacing: -0.5,
          }}
        >
          Hunos
        </h1>
        <button
          onClick={() => {
            navigate("settings");
            hideSidebar();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            borderRadius: theme.radius.full,
            display: "flex",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = theme.colors.surfaceHover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <Icon name="settings" size={18} color={theme.colors.textTertiary} />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        <div
          onClick={handleAllNotes}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "9px 12px",
            margin: "1px 6px",
            borderRadius: theme.radius.md,
            cursor: "pointer",
            gap: 10,
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = theme.colors.surfaceHover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <Icon name="note" size={16} color={theme.colors.textTertiary} />
          <span
            style={{
              flex: 1,
              fontSize: 14,
              color: theme.colors.text,
              fontWeight: theme.fontWeight.medium,
            }}
          >
            {t("tags.sections.allNotes")}
          </span>
        </div>

        {tagTree.length > 0 && (
          <div
            style={{
              margin: "6px 14px",
              borderTop: `1px solid ${theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
              paddingTop: 6,
            }}
          >
            <div
              style={{
                padding: "8px 6px 4px",
                fontSize: 11,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {t("tags.sections.tags")}
            </div>
            {tagTree.map((node) => (
              <TagItem key={node.id} node={node} onNavigate={hideSidebar} />
            ))}
          </div>
        )}

        <div
          style={{
            margin: "6px 14px",
            borderTop: `1px solid ${theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
            paddingTop: 6,
          }}
        >
          <div
            onClick={handleArchive}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              margin: "1px 0",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              gap: 10,
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                theme.colors.surfaceHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Icon name="archive" size={15} color={theme.colors.textTertiary} />
            <span style={{ fontSize: 14, color: theme.colors.textSecondary }}>
              {t("tags.sections.archive")}
            </span>
          </div>
          <div
            onClick={handleTrash}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              margin: "1px 0",
              borderRadius: theme.radius.md,
              cursor: "pointer",
              gap: 10,
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                theme.colors.surfaceHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Icon name="trash" size={15} color={theme.colors.textTertiary} />
            <span style={{ fontSize: 14, color: theme.colors.textSecondary }}>
              {t("tags.sections.trash")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
