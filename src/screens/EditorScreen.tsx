import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Icon } from "@/components/common/Icon";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { editorContentMatchesStoredJson } from "@/components/editor/noteSwitchContentUtils";
import { EditorStatusBar } from "@/components/editor/EditorStatusBar";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorFindBar } from "@/components/editor/EditorFindBar";
import { EditorNoteSearch } from "@/components/editor/EditorNoteSearch";
import { BacklinksPanel } from "@/components/backlinks/BacklinksPanel";
import { InfoPanel } from "@/components/editor/InfoPanel";
import { exportAndCopy, exportAndDownload } from "@/utils/export";
import { resolveTextFontFamily } from "@/utils/fonts";
import type { Editor } from "@tiptap/react";
import type { LayoutMode } from "@/hooks/useAdaptiveLayout";
import { clearInfoPanelTabReopenMemory } from "@/utils/noteToc";
import { dismissEditorOverlayOnEscape } from "@/utils/editorOverlayEscape";
import {
  attachEditorOverlaySelectionSync,
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
  setEditorFormatOverlayPanelOpen,
  restoreEditorSelectionOnOverlayDismiss,
} from "@/utils/editorOverlaySelection";
import { shouldSuppressFocusModeEscape } from "@/utils/editorSuggestionMenu";
import { editorHasNonEmptySelection } from "@/utils/editorSelection";
import {
  FORMAT_PLAYGROUND_TITLES,
  formatPlaygroundMatchesCanonicalSeed,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
  normalizePlaygroundContentSnapshot,
  playgroundEditorContentMatchesStored,
  playgroundEditorMarkOnlyDriftFromStored,
  playgroundFormatQaDraftHidesRestoreChip,
  playgroundPersistedContentForRow,
  playgroundWriteRegressesCanonicalStored,
  resolvePlaygroundSeedLocale,
  shouldShowPlaygroundRestoreButton,
  shouldShowPlaygroundRestoreInDriftBanner,
  migratePlaygroundContentIfStale,
  playgroundContentMatchesLocale,
} from "@/storage/formatPlaygroundNote";
import {
  clearStashedEditorAutosave,
  type EditorAutosaveFlushResult,
  peekStashedEditorAutosaveForNote,
  registerEditorAutosaveFlush,
  stashEditorAutosaveSnapshot,
  takeStashedEditorAutosaveForNote,
  unregisterEditorAutosaveFlush,
} from "@/store/editorAutosaveRegistry";
import { registerHunosE2eEditor } from "@/testing/hunos-e2e-bridge";
import { bindEditorLifecycleAutosaveFlush } from "@/store/editorLifecycleAutosave";
import {
  bumpPlaygroundWriteEpoch,
  getPlaygroundWriteEpoch,
} from "@/store/noteStorePlaygroundWriteEpoch";
import {
  clearUnloadBackup,
  registerUnloadDraftCollector,
  unregisterUnloadDraftCollector,
  persistUnloadDraftSync,
} from "@/store/lifecycleUnload";
import {
  sanitizeBlockImageNoteContent,
  sanitizeEditorStashContent,
} from "@/utils/migrateBlockImageFloor";
import {
  applyQueuedPlaygroundRestoreWhenEditorReady,
  createPlaygroundRestoreSession,
  finalizePlaygroundRestoreInEditor,
  shouldEndPlaygroundRestoreSession,
} from "@/screens/playgroundRestoreEditorSync";
import {
  clearPendingTitleTimer,
  markPendingTitle,
  takePendingTitle,
} from "@/screens/editorPendingTitleAutosave";
import {
  persistNoteContent,
  persistNoteTitle,
} from "@/screens/editorNotePersistence";
import {
  isDebouncedAutosaveStillCurrent,
  resolveEditorAutosaveContentJson,
} from "@/screens/editorAutosaveEffectCleanup";
import type { PersistNoteOptions } from "@/screens/editorNotePersistence";

declare const __HUNOS_E2E__: boolean | undefined;

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
    returnToNoteList,
    showToast,
    focusMode,
    toggleFocusMode,
    setFocusMode,
    findInNoteSignal,
    findInNoteReplaceMode,
    requestFindInNote,
    focusNewNoteTitleSignal,
    clearFocusNewNoteTitle,
    noteSearchOpen,
    clearNoteSearchOpen,
    openNoteSearch,
  } = useUIStore();
  const settings = useSettingsStore();
  const { hideCompletedTasks, setHideCompletedTasks } = settings;
  const [showActions, setShowActions] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [noteSearchVisible, setNoteSearchVisible] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingContentRef = useRef<string | null>(null);
  const contentWriteEpochRef = useRef(0);
  const lastPlaygroundMigrateKeyRef = useRef<string | null>(null);
  const playgroundRestoreSessionRef = useRef(createPlaygroundRestoreSession());
  const pendingRestoreToastRef = useRef(false);

  const note = notes.find((n) => n.id === activeNoteId);
  const noteContentForEditor = useMemo(() => {
    if (!note?.content) return "";
    return playgroundPersistedContentForRow(note.content);
  }, [note?.content]);
  const showBackButton = layout === "mobile";
  const isCompactChrome = focusMode && layout === "tablet";
  const prevFocusModeRef = useRef(focusMode);
  const suppressFocusToastRef = useRef(false);
  const [titleValue, setTitleValue] = useState("");
  const [editorSeedContent, setEditorSeedContent] = useState<string | null>(
    null,
  );
  const [restoreEditorSyncTick, setRestoreEditorSyncTick] = useState(0);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreChipSuppressed, setRestoreChipSuppressed] = useState(false);
  const restoreChipSuppressedRef = useRef(false);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingTitleRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipTitleSyncOnceRef = useRef(false);
  const prevActiveNoteIdRef = useRef<string | null>(null);
  const stashRestoreHandledForNoteRef = useRef<string | null>(null);

  const captureSelectionForOverlay = useCallback(() => {
    if (editorInstanceRef.current) {
      captureEditorOverlaySelection(editorInstanceRef.current);
    }
  }, []);

  const dismissStatsOverlay = useCallback(() => {
    if (editorInstanceRef.current) {
      restoreEditorSelectionOnOverlayDismiss(editorInstanceRef.current);
    }
    setEditorFormatOverlayPanelOpen(false);
    setShowStats(false);
  }, []);

  const openStatsOverlay = useCallback(() => {
    setNoteSearchVisible(false);
    setFindOpen(false);
    captureSelectionForOverlay();
    setEditorFormatOverlayPanelOpen(true);
    setShowStats(true);
  }, [captureSelectionForOverlay]);

  const dismissActionsOverlay = useCallback(() => {
    if (editorInstanceRef.current) {
      restoreEditorSelectionOnOverlayDismiss(editorInstanceRef.current);
    }
    setEditorFormatOverlayPanelOpen(false);
    setShowActions(false);
  }, []);

  const openActionsOverlay = useCallback(() => {
    captureSelectionForOverlay();
    setEditorFormatOverlayPanelOpen(true);
    setShowActions(true);
  }, [captureSelectionForOverlay]);

  useEffect(() => {
    const overlayOpen = showActions || showStats;
    if (!overlayOpen) {
      return;
    }
    const editor = editorInstanceRef.current;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      captureEditorOverlaySelection(editor);
    }
  }, [showActions, showStats]);

  const applyRestoreChipSuppressed = useCallback((suppressed: boolean) => {
    restoreChipSuppressedRef.current = suppressed;
    setRestoreChipSuppressed(suppressed);
  }, []);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorInstanceRef.current = editor;
    setEditorInstance(editor);
    if (typeof __HUNOS_E2E__ !== "undefined" && __HUNOS_E2E__) {
      registerHunosE2eEditor(editor);
    }
  }, []);

  useEffect(() => {
    if (typeof __HUNOS_E2E__ === "undefined" || !__HUNOS_E2E__) return;
    return () => registerHunosE2eEditor(null);
  }, []);

  useEffect(() => {
    if (!editorInstance) return;
    return attachEditorOverlaySelectionSync(editorInstance);
  }, [editorInstance]);

  useEffect(() => {
    const leavingNoteId = prevActiveNoteIdRef.current;
    const nextNoteId = note?.id ?? null;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    if (titleTimeoutRef.current) {
      clearPendingTitleTimer(titleTimeoutRef);
      pendingTitleRef.current = null;
    }
    if (leavingNoteId && leavingNoteId !== nextNoteId) {
      const orphan = pendingContentRef.current;
      if (orphan) {
        stashEditorAutosaveSnapshot(leavingNoteId, orphan);
      }
      stashRestoreHandledForNoteRef.current = null;
      clearInfoPanelTabReopenMemory();
    }
    applyRestoreChipSuppressed(false);
    pendingContentRef.current = null;
    setEditorSeedContent(null);
    clearEditorOverlaySelection();
    titleInputRef.current?.blur();
    setTitleValue(note?.title ?? "");
    if (note?.id) {
      contentWriteEpochRef.current = getPlaygroundWriteEpoch(note.id);
    }
    prevActiveNoteIdRef.current = nextNoteId;
    setRestoreConfirmOpen(false);
  }, [note?.id]);

  useEffect(() => {
    if (!note?.id) return;
    contentWriteEpochRef.current = getPlaygroundWriteEpoch(note.id);
  }, [note?.id, note?.content, note?.modifiedAt]);

  useEffect(() => {
    if (!note?.title) return;
    if (skipTitleSyncOnceRef.current) {
      skipTitleSyncOnceRef.current = false;
      return;
    }
    const titleInput = document.querySelector(
      '[data-field="note-title"]',
    ) as HTMLInputElement | null;
    if (document.activeElement === titleInput) return;
    setTitleValue(note.title);
  }, [note?.title]);

  const persistEditorTitle = useCallback(
    async (
      noteId: string,
      title: string,
      writeEpoch = contentWriteEpochRef.current,
      options: PersistNoteOptions = {},
    ): Promise<boolean> => {
      const saved = await persistNoteTitle(
        saveNoteTitle,
        noteId,
        title,
        writeEpoch,
        options,
      );
      if (!saved) {
        pendingTitleRef.current = title;
      }
      return saved;
    },
    [saveNoteTitle],
  );

  const persistEditorContent = useCallback(
    async (
      noteId: string,
      json: string,
      writeEpoch = contentWriteEpochRef.current,
      options: PersistNoteOptions = {},
    ): Promise<boolean> => {
      const saved = await persistNoteContent(
        saveNoteContent,
        noteId,
        json,
        writeEpoch,
        options,
      );
      if (saved && pendingContentRef.current === json) {
        pendingContentRef.current = null;
      } else if (!saved) {
        pendingContentRef.current = json;
      }
      return saved;
    },
    [saveNoteContent],
  );

  const scheduleContentPersist = useCallback(
    (noteId: string, json: string, writeEpoch: number, flushSave?: boolean) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (flushSave) {
        void persistEditorContent(noteId, json, writeEpoch, {
          notifyOnError: false,
        });
        return;
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (
          !isDebouncedAutosaveStillCurrent(
            noteId,
            useNoteStore.getState().activeNoteId,
          )
        ) {
          return;
        }
        void persistEditorContent(noteId, json, writeEpoch, {
          notifyOnError: false,
        });
      }, 400);
    },
    [persistEditorContent],
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      applyRestoreChipSuppressed(false);
      setTitleValue(newTitle);
      const noteId = activeNoteId;
      if (!noteId) return;

      markPendingTitle(
        pendingTitleRef,
        titleTimeoutRef,
        newTitle,
        (title, writeEpoch) => persistEditorTitle(noteId, title, writeEpoch),
        contentWriteEpochRef.current,
        () =>
          isDebouncedAutosaveStillCurrent(
            noteId,
            useNoteStore.getState().activeNoteId,
          ),
      );
    },
    [activeNoteId, applyRestoreChipSuppressed, persistEditorTitle],
  );

  const handleContentChange = useCallback(
    (json: string, flushSave?: boolean) => {
      if (!activeNoteId) return;
      if (playgroundRestoreSessionRef.current.isActive()) {
        setRestoreEditorSyncTick((tick) => tick + 1);
        if (
          playgroundEditorContentMatchesStored(
            json,
            noteContentForEditor,
            resolvePlaygroundSeedLocale(noteContentForEditor, settings.locale),
          )
        ) {
          playgroundRestoreSessionRef.current.end();
          return;
        }
        if (
          note &&
          isFormatPlaygroundNote(note.title, noteContentForEditor) &&
          playgroundFormatQaDraftHidesRestoreChip(
            json,
            note.title,
            noteContentForEditor,
            resolvePlaygroundSeedLocale(noteContentForEditor, settings.locale),
          )
        ) {
          playgroundRestoreSessionRef.current.end();
        } else {
          return;
        }
      }

      if (note && isFormatPlaygroundNote(note.title, noteContentForEditor)) {
        const playgroundLocale = resolvePlaygroundSeedLocale(
          noteContentForEditor,
          settings.locale,
        );
        if (
          playgroundFormatQaDraftHidesRestoreChip(
            json,
            note.title,
            noteContentForEditor,
            playgroundLocale,
          )
        ) {
          applyRestoreChipSuppressed(true);
          pendingContentRef.current = json;
          setRestoreEditorSyncTick((tick) => tick + 1);
          scheduleContentPersist(
            activeNoteId,
            json,
            contentWriteEpochRef.current,
            flushSave,
          );
          return;
        }
        if (
          formatPlaygroundMatchesCanonicalSeed(
            note.title,
            noteContentForEditor,
            playgroundLocale,
          )
        ) {
          const storedFingerprint = normalizePlaygroundContentSnapshot(
            noteContentForEditor,
            playgroundLocale,
          );
          const liveFingerprint = normalizePlaygroundContentSnapshot(
            json,
            playgroundLocale,
          );
          if (liveFingerprint === storedFingerprint) {
            const hadPending = pendingContentRef.current != null;
            pendingContentRef.current = null;
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
              saveTimeoutRef.current = undefined;
            }
            if (hadPending) {
              setRestoreEditorSyncTick((tick) => tick + 1);
            }
            return;
          }
        }
      }

      let clearRestoreSuppress = true;
      if (restoreChipSuppressedRef.current && note) {
        const playgroundLocale = resolvePlaygroundSeedLocale(
          noteContentForEditor,
          settings.locale,
        );
        if (
          isFormatPlaygroundNote(note.title, noteContentForEditor) &&
          (playgroundEditorContentMatchesStored(
            json,
            noteContentForEditor,
            playgroundLocale,
          ) ||
            playgroundFormatQaDraftHidesRestoreChip(
              json,
              note.title,
              noteContentForEditor,
              playgroundLocale,
            ))
        ) {
          clearRestoreSuppress = false;
        }
      } else if (
        note &&
        isFormatPlaygroundNote(note.title, noteContentForEditor) &&
        playgroundFormatQaDraftHidesRestoreChip(
          json,
          note.title,
          noteContentForEditor,
          resolvePlaygroundSeedLocale(noteContentForEditor, settings.locale),
        )
      ) {
        clearRestoreSuppress = false;
        applyRestoreChipSuppressed(true);
      }
      if (clearRestoreSuppress) {
        applyRestoreChipSuppressed(false);
      }
      pendingContentRef.current = json;
      if (note && isFormatPlaygroundNote(note.title, noteContentForEditor)) {
        setRestoreEditorSyncTick((tick) => tick + 1);
      }
      scheduleContentPersist(
        activeNoteId,
        json,
        contentWriteEpochRef.current,
        flushSave,
      );
    },
    [
      activeNoteId,
      applyRestoreChipSuppressed,
      note,
      noteContentForEditor,
      scheduleContentPersist,
      settings.locale,
    ],
  );

  const collectPendingAutosave = useCallback((): string | null => {
    if (!activeNoteId) return null;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }

    const json = resolveEditorAutosaveContentJson({
      editor: editorInstanceRef.current,
      pendingContentJson: pendingContentRef.current,
    });

    if (json) {
      pendingContentRef.current = json;
    }
    return json;
  }, [activeNoteId]);

  const collectUnloadDraft = useCallback(() => {
    if (playgroundRestoreSessionRef.current.isActive()) return null;

    const noteId = activeNoteId;
    if (!noteId) return null;

    const pendingTitle = pendingTitleRef.current;
    const storedTitle = note?.title ?? "";
    const draftTitle = pendingTitle ?? titleValue;
    const hasTitleDraft =
      pendingTitle != null || draftTitle.trim() !== storedTitle.trim();
    const content = collectPendingAutosave();

    if (!hasTitleDraft && !content) return null;

    return {
      noteId,
      title: hasTitleDraft ? draftTitle : null,
      content,
      savedAt: Date.now(),
    };
  }, [activeNoteId, collectPendingAutosave, note?.title, titleValue]);

  const flushPendingTitle = useCallback(async (): Promise<boolean> => {
    const noteId = activeNoteId;
    if (!noteId) return true;
    const pendingTitle = takePendingTitle(pendingTitleRef, titleTimeoutRef);
    if (pendingTitle == null) return true;
    return persistEditorTitle(noteId, pendingTitle, undefined, {
      notifyOnError: false,
    });
  }, [activeNoteId, persistEditorTitle]);

  const flushPendingAutosave =
    useCallback(async (): Promise<EditorAutosaveFlushResult> => {
      if (playgroundRestoreSessionRef.current.isActive()) {
        const titleOk = await flushPendingTitle();
        const json = collectPendingAutosave();
        if (json && activeNoteId) {
          stashEditorAutosaveSnapshot(activeNoteId, json);
          pendingContentRef.current = null;
        }
        return { content: json, persisted: titleOk };
      }

      const titleOk = await flushPendingTitle();

      const json = collectPendingAutosave();
      if (!json || !activeNoteId) {
        return { content: null, persisted: titleOk };
      }

      stashEditorAutosaveSnapshot(activeNoteId, json);

      const contentOk = await persistEditorContent(
        activeNoteId,
        json,
        undefined,
        {
          notifyOnError: false,
        },
      );
      if (contentOk) {
        clearStashedEditorAutosave(activeNoteId);
        pendingContentRef.current = null;
      } else {
        pendingContentRef.current = json;
      }
      return { content: json, persisted: titleOk && contentOk };
    }, [
      activeNoteId,
      collectPendingAutosave,
      flushPendingTitle,
      persistEditorContent,
    ]);

  useEffect(() => {
    registerEditorAutosaveFlush(flushPendingAutosave);
    registerUnloadDraftCollector(collectUnloadDraft);
    const unbindLifecycle = bindEditorLifecycleAutosaveFlush();
    return () => {
      persistUnloadDraftSync();
      unbindLifecycle();
      unregisterEditorAutosaveFlush(flushPendingAutosave);
      unregisterUnloadDraftCollector(collectUnloadDraft);
    };
  }, [collectUnloadDraft, flushPendingAutosave]);

  useEffect(() => {
    const session = playgroundRestoreSessionRef.current;
    if (session.cancelIfNoteChanged(note?.id)) {
      pendingRestoreToastRef.current = false;
      setEditorSeedContent(null);
    }
  }, [note?.id]);

  useEffect(() => {
    if (!note?.id) return;
    if (stashRestoreHandledForNoteRef.current === note.id) return;

    if (playgroundRestoreSessionRef.current.isActive()) {
      return;
    }

    const snapshot = peekStashedEditorAutosaveForNote(note.id);
    stashRestoreHandledForNoteRef.current = note.id;

    if (!snapshot) {
      return;
    }

    const taken = takeStashedEditorAutosaveForNote(note.id);
    if (!taken) return;

    const isPlayground = isFormatPlaygroundNote(note.title, note.content);
    if (isPlayground) {
      if (!playgroundContentMatchesLocale(taken.content, settings.locale)) {
        return;
      }
      const sanitized = sanitizeEditorStashContent(taken.content);
      pendingContentRef.current = sanitized;
      setEditorSeedContent(sanitized);
      if (
        playgroundFormatQaDraftHidesRestoreChip(
          sanitized,
          note.title,
          note.content,
          settings.locale,
        )
      ) {
        applyRestoreChipSuppressed(true);
      }
      void persistEditorContent(note.id, sanitized, undefined, {
        notifyOnError: false,
      });
      return;
    }

    const sanitized = sanitizeEditorStashContent(taken.content);
    setEditorSeedContent(null);
    void saveNoteContent(note.id, sanitized);
  }, [
    note?.id,
    note?.title,
    applyRestoreChipSuppressed,
    persistEditorContent,
    saveNoteContent,
    settings.locale,
  ]);

  useEffect(() => {
    if (!editorInstance) return;
    const applied = applyQueuedPlaygroundRestoreWhenEditorReady({
      session: playgroundRestoreSessionRef.current,
      editor: editorInstance,
      activeNoteId: note?.id,
    });
    if (!applied && playgroundRestoreSessionRef.current.isActive()) {
      const queued = playgroundRestoreSessionRef.current.hasQueuedContent();
      if (queued && noteContentForEditor) {
        setEditorSeedContent(noteContentForEditor);
        setRestoreEditorSyncTick((tick) => tick + 1);
      }
    }
  }, [editorInstance, note?.id, noteContentForEditor]);

  useEffect(() => {
    const session = playgroundRestoreSessionRef.current;
    if (
      !shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: session.isActive(),
        hasNoteContent: Boolean(note?.content),
        editorContentJson: editorInstance
          ? JSON.stringify(editorInstance.getJSON())
          : null,
        restoredContent: noteContentForEditor,
        fallbackLocale: settings.locale,
      })
    ) {
      return;
    }
    session.end();
    if (pendingRestoreToastRef.current) {
      showToast(t("notes.actions.restorePlaygroundDone"));
      pendingRestoreToastRef.current = false;
    }
  }, [
    note?.content,
    noteContentForEditor,
    editorInstance,
    restoreEditorSyncTick,
    settings.locale,
    showToast,
    t,
  ]);

  useEffect(() => {
    if (!note?.id) return;
    if (!isFormatPlaygroundNote(note.title, note.content)) return;
    clearStashedEditorAutosave();
    setEditorSeedContent(null);
  }, [settings.locale]);

  useEffect(() => {
    if (!note?.id || !note.content) return;

    const { content, changed } = sanitizeBlockImageNoteContent(note.content);
    if (changed) {
      void saveNoteContent(note.id, content);
    }
  }, [note?.id, note?.content, saveNoteContent]);

  useEffect(() => {
    if (!note?.id || !isFormatPlaygroundNote(note.title, note.content)) return;

    const seedLocale = resolvePlaygroundSeedLocale(
      note.content,
      settings.locale,
    );
    const migrateKey = `${note.id}:${seedLocale}`;
    if (lastPlaygroundMigrateKeyRef.current === migrateKey) {
      return;
    }
    lastPlaygroundMigrateKeyRef.current = migrateKey;
    const migrated = migratePlaygroundContentIfStale(note.content, seedLocale);
    const expectedTitle = getFormatPlaygroundTitle(seedLocale);
    const titleNeedsUpdate =
      FORMAT_PLAYGROUND_TITLES.includes(note.title) &&
      note.title !== expectedTitle;

    if (migrated) {
      const storedFingerprint = normalizePlaygroundContentSnapshot(
        note.content,
        seedLocale,
      );
      const migratedFingerprint = normalizePlaygroundContentSnapshot(
        migrated,
        seedLocale,
      );
      if (
        migratedFingerprint !== storedFingerprint &&
        !playgroundWriteRegressesCanonicalStored(
          note.title,
          note.content,
          migrated,
          settings.locale,
        )
      ) {
        void saveNoteContent(note.id, migrated);
      }
    }
    if (titleNeedsUpdate) {
      void saveNoteTitle(note.id, expectedTitle);
    }
  }, [note, settings.locale, saveNoteContent, saveNoteTitle]);

  useEffect(() => {
    setFindOpen(false);
    setNoteSearchVisible(false);
  }, [note?.id]);

  useEffect(() => {
    if (findInNoteSignal === 0) return;
    setNoteSearchVisible(false);
    setFindOpen(true);
  }, [findInNoteSignal]);

  useEffect(() => {
    if (!noteSearchOpen) return;
    setFindOpen(false);
    if (editorInstanceRef.current) {
      restoreEditorSelectionOnOverlayDismiss(editorInstanceRef.current);
    }
    setEditorFormatOverlayPanelOpen(false);
    setShowStats(false);
    setNoteSearchVisible(true);
    clearNoteSearchOpen();
  }, [noteSearchOpen, clearNoteSearchOpen]);

  useEffect(() => {
    if (focusNewNoteTitleSignal === 0) return;
    if (layout !== "mobile") return;
    clearFocusNewNoteTitle();
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
  }, [focusNewNoteTitleSignal, layout, clearFocusNewNoteTitle]);

  useEffect(() => {
    if (layout !== "mobile" || !note?.id || !editorInstance) return;
    if (focusNewNoteTitleSignal > 0) return;

    const raf = requestAnimationFrame(() => {
      editorInstance.commands.focus("end", { scrollIntoView: false });
    });
    return () => cancelAnimationFrame(raf);
  }, [note?.id, layout, editorInstance, focusNewNoteTitleSignal]);

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
      if (
        dismissEditorOverlayOnEscape(
          e.key,
          { showActions, showStats },
          {
            closeActions: dismissActionsOverlay,
            closeStats: dismissStatsOverlay,
          },
        )
      ) {
        e.preventDefault();
        return;
      }
      if (e.key !== "Escape") return;
      if (!focusMode) return;
      if (shouldSuppressFocusModeEscape()) return;
      if (editorHasNonEmptySelection(editorInstance)) return;
      e.preventDefault();
      setFocusMode(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    focusMode,
    setFocusMode,
    editorInstance,
    showActions,
    showStats,
    dismissActionsOverlay,
    dismissStatsOverlay,
  ]);

  const handlePin = () => {
    if (!note) return;
    pinNote(note.id, !note.isPinned);
    showToast(
      note.isPinned ? t("notes.actions.unpin") : t("notes.actions.pin"),
    );
    dismissActionsOverlay();
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

  const requestRestorePlaygroundConfirm = () => {
    setRestoreConfirmOpen(true);
  };

  const cancelRestorePlaygroundConfirm = () => {
    setRestoreConfirmOpen(false);
  };

  const handleRestorePlayground = async () => {
    if (!note) return;
    setRestoreConfirmOpen(false);
    const restoreSession = playgroundRestoreSessionRef.current;
    contentWriteEpochRef.current = bumpPlaygroundWriteEpoch(note.id);
    applyRestoreChipSuppressed(true);
    restoreSession.begin(note.id);
    pendingRestoreToastRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = undefined;
    }
    pendingContentRef.current = null;
    pendingTitleRef.current = null;
    clearStashedEditorAutosave();
    setEditorSeedContent(null);
    try {
      const seedLocale = resolvePlaygroundSeedLocale(
        note.content,
        settings.locale,
      );
      await restoreFormatPlayground(note.id, seedLocale);
      contentWriteEpochRef.current = getPlaygroundWriteEpoch(note.id);
      clearUnloadBackup();
      const restoredNote = useNoteStore
        .getState()
        .notes.find((candidate) => candidate.id === note.id);
      const restoredRaw = restoredNote?.content ?? "";
      const restoredContent = restoredRaw
        ? playgroundPersistedContentForRow(restoredRaw)
        : "";
      const restoredTitle = getFormatPlaygroundTitle(seedLocale);
      if (restoredNote && restoredNote.title !== restoredTitle) {
        await saveNoteTitle(
          note.id,
          restoredTitle,
          contentWriteEpochRef.current,
        );
      }
      skipTitleSyncOnceRef.current = true;
      setTitleValue(restoredTitle);
      titleInputRef.current?.blur();
      setRestoreEditorSyncTick((tick) => tick + 1);
      const applied = finalizePlaygroundRestoreInEditor({
        session: restoreSession,
        editor: editorInstanceRef.current,
        restoredContent,
      });
      if (!applied && restoredContent) {
        setEditorSeedContent(restoredContent);
      } else if (applied || !restoredContent) {
        restoreSession.end();
      }
      if (!restoreSession.isActive()) {
        showToast(t("notes.actions.restorePlaygroundDone"));
        pendingRestoreToastRef.current = false;
      }
      const activeSearch = useUIStore.getState().searchQuery.trim();
      if (activeSearch) {
        await useUIStore.getState().performSearch(activeSearch);
      }
      dismissActionsOverlay();
    } catch {
      pendingRestoreToastRef.current = false;
      restoreSession.end();
    }
  };

  const showRestorePlayground = useMemo(() => {
    if (!note) return false;
    let pendingDraftContent = pendingContentRef.current;
    if (
      pendingDraftContent == null &&
      editorInstance &&
      !playgroundRestoreSessionRef.current.isActive()
    ) {
      try {
        pendingDraftContent = JSON.stringify(editorInstance.getJSON());
      } catch {
        pendingDraftContent = null;
      }
    }
    const displayTitle = titleValue.trim() || note.title;
    const playgroundLocale = resolvePlaygroundSeedLocale(
      noteContentForEditor,
      settings.locale,
    );
    const showRestore = shouldShowPlaygroundRestoreButton({
      displayTitle,
      storedTitle: note.title,
      storedContent: noteContentForEditor,
      pendingDraftContent,
      pendingTitleDraft: pendingTitleRef.current,
      fallbackLocale: settings.locale,
      isRestoringPlayground: playgroundRestoreSessionRef.current.isActive(),
    });
    if (!showRestore) return false;
    if (
      restoreChipSuppressed &&
      pendingDraftContent &&
      isFormatPlaygroundNote(note.title, noteContentForEditor) &&
      playgroundFormatQaDraftHidesRestoreChip(
        pendingDraftContent,
        note.title,
        noteContentForEditor,
        playgroundLocale,
      )
    ) {
      return false;
    }
    return true;
  }, [
    note,
    noteContentForEditor,
    titleValue,
    settings.locale,
    restoreEditorSyncTick,
    restoreChipSuppressed,
    editorInstance,
  ]);

  const showRestorePlaygroundDriftBanner = useMemo(() => {
    if (!note) return false;
    let pendingDraftContent = pendingContentRef.current;
    if (
      pendingDraftContent == null &&
      editorInstance &&
      !playgroundRestoreSessionRef.current.isActive()
    ) {
      try {
        pendingDraftContent = JSON.stringify(editorInstance.getJSON());
      } catch {
        pendingDraftContent = null;
      }
    }
    const displayTitle = titleValue.trim() || note.title;
    return shouldShowPlaygroundRestoreInDriftBanner({
      displayTitle,
      storedTitle: note.title,
      storedContent: noteContentForEditor,
      pendingDraftContent,
      pendingTitleDraft: pendingTitleRef.current,
      fallbackLocale: settings.locale,
      isRestoringPlayground: playgroundRestoreSessionRef.current.isActive(),
    });
  }, [
    note,
    noteContentForEditor,
    titleValue,
    settings.locale,
    restoreEditorSyncTick,
    editorInstance,
  ]);

  const showRestorePlaygroundChip =
    showRestorePlayground && !showRestorePlaygroundDriftBanner;

  if (!note) {
    const hasNotes = notes.length > 0;
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
            {hasNotes ? t("notes.selectPrompt") : t("notes.empty")}
          </p>
        </div>
      </div>
    );
  }

  const restorePlaygroundLabel = t("notes.actions.restorePlayground");
  const restorePlaygroundVisibleText = t(
    "notes.actions.restorePlaygroundShort",
  );
  const editorNoteTitle = titleValue.trim() || note?.title || "";
  const editorAccessibilityLabel = editorNoteTitle
    ? t("editor.regionLabel", { title: editorNoteTitle })
    : undefined;
  const isMobileRestoreChip = layout === "mobile";

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
          position: "relative",
          zIndex: showStats ? 70 : undefined,
        }}
      >
        {showBackButton && (
          <button
            type="button"
            data-testid="editor-back-button"
            aria-label={t("tags.sections.allNotes")}
            onClick={returnToNoteList}
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
        {showBackButton && (
          <button
            type="button"
            data-testid="editor-all-notes-button"
            onClick={returnToNoteList}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: theme.radius.full,
              fontSize: 14,
              fontWeight: 600,
              color: theme.colors.accent,
              whiteSpace: "nowrap",
              minHeight: 44,
            }}
          >
            {t("tags.sections.allNotes")}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {focusMode && isCompactChrome ? (
          <>
            <button
              data-testid="info-panel-toggle"
              onPointerDownCapture={() => {
                if (!showStats) captureSelectionForOverlay();
              }}
              onClick={() =>
                showStats ? dismissStatsOverlay() : openStatsOverlay()
              }
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
                  type="button"
                  data-testid="editor-note-search-toggle"
                  onClick={() => openNoteSearch()}
                  aria-label={t("notes.search.placeholder")}
                  title={t("notes.search.placeholder")}
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
                    backgroundColor: noteSearchVisible
                      ? theme.colors.accentLight
                      : "transparent",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!noteSearchVisible)
                      e.currentTarget.style.backgroundColor =
                        theme.colors.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!noteSearchVisible)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Icon
                    name="search"
                    size={17}
                    color={
                      noteSearchVisible
                        ? theme.colors.accent
                        : theme.colors.textTertiary
                    }
                  />
                </button>
                <button
                  data-testid="info-panel-toggle"
                  onPointerDownCapture={() => {
                    if (!showStats) captureSelectionForOverlay();
                  }}
                  onClick={() =>
                    showStats ? dismissStatsOverlay() : openStatsOverlay()
                  }
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
                  onPointerDownCapture={() => {
                    if (!showActions) captureSelectionForOverlay();
                  }}
                  onClick={() =>
                    showActions ? dismissActionsOverlay() : openActionsOverlay()
                  }
                  aria-label={t("common.actions.more")}
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

      {findOpen && editorInstance && (
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

      {noteSearchVisible && (
        <EditorNoteSearch onClose={() => setNoteSearchVisible(false)} />
      )}

      {/* Action menu with backdrop */}
      {showActions && (
        <>
          <div
            data-testid="editor-more-actions-backdrop"
            onClick={dismissActionsOverlay}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 49,
              pointerEvents: "auto",
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
                      dismissActionsOverlay();
                      if (layout === "mobile") goBack();
                    },
                  },
                  {
                    label: t("notes.actions.deletePermanently"),
                    icon: "trash",
                    danger: true,
                    action: () => {
                      permanentlyDelete(note.id);
                      dismissActionsOverlay();
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
                  ...(showRestorePlayground
                    ? [
                        {
                          label: t("notes.actions.restorePlayground"),
                          icon: "note",
                          danger: false,
                          action: requestRestorePlaygroundConfirm,
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
                    label: t("export.copyMarkdown"),
                    icon: "export",
                    danger: false,
                    testId: "export-copy-markdown",
                    action: () => {
                      void exportAndCopy(note, "markdown")
                        .then(() => {
                          showToast(t("export.copied"));
                        })
                        .catch(() => {
                          showToast(t("export.copyFailed"), "error");
                        });
                      dismissActionsOverlay();
                    },
                  },
                  {
                    label: t("export.markdown"),
                    icon: "export",
                    danger: false,
                    action: () => {
                      exportAndDownload(note, "markdown");
                      dismissActionsOverlay();
                    },
                  },
                  {
                    label: t("export.html"),
                    icon: "export",
                    danger: false,
                    action: () => {
                      exportAndDownload(note, "html");
                      dismissActionsOverlay();
                    },
                  },
                ]
            ).map((item, idx, arr) => (
              <React.Fragment key={item.label}>
                <button
                  onClick={item.action}
                  data-testid={"testId" in item ? item.testId : undefined}
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

      {showStats && note && (
        <InfoPanel
          note={note}
          editor={editorInstance}
          onClose={dismissStatsOverlay}
          hideCompletedTasks={hideCompletedTasks}
          onHideCompletedTasksChange={setHideCompletedTasks}
        />
      )}

      <div
        style={{ flex: 1, overflow: "auto", minHeight: 0 }}
        onClick={() => showActions && dismissActionsOverlay()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px 0",
            maxWidth: `${settings.lineWidth}em`,
            margin: "0 auto",
          }}
        >
          <input
            ref={titleInputRef}
            id="note-editor-title"
            data-field="note-title"
            data-testid="note-title"
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
              flex: 1,
              minWidth: 0,
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
          {showRestorePlaygroundChip && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                requestRestorePlaygroundConfirm();
              }}
              aria-label={restorePlaygroundLabel}
              title={restorePlaygroundLabel}
              data-testid="restore-playground-button"
              style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.borderLight}`,
                cursor: "pointer",
                padding: isMobileRestoreChip ? "6px 8px" : "6px 12px",
                borderRadius: theme.radius.full,
                display: "flex",
                alignItems: "center",
                gap: isMobileRestoreChip ? 4 : 6,
                minHeight: 44,
                fontSize: 13,
                fontWeight: 500,
                color: theme.colors.textSecondary,
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  theme.colors.surfaceHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.colors.surface)
              }
            >
              <Icon name="note" size={16} color={theme.colors.textSecondary} />
              {restorePlaygroundVisibleText}
            </button>
          )}
        </div>
        {showRestorePlaygroundDriftBanner && (
          <div
            data-testid="restore-playground-drift-banner"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 24px 0",
              maxWidth: `${settings.lineWidth}em`,
              margin: "0 auto",
            }}
          >
            <p
              style={{
                flex: 1,
                margin: 0,
                fontSize: 12,
                lineHeight: 1.4,
                color: theme.colors.textTertiary,
              }}
            >
              {t("notes.actions.playgroundDriftBannerHint")}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                requestRestorePlaygroundConfirm();
              }}
              aria-label={restorePlaygroundLabel}
              title={restorePlaygroundLabel}
              data-testid="restore-playground-button"
              style={{
                background: "transparent",
                border: `1px solid ${theme.colors.borderLight}`,
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: theme.radius.full,
                display: "flex",
                alignItems: "center",
                gap: 4,
                minHeight: 32,
                fontSize: 12,
                fontWeight: 500,
                color: theme.colors.textTertiary,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {restorePlaygroundVisibleText}
            </button>
          </div>
        )}
        <TiptapEditor
          noteId={note.id}
          initialContent={editorSeedContent ?? noteContentForEditor}
          onChange={handleContentChange}
          onEditorReady={handleEditorReady}
          accessibilityLabel={editorAccessibilityLabel}
          fontFamily={settings.editorFont}
          headingsFont={settings.headingsFont}
          codeFont={settings.codeFont}
          fontSize={settings.fontSize}
          lineHeight={settings.lineHeight}
          lineWidth={settings.lineWidth}
          paragraphSpacing={settings.paragraphSpacing}
          hideCompletedTasks={settings.hideCompletedTasks}
        />
        {!focusMode && <BacklinksPanel key={note.id} noteId={note.id} />}
      </div>

      {editorInstance && (
        <EditorStatusBar
          editor={editorInstance}
          lineWidth={settings.lineWidth}
        />
      )}
      {!focusMode && (
        <div
          data-testid="editor-toolbar-layer"
          style={{ position: "relative", zIndex: 65, flexShrink: 0 }}
        >
          <EditorToolbar
            editor={editorInstance}
            layoutMode={layout}
            formatOverlayOpen={showActions || showStats}
          />
        </div>
      )}
      <ConfirmDialog
        open={restoreConfirmOpen}
        testId="restore-playground-confirm"
        title={t("notes.actions.restorePlaygroundConfirmTitle")}
        message={t("notes.actions.restorePlaygroundConfirmMessage")}
        confirmLabel={t("notes.actions.restorePlaygroundShort")}
        onConfirm={() => void handleRestorePlayground()}
        onCancel={cancelRestorePlaygroundConfirm}
      />
    </div>
  );
}
