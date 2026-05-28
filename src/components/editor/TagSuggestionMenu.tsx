import React, { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import type { Tag } from '@/types/graph';

export type TagSuggestionItem =
  | { type: 'tag'; tag: Tag }
  | { type: 'create'; query: string };

interface TagSuggestionMenuProps {
  items: TagSuggestionItem[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  onSelect: (index: number) => void;
  onHighlight: (index: number) => void;
}

const ROW_MIN_HEIGHT = 44;
const MENU_MAX_HEIGHT = 320;

export function TagSuggestionMenu({
  items,
  selectedIndex,
  clientRect,
  onSelect,
  onHighlight,
}: TagSuggestionMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !clientRect) return;

    const rect = clientRect();
    if (!rect) return;

    const margin = 8;
    let top = rect.bottom + margin;
    let left = rect.left;

    const menuRect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + menuRect.width > vw - margin) {
      left = Math.max(margin, vw - menuRect.width - margin);
    }
    if (left < margin) left = margin;

    if (top + menuRect.height > vh - margin) {
      const above = rect.top - menuRect.height - margin;
      top = above >= margin ? above : Math.max(margin, vh - menuRect.height - margin);
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, [clientRect, items.length, selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label={t('editor.tagAutocomplete.menuLabel')}
      style={{
        position: 'fixed',
        zIndex: 60,
        minWidth: 220,
        maxWidth: 'min(360px, calc(100vw - 16px))',
        maxHeight: MENU_MAX_HEIGHT,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: theme.isDark ? 'rgba(50,50,52,0.95)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 14,
        boxShadow: theme.isDark
          ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)'
          : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
        padding: '5px 0',
        animation: 'menuReveal 0.15s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const label =
          item.type === 'tag'
            ? `#${item.tag.name}`
            : t('editor.tagAutocomplete.create', { name: item.query });

        return (
          <button
            key={item.type === 'tag' ? item.tag.id : `create-${item.query}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(index);
            }}
            onMouseEnter={() => onHighlight(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: ROW_MIN_HEIGHT,
              padding: '10px 16px',
              background: isSelected ? theme.colors.surfaceHover : 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: item.type === 'create' ? theme.colors.accent : theme.colors.text,
              textAlign: 'left',
              fontWeight: item.type === 'create' ? 500 : 400,
              transition: 'background-color 0.12s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
