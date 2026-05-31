import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { SettingToggle } from "@/components/settings/SettingToggle";
import type { Note } from "@/types/note";
import type { Editor } from "@tiptap/react";
import {
  handleInfoPanelTocTap,
  panelTocEntryFromPointerY,
  requestPinPanelTocListScrollTop,
  resolvePanelTocScrollContainer,
  scrollPanelTocEntryIntoView,
  shouldDeferPanelTocScrollIntoView,
} from "@/utils/tocNavigation";
import {
  editorHasTaskList,
  noteContentHasTaskList,
} from "@/utils/noteContentHasTaskList";
import { deriveNoteStats } from "@/utils/noteStats";
import {
  clearInfoPanelTabReopenMemory,
  defaultInfoPanelTab,
  deriveToc,
  initialInfoPanelTab,
  rememberInfoPanelTabForReopen,
  type InfoPanelTab,
} from "@/utils/noteToc";

interface InfoPanelProps {
  note: Note;
  editor: Editor | null;
  onClose: () => void;
  hideCompletedTasks: boolean;
  onHideCompletedTasksChange: (hide: boolean) => void;
}

const DRAG_CLOSE_THRESHOLD = 80;
/** Breathing room below the last TOC row inside the panel scroll viewport. */
const TOC_LIST_BOTTOM_PADDING_PX = 48;

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en", { month: "short" });
  const year = d.getFullYear();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} at ${h}:${m}`;
}

export function InfoPanel({
  note,
  editor,
  onClose,
  hideCompletedTasks,
  onHideCompletedTasksChange,
}: InfoPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [showHideCompletedToggle, setShowHideCompletedToggle] = useState(
    () => editorHasTaskList(editor) || noteContentHasTaskList(note.content),
  );
  const [activeTab, setActiveTab] = useState<InfoPanelTab>(() =>
    initialInfoPanelTab(note, editor),
  );
  const [statsRevision, setStatsRevision] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const noteIdRef = useRef(note.id);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const lastTocActivateRef = useRef<{ index: number; time: number } | null>(
    null,
  );

  useEffect(() => {
    if (noteIdRef.current === note.id) return;
    noteIdRef.current = note.id;
    clearInfoPanelTabReopenMemory();
    setActiveTab(defaultInfoPanelTab(note, editor));
  }, [note.id, note, editor]);

  const handleClose = useCallback(() => {
    rememberInfoPanelTabForReopen(note.id, activeTabRef.current);
    onClose();
  }, [note.id, onClose]);

  const selectTab = useCallback(
    (tab: InfoPanelTab) => {
      setActiveTab(tab);
      rememberInfoPanelTabForReopen(note.id, tab);
    },
    [note.id],
  );

  useEffect(() => {
    if (!editor) {
      setShowHideCompletedToggle(noteContentHasTaskList(note.content));
      return;
    }

    const syncTaskListVisibility = () => {
      setShowHideCompletedToggle(editorHasTaskList(editor));
    };

    syncTaskListVisibility();
    editor.on("transaction", syncTaskListVisibility);
    return () => {
      editor.off("transaction", syncTaskListVisibility);
    };
  }, [editor, note.content]);

  useEffect(() => {
    if (!editor) return;
    const refreshStats = () => setStatsRevision((n) => n + 1);
    refreshStats();
    editor.on("transaction", refreshStats);
    return () => {
      editor.off("transaction", refreshStats);
    };
  }, [editor]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const { charCount, wordCount, paragraphCount, readingTimeMinutes } = useMemo(
    () => deriveNoteStats(note, editor),
    [note, editor, statsRevision],
  );
  const toc = useMemo(
    () => deriveToc(note, editor),
    [note, editor, statsRevision],
  );

  const activateTocEntry = (
    index: number,
    docPos?: number,
    entryEl?: HTMLElement | null,
  ) => {
    if (!editor) return;
    const now = Date.now();
    const last = lastTocActivateRef.current;
    if (last?.index === index && now - last.time < 300) return;
    lastTocActivateRef.current = { index, time: now };
    if (!entryEl) {
      handleInfoPanelTocTap(editor, index, docPos);
      return;
    }
    const list = entryEl.closest<HTMLElement>(
      '[data-testid="info-panel-toc-list"]',
    );
    const panelScrollEl = list
      ? resolvePanelTocScrollContainer(list, contentScrollRef.current)
      : null;
    const deferPanelScroll = shouldDeferPanelTocScrollIntoView(entryEl, list);
    if (deferPanelScroll) requestPinPanelTocListScrollTop();
    handleInfoPanelTocTap(editor, index, docPos);
    if (deferPanelScroll) {
      if (panelScrollEl) {
        panelScrollEl.scrollTop = 0;
        panelScrollEl.scrollTo?.({ top: 0, left: 0 });
      }
      return;
    }
    scrollPanelTocEntryIntoView(entryEl);
  };

  const contentScrollRef = useRef<HTMLDivElement>(null);
  const tocListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = tocListRef.current;
    if (!list || activeTab !== "toc") return;

    const pinListScrollTop = (event: PointerEvent | MouseEvent) => {
      if (event.button !== 0) return;
      const panelScrollEl = resolvePanelTocScrollContainer(
        list,
        contentScrollRef.current,
      );
      const resolved = panelTocEntryFromPointerY(
        list,
        event.clientY,
        panelScrollEl,
      );
      if (
        !resolved ||
        !shouldDeferPanelTocScrollIntoView(resolved.entry, list)
      ) {
        return;
      }
      event.preventDefault();
      if (panelScrollEl) {
        panelScrollEl.scrollTop = 0;
        panelScrollEl.scrollTo?.({ top: 0, left: 0 });
      }
    };

    const pinAfterPointer = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const panelScrollEl = resolvePanelTocScrollContainer(
        list,
        contentScrollRef.current,
      );
      const resolved = panelTocEntryFromPointerY(
        list,
        event.clientY,
        panelScrollEl,
      );
      if (
        !resolved ||
        !shouldDeferPanelTocScrollIntoView(resolved.entry, list)
      ) {
        return;
      }
      if (panelScrollEl) {
        panelScrollEl.scrollTop = 0;
        panelScrollEl.scrollTo?.({ top: 0, left: 0 });
      }
    };

    list.addEventListener("pointerdown", pinListScrollTop, { capture: true });
    list.addEventListener("pointerup", pinAfterPointer, { capture: true });
    list.addEventListener("click", pinListScrollTop, { capture: true });
    return () => {
      list.removeEventListener("pointerdown", pinListScrollTop, {
        capture: true,
      });
      list.removeEventListener("pointerup", pinAfterPointer, { capture: true });
      list.removeEventListener("click", pinListScrollTop, { capture: true });
    };
  }, [activeTab, editor, toc.length]);

  const activateTocAtClientY = (clientY: number, listEl: HTMLElement) => {
    const resolved = panelTocEntryFromPointerY(
      listEl,
      clientY,
      resolvePanelTocScrollContainer(listEl, contentScrollRef.current),
    );
    if (!resolved) return;
    const { entry, index } = resolved;
    if (index >= toc.length) return;
    activateTocEntry(index, toc[index]?.docPos, entry);
  };

  const handleTocListPointerDownCapture = (event: React.PointerEvent) => {
    if (activeTab !== "toc" || event.button !== 0) return;
    activateTocAtClientY(event.clientY, event.currentTarget as HTMLElement);
  };

  const handleTocListClickCapture = (event: React.MouseEvent) => {
    if (activeTab !== "toc" || event.button !== 0) return;
    activateTocAtClientY(event.clientY, event.currentTarget as HTMLElement);
  };

  const handleTocListTouchEndCapture = (event: React.TouchEvent) => {
    if (activeTab !== "toc") return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    activateTocAtClientY(touch.clientY, event.currentTarget as HTMLElement);
  };

  const tabs: { id: InfoPanelTab; icon: string }[] = [
    { id: "stats", icon: "stats" },
    { id: "toc", icon: "list" },
  ];

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) {
      dragOffsetRef.current = delta;
      setDragOffset(delta);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragOffsetRef.current > DRAG_CLOSE_THRESHOLD) {
      handleClose();
    } else {
      dragOffsetRef.current = 0;
      setDragOffset(0);
    }
    dragStartY.current = null;
  };

  return (
    <>
      {/* Backdrop — below editor-toolbar-layer (55) so format actions stay clickable */}
      <div
        data-testid="stats-panel-backdrop"
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 48,
          backgroundColor: theme.isDark
            ? "rgba(0,0,0,0.45)"
            : "rgba(0,0,0,0.25)",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="info-panel"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 68,
          backgroundColor: theme.isDark
            ? "rgba(28,28,30,0.96)"
            : "rgba(255,255,255,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: theme.isDark
            ? "0 -4px 30px rgba(0,0,0,0.4)"
            : "0 -4px 30px rgba(0,0,0,0.08)",
          height: "60vh",
          maxHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          animation:
            dragOffset === 0 && !isDragging
              ? "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)"
              : undefined,
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging
            ? "none"
            : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Drag handle + header — drag target */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "none", cursor: "grab", flexShrink: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.textTertiary,
                opacity: 0.3,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 20px 10px",
              gap: 8,
              position: "relative",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.colors.text,
                letterSpacing: -0.2,
                flex: 1,
                textAlign: "center",
              }}
            >
              {activeTab === "stats"
                ? t("editor.stats.title")
                : t("editor.toc.title")}
            </span>
            <button
              type="button"
              data-testid="stats-panel-close"
              onClick={handleClose}
              aria-label={t("common.actions.done")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                position: "absolute",
                right: 16,
              }}
            >
              <Icon name="close" size={16} color={theme.colors.textTertiary} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 4,
            padding: "0 40px 12px",
            flexShrink: 0,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-testid={`info-panel-tab-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 0",
                border: "none",
                cursor: "pointer",
                borderRadius: 8,
                backgroundColor:
                  activeTab === tab.id ? theme.colors.surface : "transparent",
                transition: "background-color 0.2s ease",
              }}
            >
              <Icon
                name={tab.icon}
                size={17}
                color={
                  activeTab === tab.id
                    ? theme.colors.accent
                    : theme.colors.textTertiary
                }
              />
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          ref={contentScrollRef}
          data-testid="info-panel-content-scroll"
          style={{
            flex: "1 1 0",
            minHeight: 0,
            display: activeTab === "toc" ? "flex" : "block",
            flexDirection: activeTab === "toc" ? "column" : undefined,
            overflowY: activeTab === "stats" ? "auto" : "hidden",
            padding:
              activeTab === "toc"
                ? "0 20px 0"
                : "0 20px max(20px, env(safe-area-inset-bottom))",
          }}
        >
          {activeTab === "stats" && (
            <div>
              {/* 2x2 grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <StatBox
                  value={wordCount.toLocaleString()}
                  label={t("editor.stats.words")}
                  icon="💬"
                />
                <StatBox
                  value={charCount.toLocaleString()}
                  label={t("editor.stats.characters")}
                  icon="Aa"
                />
                <StatBox
                  value={paragraphCount.toString()}
                  label={t("editor.stats.paragraphs")}
                  icon="¶"
                />
                <StatBox
                  value={`${readingTimeMinutes}m`}
                  label={t("editor.stats.readingTime")}
                  icon="⏱"
                />
              </div>

              {/* Dates */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surface,
                  overflow: "hidden",
                }}
              >
                <DateRow
                  label={t("editor.stats.modified")}
                  value={formatDateTime(note.modifiedAt)}
                />
                <DateRow
                  label={t("editor.stats.created")}
                  value={formatDateTime(note.createdAt)}
                />
              </div>

              {showHideCompletedToggle && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    backgroundColor: theme.colors.surface,
                    overflow: "hidden",
                    padding: "0 14px",
                  }}
                >
                  <SettingToggle
                    label={t("settings.editor.hideCompletedTasks")}
                    checked={hideCompletedTasks}
                    onChange={onHideCompletedTasksChange}
                    testId="hide-completed-tasks-toggle"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "toc" && (
            <div
              ref={tocListRef}
              data-testid="info-panel-toc-list"
              onPointerDownCapture={handleTocListPointerDownCapture}
              onClickCapture={handleTocListClickCapture}
              onTouchEndCapture={handleTocListTouchEndCapture}
              style={{
                flex: "1 1 0",
                minHeight: 0,
                overflowY: "auto",
                overflowAnchor: "none",
                WebkitOverflowScrolling: "touch",
                scrollPaddingBottom: `max(${TOC_LIST_BOTTOM_PADDING_PX}px, env(safe-area-inset-bottom))`,
                paddingBottom: `max(${TOC_LIST_BOTTOM_PADDING_PX}px, env(safe-area-inset-bottom))`,
                boxSizing: "border-box",
              }}
            >
              {toc.length === 0 ? (
                <p
                  style={{
                    color: theme.colors.textTertiary,
                    fontSize: 14,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  {t("editor.toc.empty")}
                </p>
              ) : (
                toc.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    data-testid={`info-panel-toc-entry-${i}`}
                    onClick={(event) => {
                      if (!editor) return;
                      activateTocEntry(i, item.docPos, event.currentTarget);
                    }}
                    onKeyDown={(event) => {
                      if (!editor) return;
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      activateTocEntry(i, item.docPos, event.currentTarget);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 0",
                      paddingLeft: (item.level - 1) * 16,
                      background: "none",
                      border: "none",
                      borderBottom: `1px solid ${theme.colors.borderLight}`,
                      cursor: editor ? "pointer" : "default",
                      touchAction: "manipulation",
                    }}
                  >
                    <span
                      style={{
                        fontSize: item.level === 1 ? 15 : 14,
                        fontWeight: item.level === 1 ? "600" : "400",
                        color: theme.colors.text,
                      }}
                    >
                      {item.text}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatBox({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  const theme = useTheme();
  return (
    <div
      style={{
        padding: "16px 14px",
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}
        >
          {value}
        </span>
        <span style={{ fontSize: 16, color: theme.colors.textTertiary }}>
          {icon}
        </span>
      </div>
      <span style={{ fontSize: 12, color: theme.colors.textTertiary }}>
        {label}
      </span>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: `1px solid ${theme.colors.borderLight}`,
      }}
    >
      <div>
        <div
          style={{ fontSize: 14, fontWeight: "500", color: theme.colors.text }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.colors.textTertiary,
            marginTop: 2,
          }}
        >
          {label}
        </div>
      </div>
      <span style={{ fontSize: 16, color: theme.colors.textTertiary }}>📅</span>
    </div>
  );
}
