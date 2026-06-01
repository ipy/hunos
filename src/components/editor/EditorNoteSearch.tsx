import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { useUIStore } from "@/store/uiStore";
import { useNoteStore } from "@/store/noteStore";
import { useSettingsStore } from "@/store/settingsStore";
import { filterNotesForPlaygroundList } from "@/storage/formatPlaygroundNote";
import { filterNotesForProjectDocsList } from "@/storage/welcomeNotes";
import type { Note } from "@/types/note";

export const EDITOR_NOTE_SEARCH_TESTID = "editor-note-search";
export const EDITOR_NOTE_SEARCH_INPUT_TESTID = "editor-note-search-input";

export function editorNoteSearchResultTestId(noteId: string): string {
  return `editor-note-search-result-${noteId}`;
}

interface EditorNoteSearchProps {
  onClose: () => void;
}

export function EditorNoteSearch({ onClose }: EditorNoteSearchProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const {
    searchQuery,
    searchResults,
    isSearching,
    setSearchQuery,
    performSearch,
    clearSearch,
  } = useUIStore();
  const { setActiveNote } = useNoteStore();
  const { locale } = useSettingsStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const resultNotes = localQuery.trim()
    ? filterNotesForProjectDocsList(
        filterNotesForPlaygroundList(searchResults, locale),
        locale,
      )
    : [];

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localQuery);
      void performSearch(localQuery);
    }, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localQuery, performSearch, setSearchQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleClose]);

  const handleSelectNote = (note: Note) => {
    void setActiveNote(note.id);
    handleClose();
  };

  return (
    <div
      data-testid={EDITOR_NOTE_SEARCH_TESTID}
      style={{
        display: "flex",
        flexDirection: "column",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
        }}
      >
        <Icon name="search" size={16} color={theme.colors.textTertiary} />
        <input
          ref={inputRef}
          data-testid={EDITOR_NOTE_SEARCH_INPUT_TESTID}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              handleClose();
            }
          }}
          placeholder={t("notes.search.placeholder")}
          aria-label={t("notes.search.placeholder")}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: theme.colors.text,
          }}
        />
        {localQuery && (
          <button
            type="button"
            data-testid="editor-note-search-clear"
            onClick={() => {
              setLocalQuery("");
              clearSearch();
            }}
            aria-label={t("editor.find.close")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              padding: 2,
            }}
          >
            <Icon name="close" size={14} color={theme.colors.textSecondary} />
          </button>
        )}
        <button
          type="button"
          data-testid="editor-note-search-close"
          onClick={handleClose}
          aria-label={t("editor.find.close")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            padding: 2,
          }}
        >
          <Icon name="close" size={16} color={theme.colors.textSecondary} />
        </button>
      </div>

      {localQuery.trim().length > 0 && (
        <div
          data-testid="editor-note-search-results"
          style={{
            maxHeight: 280,
            overflowY: "auto",
            borderTop: `1px solid ${theme.colors.borderLight}`,
          }}
        >
          {isSearching ? (
            <div
              style={{
                padding: "12px 16px",
                fontSize: 13,
                color: theme.colors.textTertiary,
              }}
            >
              …
            </div>
          ) : resultNotes.length === 0 ? (
            <div
              data-testid="editor-note-search-no-results"
              style={{
                padding: "12px 16px",
                fontSize: 13,
                color: theme.colors.textTertiary,
              }}
            >
              {t("notes.search.noResults")}
            </div>
          ) : (
            resultNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                data-testid={editorNoteSearchResultTestId(note.id)}
                data-note-title={note.title}
                onClick={() => handleSelectNote(note)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 16px",
                  backgroundColor: "transparent",
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.colors.text,
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {note.title || "Untitled"}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
