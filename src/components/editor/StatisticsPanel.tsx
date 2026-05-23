import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/common/Icon';
import type { Note } from '@/types/note';

interface StatisticsPanelProps {
  note: Note;
  onClose: () => void;
}

export function StatisticsPanel({ note, onClose }: StatisticsPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const charCount = note.contentPlain.length;
  const charCountNoSpaces = note.contentPlain.replace(/\s/g, '').length;
  const wordCount = note.wordCount;
  const paragraphCount = note.contentPlain.split(/\n\s*\n/).filter(Boolean).length || 1;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const stats = [
    { label: t('editor.stats.words'), value: wordCount },
    { label: t('editor.stats.characters'), value: charCount },
    { label: t('editor.stats.charsNoSpaces'), value: charCountNoSpaces },
    { label: t('editor.stats.paragraphs'), value: paragraphCount },
    { label: t('editor.stats.readingTime'), value: `${readingTime} min` },
    { label: t('editor.stats.created'), value: new Date(note.createdAt).toLocaleDateString() },
    { label: t('editor.stats.modified'), value: new Date(note.modifiedAt).toLocaleDateString() },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 48,
      right: 8,
      zIndex: 50,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      boxShadow: `0 4px 20px ${theme.colors.shadow}`,
      border: `1px solid ${theme.colors.border}`,
      padding: '12px 0',
      minWidth: 220,
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px 10px',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
      }}>
        <span style={{
          fontSize: theme.fontSize.sm,
          fontWeight: '600',
          color: theme.colors.text,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {t('editor.stats.title')}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex',
          }}
        >
          <Icon name="close" size={14} color={theme.colors.textTertiary} />
        </button>
      </div>
      {stats.map(stat => (
        <div key={stat.label} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
        }}>
          <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
            {stat.label}
          </span>
          <span style={{ fontSize: theme.fontSize.sm, fontWeight: '500', color: theme.colors.text }}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
