import React, { useEffect, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Icon } from "@/components/common/Icon";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorFindBar } from "@/components/editor/EditorFindBar";
import { BacklinksPanel } from "@/components/backlinks/BacklinksPanel";
import { InfoPanel } from "@/components/editor/InfoPanel";
import { exportAndDownload } from "@/utils/export";
import { resolveTextFontFamily } from "@/utils/fonts";
import type { Editor } from "@tiptap/react";
import type { LayoutMode } from "@/hooks/useAdaptiveLayout";
import { shouldSuppressFocusModeEscape } from "@/utils/editorSuggestionMenu";
import { editorHasNonEmptySelection } from "@/utils/editorSelection";
import {
  FORMAT_PLAYGROUND_TITLES,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
  migratePlaygroundContentIfStale,
} from "@/storage/formatPlaygroundNote";

interface EditorScreenProps {
  layout?: LayoutMode;
}

export function EditorScreen({ layout = "mobile" }: EditorScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    activeNoteId,
    notes,
    saveNoteContent,
    saveNoteTitle,
    pinNote,
    trashNote,
    archiveNote,
    restoreNote,
    permanentlyDelete,
    restoreFormatPlayground,
  } = useNoteStore();
  const {
    goBack,
    showToast,
    focusMode,
    toggleFocusMode,
    setFocusMode,
    findInNoteSignal,
    findInNoteReplaceMode,
    requestFindInNote,
  } = useUIStore();
  const settings = useSettingsStore();
  const [showActions, setShowActions] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastPlaygroundMigrateKeyRef = useRef<string | null>(null);

  const note = notes.find((n) => n.id === activeNoteId);
  const showBackButton = layout === "mobile";
  const isCompactChrome = focusMode && layout === "tablet";
  const prevFocusModeRef = useRef(focusMode);
  const suppressFocusToastRef = useRef(false);
  const [titleValue, setTitleValue] = useState("");
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = undefined;
    }
    setTitleValue(note?.title ?? "");
  }, [note?.id]);

  useEffect(() => {
    if (!note?.title) return;
    const titleInput = document.querySelector(
      '[data-field="note-title"]',
    ) as HTMLInputElement | null;
    if (document.activeElement === titleInput) return;
    setTitleValue(note.title);
  }, [note?.title]);

  const handleTitleChange = (newTitle: string) => {
    setTitleValue(newTitle);
    if (!activeNoteId) return;
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      saveNoteTitle(activeNoteId, newTitle);
    }, 400);
  };

  const handleContentChange = useCallback(
    (json: string, flushSave?: boolean) => {
      if (!activeNoteId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (flushSave) {
        void saveNoteContent(activeNoteId, json);
        return;
      }
      saveTimeoutRef.current = setTimeout(() => {
        void saveNoteContent(activeNoteId, json);
      }, 400);
    },
    [activeNoteId, saveNoteContent],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!note?.id || !isFormatPlaygroundNote(note.title, note.content)) return;

    const migrateKey = `${note.id}:${settings.locale}`;
    if (lastPlaygroundMigrateKeyRef.current === migrateKey) {
      return;
    }
    lastPlaygroundMigrateKeyRef.current = migrateKey;

    const migrated = migratePlaygroundContentIfStale(
      note.content,
      settings.locale,
    );
    const expectedTitle = getFormatPlaygroundTitle(settings.locale);
    const titleNeedsUpdate =
      FORMAT_PLAYGROUND_TITLES.includes(note.title) &&
      note.title !== expectedTitle;

    if (migrated) {
      void saveNoteContent(note.id, migrated);
    }
    if (titleNeedsUpdate) {
      void saveNoteTitle(note.id, expectedTitle);
    }
  }, [note, settings.locale, saveNoteContent, saveNoteTitle]);

  useEffect(() => {
    setFindOpen(false);
  }, [note?.id]);

  useEffect(() => {
    if (findInNoteSignal === 0) return;
    if (layout !== "desktop") return;
    setFindOpen(true);
  }, [findInNoteSignal, layout]);

  useEffect(() => {
    if (layout !== "mobile" || !focusMode) return;
    prevFocusModeRef.current = focusMode;
    suppressFocusToastRef.current = true;
    setFocusMode(false);
  }, [layout, focusMode, setFocusMode]);

  useEffect(() => {
    if (prevFocusModeRef.current === focusMode) return;
    prevFocusModeRef.current = focusMode;
    if (suppressFocusToastRef.current) {
      suppressFocusToastRef.current = false;
      return;
    }
    showToast(
      focusMode ? t("editor.focusMode.entered") : t("editor.focusMode.exited"),
    );
  }, [focusMode, showToast, t]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!focusMode) return;
      if (shouldSuppressFocusModeEscape()) return;
      if (editorHasNonEmptySelection(editorInstance)) return;
      e.preventDefault();
      setFocusMode(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [focusMode, setFocusMode, editorInstance]);

  const handlePin = () => {
    if (!note) return;
    pinNote(note.id, !note.isPinned);
    showToast(
      note.isPinned ? t("notes.actions.unpin") : t("notes.actions.pin"),
    );
    setShowActions(false);
  };

  const handleArchive = () => {
    if (!note) return;
    archiveNote(note.id);
    showToast(t("notes.actions.archive"));
    if (layout === "mobile") goBack();
  };

  const handleTrash = () => {
    if (!note) return;
    trashNote(note.id);
    showToast(t("notes.actions.trash"));
    if (layout === "mobile") goBack();
  };

  const handleRestorePlayground = async () => {
    if (!note) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    await restoreFormatPlayground(note.id, settings.locale);
    showToast(t("notes.actions.restorePlaygroundDone"));
    setShowActions(false);
  };

  if (!note) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: 32,
            animation: "fadeIn 0.4s ease",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: theme.colors.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="note" size={32} color={theme.colors.textTertiary} />
          </div>
          <p
            style={{
              color: theme.colors.textTertiary,
              fontSize: 15,
              marginTop: 0,
            }}
          >
            {t("notes.empty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          gap: 2,
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          flexShrink: 0,
          minHeight: 44,
        }}
      >
        {showBackButton && (
          <button
            onClick={goBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: theme.radius.full,
              display: "flex",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                theme.colors.surfaceHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Icon name="back" size={20} color={theme.colors.accent} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        {focusMode && isCompactChrome ? (
          <>
            <button
              onClick={() => setShowStats(!showStats)}
              title={t("editor.stats.title")}
              aria-label={t("editor.stats.title")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 7,
                borderRadius: theme.radius.full,
                display: "flex",
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: showStats
                  ? theme.colors.accentLight
                  : "transparent",
              }}
            >
              <Icon
                name="stats"
                size={17}
                color={
                  showStats ? theme.colors.accent : theme.colors.textTertiary
                }
              />
            </button>
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              aria-label={t("editor.focusMode.exit")}
              title={t("editor.focusMode.exit")}
              style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.borderLight}`,
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: theme.radius.full,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minHeight: 44,
                minWidth: 44,
                fontSize: 13,
                fontWeight: 500,
                color: theme.colors.textSecondary,
              }}
            >
              <Icon
                name="focusOff"
                size={16}
                color={theme.colors.textSecondary}
              />
              {t("editor.focusMode.exit")}
            </button>
          </>
        ) : (
          <>
            {layout !== "mobile" && (
              <button
                type="button"
                onClick={toggleFocusMode}
                aria-label={
                  focusMode
                    ? t("editor.focusMode.exit")
                    : t("editor.focusMode.enter")
                }
                aria-pressed={focusMode}
                title={
                  focusMode
                    ? t("editor.focusMode.exit")
                    : t("editor.focusMode.enter")
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 7,
                  borderRadius: theme.radius.full,
                  display: "flex",
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: focusMode
                    ? theme.colors.accentLight
                    : "transparent",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!focusMode)
                    e.currentTarget.style.backgroundColor =
                      theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (!focusMode)
                    e.currentTarget.style.backgroundColor = focusMode
                      ? theme.colors.accentLight
                      : "transparent";
                }}
              >
                <Icon
                  name={focusMode ? "focusOff" : "focus"}
                  size={17}
                  color={
                    focusMode ? theme.colors.accent : theme.colors.textTertiary
                  }
                />
              </button>
            )}
            {!isCompactChrome && (
              <>
                <button
                  onClick={() => setShowStats(!showStats)}
                  title={t("editor.stats.title")}
                  aria-label={t("editor.stats.title")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 7,
                    borderRadius: theme.radius.full,
                    display: "flex",
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: showStats
                      ? theme.colors.accentLight
                      : "transparent",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!showStats)
                      e.currentTarget.style.backgroundColor =
                        theme.colors.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!showStats)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Icon
                    name="stats"
                    size={17}
                    color={
                      showStats
                        ? theme.colors.accent
                        : theme.colors.textTertiary
                    }
                  />
                </button>
                <button
                  onClick={() => setShowActions(!showActions)}
                  aria-label={t("common.actions.more", {
                    defaultValue: "More actions",
                  })}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 7,
                    borderRadius: theme.radius.full,
                    display: "flex",
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      theme.colors.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Icon
                    name="more"
                    size={17}
                    color={theme.colors.textSecondary}
                  />
                </button>
              </>
            )}
          </>
        )}
      </header>

      {findOpen && editorInstance && layout === "desktop" && (
        <EditorFindBar
          key={findInNoteSignal}
          editor={editorInstance}
          showReplace={findInNoteReplaceMode}
          onClose={() => {
            setFindOpen(false);
            useUIStore.setState({ findInNoteReplaceMode: false });
          }}
        />
      )}

      {/* Action menu with backdrop */}
      {showActions && (
        <>
          <div
            onClick={() => setShowActions(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 49,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 50,
              right: 12,
              zIndex: 50,
              backgroundColor: theme.isDark
                ? "rgba(50,50,52,0.95)"
                : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: 14,
              boxShadow: theme.isDark
                ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)"
                : "0 8px 32px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)",
              padding: "5px 0",
              minWidth: 200,
              animation: "menuReveal 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
              transformOrigin: "top right",
            }}
          >
            {(note.status === "trashed"
              ? [
                  {
                    label: t("notes.actions.restore"),
                    icon: "archive",
                    danger: false,
                    action: () => {
                      restoreNote(note.id);
                      setShowActions(false);
                      if (layout === "mobile") goBack();
                    },
                  },
                  {
                    label: t("notes.actions.deletePermanently"),
                    icon: "trash",
                    danger: true,
                    action: () => {
                      permanentlyDelete(note.id);
                      setShowActions(false);
                      if (layout === "mobile") goBack();
                    },
                  },
                ]
              : [
                  {
                    label: note.isPinned
                      ? t("notes.actions.unpin")
                      : t("notes.actions.pin"),
                    icon: "pin",
                    danger: false,
                    action: handlePin,
                  },
                  {
                    label: t("notes.actions.archive"),
                    icon: "archive",
                    danger: false,
                    action: handleArchive,
                  },
                  ...(isFormatPlaygroundNote(note.title, note.content)
                    ? [
                        {
                          label: t("notes.actions.restorePlayground"),
                          icon: "note",
                          danger: false,
                          action: handleRestorePlayground,
                        },
                      ]
                    : []),
                  {
                    label: t("notes.actions.trash"),
                    icon: "trash",
                    danger: true,
                    action: handleTrash,
                  },
                  {
                    label: t("export.markdown"),
                    icon: "export",
                    danger: false,
                    action: () => {
                      exportAndDownload(note, "markdown");
                      setShowActions(false);
                    },
                  },
                  {
                    label: t("export.html"),
                    icon: "export",
                    danger: false,
                    action: () => {
                      exportAndDownload(note, "html");
                      setShowActions(false);
                    },
                  },
                ]
            ).map((item, idx, arr) => (
              <React.Fragment key={item.label}>
                <button
                  onClick={item.action}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    color: item.danger
                      ? theme.colors.danger
                      : theme.colors.text,
                    textAlign: "left",
                    transition: "background-color 0.12s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      theme.colors.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    color={
                      item.danger
                        ? theme.colors.danger
                        : theme.colors.textSecondary
                    }
                  />
                  {item.label}
                </button>
                {idx === 2 && arr.length > 3 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.borderLight,
                      margin: "4px 12px",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {showStats && (
        <InfoPanel
          note={note}
          editor={editorInstance}
          onClose={() => setShowStats(false)}
        />
      )}

      <div
        style={{ flex: 1, overflow: "auto", minHeight: 0 }}
        onClick={() => showActions && setShowActions(false)}
      >
        <div
          style={{
            padding: "16px 24px 0",
            maxWidth: `${settings.lineWidth}em`,
            margin: "0 auto",
          }}
        >
          <input
            data-field="note-title"
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (layout !== "desktop") return;
              if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
              if (e.key.toLowerCase() !== "f") return;
              e.preventDefault();
              if (e.shiftKey) {
                useUIStore.getState().openNoteSearch();
              } else {
                requestFindInNote();
              }
            }}
            placeholder={t("editor.titlePlaceholder")}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: settings.fontSize * 1.6,
              fontWeight: 700,
              fontFamily: resolveTextFontFamily(settings.headingsFont),
              color: theme.colors.text,
              backgroundColor: "transparent",
              padding: 0,
              lineHeight: 1.2,
            }}
          />
        </div>
        <TiptapEditor
          noteId={note.id}
          initialContent={note.content}
          onChange={handleContentChange}
          onEditorReady={setEditorInstance}
          fontFamily={settings.editorFont}
          headingsFont={settings.headingsFont}
          codeFont={settings.codeFont}
          fontSize={settings.fontSize}
          lineHeight={settings.lineHeight}
          lineWidth={settings.lineWidth}
          paragraphSpacing={settings.paragraphSpacing}
        />
        {!focusMode && <BacklinksPanel noteId={note.id} />}
      </div>

      {!focusMode && <EditorToolbar editor={editorInstance} />}
    </div>
  );
}
