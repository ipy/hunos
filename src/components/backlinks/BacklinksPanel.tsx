import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { graphEngine } from '@/graph/graphEngine';
import { useNoteStore } from '@/store/noteStore';
import { Icon } from '@/components/common/Icon';
import type { BacklinkResult } from '@/types/graph';

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setActiveNote, notes } = useNoteStore();
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [outgoing, setOutgoing] = useState<BacklinkResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    graphEngine.getBacklinks(noteId).then(setBacklinks);
    graphEngine.getOutgoingLinks(noteId).then(setOutgoing);
  }, [noteId, notes]);

  if (backlinks.length === 0 && outgoing.length === 0) return null;

  const renderLink = (bl: BacklinkResult) => (
    <div
      key={bl.noteId}
      onClick={() => setActiveNote(bl.noteId)}
      style={{
        padding: '10px 12px',
        borderRadius: theme.radius.md,
        cursor: 'pointer',
        marginBottom: 4,
        backgroundColor: theme.colors.surface,
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
    >
      <div style={{
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
        marginBottom: bl.context ? 4 : 0,
      }}>
        {bl.noteTitle || t('notes.untitled', { defaultValue: 'Untitled' })}
      </div>
      {bl.context && (
        <div style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.textTertiary,
          lineHeight: 1.4,
        }}>
          {bl.context}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      margin: '16px 20px',
      borderTop: `1px solid ${theme.colors.borderLight}`,
      paddingTop: 16,
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: 12,
        }}
      >
        <span style={{
          display: 'flex',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}>
          <Icon name="chevronDown" size={12} color={theme.colors.textTertiary} />
        </span>
        <span style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {t('editor.backlinks.title', { defaultValue: 'Links' })} ({backlinks.length + outgoing.length})
        </span>
      </button>

      {isExpanded && (
        <>
          {outgoing.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary,
                textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
              }}>
                {t('editor.backlinks.outgoing', { defaultValue: 'Links to' })} ({outgoing.length})
              </div>
              {outgoing.map(renderLink)}
            </div>
          )}
          {backlinks.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: '600', color: theme.colors.textTertiary,
                textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
              }}>
                {t('editor.backlinks.incoming', { defaultValue: 'Linked from' })} ({backlinks.length})
              </div>
              {backlinks.map(renderLink)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
