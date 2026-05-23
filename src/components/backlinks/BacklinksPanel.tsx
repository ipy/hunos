import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { graphEngine } from '@/graph/graphEngine';
import { useNoteStore } from '@/store/noteStore';
import { useUIStore } from '@/store/uiStore';
import { Icon } from '@/components/common/Icon';
import type { BacklinkResult } from '@/types/graph';

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setActiveNote } = useNoteStore();
  const { navigate } = useUIStore();
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    graphEngine.getBacklinks(noteId).then(setBacklinks);
  }, [noteId]);

  if (backlinks.length === 0) return null;

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
          <Icon
            name="chevronDown"
            size={12}
            color={theme.colors.textTertiary}
          />
        </span>
        <span style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {t('editor.backlinks.title')} ({backlinks.length})
        </span>
      </button>

      {isExpanded && backlinks.map((bl) => (
        <div
          key={bl.noteId}
          onClick={() => {
            setActiveNote(bl.noteId);
            navigate('editor');
          }}
          style={{
            padding: '10px 12px',
            borderRadius: theme.radius.md,
            cursor: 'pointer',
            marginBottom: 4,
            backgroundColor: theme.colors.surface,
            transition: 'background-color 0.15s ease, transform 0.1s ease',
            animation: 'fadeIn 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.surface}
        >
          <div style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: 4,
          }}>
            {bl.noteTitle}
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
      ))}
    </div>
  );
}
