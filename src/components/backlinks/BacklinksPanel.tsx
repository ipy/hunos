import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { dedupeBacklinkResults, graphEngine } from "@/graph/graphEngine";
import { useNoteStore } from "@/store/noteStore";
import { Icon } from "@/components/common/Icon";
import type { BacklinkResult } from "@/types/graph";
import { formatBacklinkSnippet } from "./formatBacklinkSnippet";

export const BACKLINKS_PANEL_TESTID = "backlinks-panel";
export const BACKLINKS_PANEL_TOGGLE_TESTID = "backlinks-panel-toggle";
export const BACKLINKS_OUTGOING_SECTION_TESTID = "backlinks-outgoing-section";
export const BACKLINKS_INCOMING_SECTION_TESTID = "backlinks-incoming-section";

/** Per-row test id — linkId is stable (source + position) even when rows share noteId. */
export function backlinksItemTestId(linkId: string): string {
  return `backlinks-item-${linkId}`;
}

/** Context/snippet line inside a backlink row — stable for e2e text reads. */
export function backlinksItemSnippetTestId(linkId: string): string {
  return `backlinks-snippet-${linkId}`;
}

/** Stable React key when linkId alone may duplicate across wiki-link rows. */
export function backlinksRowKey(
  section: "incoming" | "outgoing",
  bl: BacklinkResult,
  index: number,
): string {
  return `${section}:${bl.linkId}:${bl.noteId}:${index}`;
}

/** @internal Ensures React list keys stay unique across incoming and outgoing sections. */
export function assertUniqueBacklinkPanelKeys(
  incoming: BacklinkResult[],
  outgoing: BacklinkResult[],
): void {
  const keys = new Set<string>();
  const add = (section: "incoming" | "outgoing", rows: BacklinkResult[]) => {
    rows.forEach((row, index) => {
      const key = backlinksRowKey(section, row, index);
      if (keys.has(key)) {
        throw new Error(`duplicate backlink row key: ${key}`);
      }
      keys.add(key);
    });
  };
  add("incoming", incoming);
  add("outgoing", outgoing);
}

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setActiveNote, notes } = useNoteStore();
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [outgoing, setOutgoing] = useState<BacklinkResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const noteLinkRevision = useMemo(
    () => notes.find((n) => n.id === noteId)?.modifiedAt ?? 0,
    [notes, noteId],
  );
  const incomingRows = useMemo(
    () => dedupeBacklinkResults(backlinks),
    [backlinks],
  );
  const outgoingRows = useMemo(
    () => dedupeBacklinkResults(outgoing),
    [outgoing],
  );

  useEffect(() => {
    let cancelled = false;
    setBacklinks([]);
    setOutgoing([]);

    void Promise.all([
      graphEngine.getBacklinks(noteId),
      graphEngine.getOutgoingLinks(noteId),
    ]).then(([incoming, outgoing]) => {
      if (cancelled) return;
      setBacklinks(dedupeBacklinkResults(incoming));
      setOutgoing(dedupeBacklinkResults(outgoing));
    });

    return () => {
      cancelled = true;
    };
  }, [noteId, noteLinkRevision]);

  if (incomingRows.length === 0 && outgoingRows.length === 0) return null;

  assertUniqueBacklinkPanelKeys(incomingRows, outgoingRows);

  const renderLink = (
    section: "incoming" | "outgoing",
    bl: BacklinkResult,
    index: number,
  ) => (
    <div
      key={backlinksRowKey(section, bl, index)}
      data-testid={backlinksItemTestId(bl.linkId)}
      data-link-key={bl.linkId}
      data-note-title={bl.noteTitle}
      onClick={() => setActiveNote(bl.noteId)}
      style={{
        padding: "10px 12px",
        borderRadius: theme.radius.md,
        cursor: "pointer",
        marginBottom: 4,
        backgroundColor: theme.colors.surface,
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = theme.colors.surfaceHover)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = theme.colors.surface)
      }
    >
      <div
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: theme.colors.text,
          marginBottom: bl.context ? 4 : 0,
        }}
      >
        {bl.noteTitle || t("notes.untitled", { defaultValue: "Untitled" })}
      </div>
      {bl.context && (
        <div
          data-testid={backlinksItemSnippetTestId(bl.linkId)}
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.textTertiary,
            lineHeight: 1.4,
          }}
        >
          {formatBacklinkSnippet(bl.context)}
        </div>
      )}
    </div>
  );

  return (
    <div
      data-testid={BACKLINKS_PANEL_TESTID}
      style={{
        margin: "16px 20px",
        borderTop: `1px solid ${theme.colors.borderLight}`,
        paddingTop: 16,
      }}
    >
      <button
        data-testid={BACKLINKS_PANEL_TOGGLE_TESTID}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "flex",
            transition: "transform 0.2s ease",
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        >
          <Icon
            name="chevronDown"
            size={12}
            color={theme.colors.textTertiary}
          />
        </span>
        <span
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {t("editor.backlinks.title", { defaultValue: "Links" })} (
          {incomingRows.length + outgoingRows.length})
        </span>
      </button>

      {isExpanded && (
        <>
          {outgoingRows.length > 0 && (
            <div
              data-testid={BACKLINKS_OUTGOING_SECTION_TESTID}
              style={{ marginBottom: 12 }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 6,
                }}
              >
                {t("editor.backlinks.outgoing", { defaultValue: "Links to" })} (
                {outgoingRows.length})
              </div>
              {outgoingRows.map((bl, index) =>
                renderLink("outgoing", bl, index),
              )}
            </div>
          )}
          {incomingRows.length > 0 && (
            <div data-testid={BACKLINKS_INCOMING_SECTION_TESTID}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 6,
                }}
              >
                {t("editor.backlinks.incoming", {
                  defaultValue: "Linked from",
                })}{" "}
                ({incomingRows.length})
              </div>
              {incomingRows.map((bl, index) =>
                renderLink("incoming", bl, index),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
