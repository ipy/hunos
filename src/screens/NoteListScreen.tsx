import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useNoteStore } from "@/store/noteStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { useTagStore } from "@/store/tagStore";
import { filterNotesForPlaygroundList } from "@/storage/formatPlaygroundNote";
import { deriveNoteListPreview } from "@/utils/noteListPreview";
import { Icon } from "@/components/common/Icon";
import { FAB } from "@/components/common/FAB";
import type { LayoutMode } from "@/hooks/useAdaptiveLayout";
import type { Note } from "@/types/note";

export const NOTE_LIST_TAG_FILTER_TESTID = "note-list-tag-filter";
export const NOTE_LIST_ITEM_TITLE_TESTID = "note-list-item-title";
export const NOTE_LIST_ITEM_PREVIEW_TESTID = "note-list-item-preview";

interface NoteListScreenProps {
  layout?: LayoutMode;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface SwipeAction {
  icon: string;
  label: string;
  color: string;
  action: () => void;
}

function SwipeableNoteCard({
  note,
  isActive,
  onSelect,
  actions,
  index = 0,
  previewText,
  emptyPreviewLabel,
}: {
  note: {
    id: string;
    title: string;
    contentPlain: string;
    modifiedAt: number;
    isPinned: boolean;
  };
  isActive: boolean;
  onSelect: () => void;
  actions: SwipeAction[];
  index?: number;
  previewText: string;
  emptyPreviewLabel: string;
}) {
  const theme = useTheme();
  const snippet = previewText;
  const [offsetX, setOffsetX] = useState(0);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const swipingRef = useRef(false);

  const ACTION_WIDTH = 64;
  const TOTAL_WIDTH = actions.length * ACTION_WIDTH;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    swipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      if (!swipingRef.current && Math.abs(dy) > Math.abs(dx)) {
        touchStartRef.current = null;
        return;
      }
      if (Math.abs(dx) > 8) swipingRef.current = true;

      if (swipingRef.current) {
        e.preventDefault();
        const base = isSwipeOpen ? -TOTAL_WIDTH : 0;
        const newOffset = Math.min(0, Math.max(-TOTAL_WIDTH - 20, base + dx));
        setOffsetX(newOffset);
      }
    },
    [isSwipeOpen, TOTAL_WIDTH],
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipingRef.current) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = null;
    const threshold = -TOTAL_WIDTH / 2;
    if (offsetX < threshold) {
      setOffsetX(-TOTAL_WIDTH);
      setIsSwipeOpen(true);
    } else {
      setOffsetX(0);
      setIsSwipeOpen(false);
    }
  }, [offsetX, TOTAL_WIDTH]);

  const handleClick = () => {
    if (swipingRef.current) return;
    if (isSwipeOpen) {
      setOffsetX(0);
      setIsSwipeOpen(false);
      return;
    }
    onSelect();
  };

  const staggerDelay = Math.min(index * 30, 300);

  return (
    <div
      data-testid="note-list-item"
      data-note-id={note.id}
      style={{
        position: "relative",
        overflow: "hidden",
        margin: "1px 8px",
        borderRadius: 10,
        animation: `noteCardMount 0.3s ease ${staggerDelay}ms both`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {actions.map((act, i) => (
          <button
            key={i}
            onClick={() => {
              act.action();
              setOffsetX(0);
              setIsSwipeOpen(false);
            }}
            style={{
              width: ACTION_WIDTH,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              cursor: "pointer",
              backgroundColor: act.color,
              color: "#fff",
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            <Icon name={act.icon} size={16} color="#fff" />
            <span>{act.label}</span>
          </button>
        ))}
      </div>
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          padding: "13px 16px 12px",
          cursor: "pointer",
          backgroundColor: isActive
            ? theme.colors.accentLight
            : theme.colors.background,
          transition: swipingRef.current
            ? "none"
            : "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.2s ease",
          transform: `translateX(${offsetX}px)`,
          position: "relative",
          zIndex: 1,
          borderRadius: 10,
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isSwipeOpen)
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
        }}
        onMouseLeave={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor = theme.colors.background;
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          {note.isPinned && (
            <Icon name="pin" size={11} color={theme.colors.accent} />
          )}
          <span
            data-testid={NOTE_LIST_ITEM_TITLE_TESTID}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: theme.colors.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              letterSpacing: -0.2,
            }}
          >
            {note.title || "Untitled"}
          </span>
        </div>
        <div
          data-testid={NOTE_LIST_ITEM_PREVIEW_TESTID}
          style={{
            fontSize: 13,
            color: theme.colors.textSecondary,
            overflow: "hidden",
            marginBottom: 5,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {snippet || emptyPreviewLabel}
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.colors.textTertiary,
            fontWeight: theme.fontWeight.medium,
          }}
        >
          {formatRelativeTime(note.modifiedAt)}
        </div>
      </div>
    </div>
  );
}

export function NoteListScreen({ layout = "mobile" }: NoteListScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    notes,
    activeNoteId,
    setActiveNote,
    createNote,
    pinNote,
    trashNote,
    restoreNote,
    permanentlyDelete,
    isLoading,
  } = useNoteStore();
  const {
    currentScreen,
    navigate,
    goBack,
    showSidebar,
    performSearch,
    searchQuery,
    searchResults,
    setSearchQuery,
    clearSearch,
    noteSearchOpen,
    clearNoteSearchOpen,
    requestFocusNewNoteTitle,
  } = useUIStore();
  const { activeTagId, tags } = useTagStore();
  const { locale } = useSettingsStore();
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!noteSearchOpen) return;
    setShowSearch(true);
    clearNoteSearchOpen();
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [noteSearchOpen, clearNoteSearchOpen]);

  const activeTag = tags.find((t) => t.id === activeTagId);
  const title = activeTag
    ? `#${activeTag.displayName}`
    : t("tags.sections.allNotes");
  const displayedNotes = filterNotesForPlaygroundList(
    searchQuery ? searchResults : notes,
    locale,
  );

  const pinnedNotes = displayedNotes.filter((n) => n.isPinned);
  const unpinnedNotes = displayedNotes.filter((n) => !n.isPinned);
  const playgroundListPreview = t("notes.list.playgroundPreview");
  const emptyPreviewLabel = t("notes.list.emptyPreview");

  const previewForNote = (note: Note) =>
    deriveNoteListPreview(note, playgroundListPreview, locale);

  const showMenuButton = layout === "mobile" || layout === "tablet";

  const handleCreate = async () => {
    const note = await createNote();
    setActiveNote(note.id);
    if (layout === "mobile") {
      navigate("editor");
      requestFocusNewNoteTitle();
    } else if (currentScreen === "settings") navigate("editor");
  };

  const handleSelectNote = (id: string) => {
    setActiveNote(id);
    if (layout === "mobile") navigate("editor");
    else if (currentScreen === "settings") navigate("editor");
  };

  const getSwipeActions = (note: Note): SwipeAction[] => {
    if (note.status === "trashed") {
      return [
        {
          icon: "archive",
          label: t("notes.actions.restore"),
          color: "#4CAF50",
          action: () => restoreNote(note.id),
        },
        {
          icon: "trash",
          label: t("common.actions.delete"),
          color: "#F44336",
          action: () => permanentlyDelete(note.id),
        },
      ];
    }
    return [
      {
        icon: "pin",
        label: note.isPinned
          ? t("notes.actions.unpin")
          : t("notes.actions.pin"),
        color: "#FF9800",
        action: () => pinNote(note.id, !note.isPinned),
      },
      {
        icon: "trash",
        label: t("notes.actions.trash"),
        color: "#F44336",
        action: () => trashNote(note.id),
      },
    ];
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 14px 10px",
          gap: 6,
        }}
      >
        {showMenuButton && (
          <button
            onClick={showSidebar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: theme.radius.full,
              display: "flex",
            }}
          >
            <Icon name="menu" size={20} color={theme.colors.accent} />
          </button>
        )}
        <h2
          {...(activeTag
            ? {
                "data-testid": NOTE_LIST_TAG_FILTER_TESTID,
                "data-tag-name": activeTag.displayName,
              }
            : {})}
          style={{
            margin: 0,
            flex: 1,
            fontSize: 20,
            fontWeight: 700,
            color: theme.colors.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: -0.4,
          }}
        >
          {title}
        </h2>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: theme.radius.full,
            display: "flex",
            backgroundColor: showSearch
              ? theme.colors.surfaceHover
              : "transparent",
          }}
        >
          <Icon
            name="search"
            size={18}
            color={
              showSearch ? theme.colors.accent : theme.colors.textSecondary
            }
          />
        </button>
      </header>

      <div
        style={{
          overflow: "hidden",
          maxHeight: showSearch ? 56 : 0,
          opacity: showSearch ? 1 : 0,
          transition:
            "max-height 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease",
          padding: showSearch ? "0 12px 10px" : "0 12px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <Icon name="search" size={15} color={theme.colors.textTertiary} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              performSearch(e.target.value);
            }}
            placeholder={t("notes.search.placeholder")}
            autoFocus={showSearch}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              fontSize: 14,
              color: theme.colors.text,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                clearSearch();
                setShowSearch(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                padding: 2,
                backgroundColor: theme.colors.surfaceActive,
                borderRadius: theme.radius.full,
              }}
            >
              <Icon name="close" size={12} color={theme.colors.textSecondary} />
            </button>
          )}
        </div>
      </div>

      <div data-testid="note-list" style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "40%",
              padding: 32,
              color: theme.colors.textTertiary,
              fontSize: 13,
            }}
          >
            {t("notes.loading", { defaultValue: "Loading notes…" })}
          </div>
        ) : displayedNotes.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "50%",
              padding: 32,
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: theme.colors.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Icon name="note" size={28} color={theme.colors.textTertiary} />
            </div>
            <p
              style={{
                marginTop: 0,
                marginBottom: 4,
                fontSize: 15,
                fontWeight: 600,
                color: theme.colors.textSecondary,
                textAlign: "center",
              }}
            >
              {searchQuery ? t("notes.search.noResults") : t("notes.empty")}
            </p>
            {!searchQuery && (
              <p
                style={{
                  fontSize: 13,
                  color: theme.colors.textTertiary,
                  margin: 0,
                }}
              >
                {t("notes.emptyAction")}
              </p>
            )}
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <div
                style={{
                  padding: "6px 16px 2px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Pinned
              </div>
            )}
            {pinnedNotes.map((note, i) => (
              <SwipeableNoteCard
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onSelect={() => handleSelectNote(note.id)}
                actions={getSwipeActions(note)}
                index={i}
                previewText={previewForNote(note)}
                emptyPreviewLabel={emptyPreviewLabel}
              />
            ))}
            {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
              <div
                style={{
                  margin: "6px 16px",
                  borderTop: `1px solid ${theme.colors.borderLight}`,
                }}
              />
            )}
            {unpinnedNotes.map((note, i) => (
              <SwipeableNoteCard
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onSelect={() => handleSelectNote(note.id)}
                actions={getSwipeActions(note)}
                index={pinnedNotes.length + i}
                previewText={previewForNote(note)}
                emptyPreviewLabel={emptyPreviewLabel}
              />
            ))}
          </>
        )}
      </div>

      <FAB onPress={handleCreate} />
    </div>
  );
}
