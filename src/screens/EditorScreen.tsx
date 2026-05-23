import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { useNoteStore } from '@/store/noteStore';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Icon } from '@/components/common/Icon';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { BacklinksPanel } from '@/components/backlinks/BacklinksPanel';
import { InfoPanel } from '@/components/editor/InfoPanel';
import { exportAndDownload } from '@/utils/export';
import { resolveTextFontFamily } from '@/utils/fonts';
import type { Editor } from '@tiptap/react';
import type { LayoutMode } from '@/hooks/useAdaptiveLayout';

interface EditorScreenProps {
  layout?: LayoutMode;
}

export function EditorScreen({ layout = 'mobile' }: EditorScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { activeNoteId, notes, saveNoteContent, saveNoteTitle, pinNote, trashNote, archiveNote, restoreNote, permanentlyDelete } = useNoteStore();
  const { goBack, showToast } = useUIStore();
  const settings = useSettingsStore();
  const [showActions, setShowActions] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const note = notes.find(n => n.id === activeNoteId);
  const showBackButton = layout === 'mobile';
  const [titleValue, setTitleValue] = useState('');
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const prevNoteId = useRef<string | null>(null);
  useEffect(() => {
    if (note?.id !== prevNoteId.current) {
      prevNoteId.current = note?.id ?? null;
      setTitleValue(note?.title ?? '');
    }
  }, [note?.id, note?.title]);

  const handleTitleChange = (newTitle: string) => {
    setTitleValue(newTitle);
    if (!activeNoteId) return;
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      saveNoteTitle(activeNoteId, newTitle);
    }, 400);
  };

  const handleContentChange = useCallback((json: string) => {
    if (!activeNoteId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNoteContent(activeNoteId, json);
    }, 500);
  }, [activeNoteId, saveNoteContent]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  const handlePin = () => {
    if (!note) return;
    pinNote(note.id, !note.isPinned);
    showToast(note.isPinned ? t('notes.actions.unpin') : t('notes.actions.pin'));
    setShowActions(false);
  };

  const handleArchive = () => {
    if (!note) return;
    archiveNote(note.id);
    showToast(t('notes.actions.archive'));
    if (layout === 'mobile') goBack();
  };

  const handleTrash = () => {
    if (!note) return;
    trashNote(note.id);
    showToast(t('notes.actions.trash'));
    if (layout === 'mobile') goBack();
  };

  if (!note) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: theme.colors.background,
      }}>
        <div style={{ textAlign: 'center', padding: 32, animation: 'fadeIn 0.4s ease' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            backgroundColor: theme.colors.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon name="note" size={32} color={theme.colors.textTertiary} />
          </div>
          <p style={{ color: theme.colors.textTertiary, fontSize: 15, marginTop: 0 }}>
            {t('notes.empty')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.colors.background,
      position: 'relative',
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        gap: 2,
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        flexShrink: 0,
        minHeight: 44,
      }}>
        {showBackButton && (
          <button
            onClick={goBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: theme.radius.full, display: 'flex',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icon name="back" size={20} color={theme.colors.accent} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowStats(!showStats)}
          title="Statistics"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 7, borderRadius: theme.radius.full, display: 'flex',
            backgroundColor: showStats ? theme.colors.accentLight : 'transparent',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => { if (!showStats) e.currentTarget.style.backgroundColor = theme.colors.surfaceHover; }}
          onMouseLeave={(e) => { if (!showStats) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <Icon name="stats" size={17} color={showStats ? theme.colors.accent : theme.colors.textTertiary} />
        </button>
        <button
          onClick={() => setShowActions(!showActions)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 7, borderRadius: theme.radius.full, display: 'flex',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Icon name="more" size={17} color={theme.colors.textSecondary} />
        </button>
      </header>

      {/* Action menu with backdrop */}
      {showActions && (
        <>
          <div
            onClick={() => setShowActions(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
            }}
          />
          <div style={{
            position: 'absolute', top: 50, right: 12, zIndex: 50,
            backgroundColor: theme.isDark ? 'rgba(50,50,52,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 14,
            boxShadow: theme.isDark
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)'
              : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
            padding: '5px 0',
            minWidth: 200,
            animation: 'menuReveal 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
            transformOrigin: 'top right',
          }}>
            {(note.status === 'trashed' ? [
              { label: t('notes.actions.restore'), icon: 'archive', danger: false, action: () => { restoreNote(note.id); setShowActions(false); if (layout === 'mobile') goBack(); } },
              { label: t('notes.actions.deletePermanently'), icon: 'trash', danger: true, action: () => { permanentlyDelete(note.id); setShowActions(false); if (layout === 'mobile') goBack(); } },
            ] : [
              { label: note.isPinned ? t('notes.actions.unpin') : t('notes.actions.pin'), icon: 'pin', danger: false, action: handlePin },
              { label: t('notes.actions.archive'), icon: 'archive', danger: false, action: handleArchive },
              { label: t('notes.actions.trash'), icon: 'trash', danger: true, action: handleTrash },
              { label: t('export.markdown'), icon: 'export', danger: false, action: () => { exportAndDownload(note, 'markdown'); setShowActions(false); } },
              { label: t('export.html'), icon: 'export', danger: false, action: () => { exportAndDownload(note, 'html'); setShowActions(false); } },
            ]).map((item, idx, arr) => (
              <React.Fragment key={item.label}>
                <button
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: item.danger ? theme.colors.danger : theme.colors.text,
                    textAlign: 'left',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icon name={item.icon} size={16} color={item.danger ? theme.colors.danger : theme.colors.textSecondary} />
                  {item.label}
                </button>
                {idx === 2 && arr.length > 3 && (
                  <div style={{ height: 1, backgroundColor: theme.colors.borderLight, margin: '4px 12px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {showStats && <InfoPanel note={note} onClose={() => setShowStats(false)} />}

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
        onClick={() => showActions && setShowActions(false)}
      >
        <div style={{ padding: '16px 24px 0', maxWidth: `${settings.lineWidth}em`, margin: '0 auto' }}>
          <input
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('editor.titlePlaceholder')}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: settings.fontSize * 1.6,
              fontWeight: 700,
              fontFamily: resolveTextFontFamily(settings.headingsFont),
              color: theme.colors.text,
              backgroundColor: 'transparent',
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
        <BacklinksPanel noteId={note.id} />
      </div>

      <EditorToolbar editor={editorInstance} />
    </div>
  );
}
