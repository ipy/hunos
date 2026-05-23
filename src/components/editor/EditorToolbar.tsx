import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/theme/ThemeContext';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { Icon } from '@/components/common/Icon';
import { SketchPad } from './SketchPad';
import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButton {
  icon: string;
  label: string;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

function toggleMark(editor: Editor, markName: string, toggleCmd: () => boolean) {
  if (editor.isActive(markName)) {
    editor.chain().focus().extendMarkRange(markName).unsetMark(markName).run();
  } else if (editor.state.selection.empty) {
    const { $from } = editor.state.selection;
    const start = $from.start();
    const end = $from.end();
    if (end > start) {
      editor.chain().focus().setTextSelection({ from: start, to: end }).run();
    }
    toggleCmd();
  } else {
    toggleCmd();
  }
}

const FORMAT_ITEMS: ToolbarButton[] = [
  {
    icon: 'bold', label: 'B',
    action: (e) => toggleMark(e, 'bold', () => e.chain().focus().toggleBold().run()),
    isActive: (e) => e.isActive('bold'),
  },
  {
    icon: 'italic', label: 'I',
    action: (e) => toggleMark(e, 'italic', () => e.chain().focus().toggleItalic().run()),
    isActive: (e) => e.isActive('italic'),
  },
  {
    icon: 'underline', label: 'U',
    action: (e) => toggleMark(e, 'underline', () => e.chain().focus().toggleUnderline().run()),
    isActive: (e) => e.isActive('underline'),
  },
  {
    icon: 'strikethrough', label: 'S',
    action: (e) => toggleMark(e, 'strike', () => e.chain().focus().toggleStrike().run()),
    isActive: (e) => e.isActive('strike'),
  },
  {
    icon: 'highlight', label: 'H',
    action: (e) => toggleMark(e, 'highlight', () => e.chain().focus().toggleHighlight().run()),
    isActive: (e) => e.isActive('highlight'),
  },
];

const BLOCK_ITEMS: ToolbarButton[] = [
  { icon: 'heading1', label: 'H1', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e) => e.isActive('heading', { level: 1 }) },
  { icon: 'heading2', label: 'H2', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { icon: 'heading3', label: 'H3', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e) => e.isActive('heading', { level: 3 }) },
  { icon: 'list', label: '•', action: (e) => e.chain().focus().toggleBulletList().run(), isActive: (e) => e.isActive('bulletList') },
  { icon: 'orderedList', label: '1.', action: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
  { icon: 'taskList', label: '☑', action: (e) => e.chain().focus().toggleTaskList().run(), isActive: (e) => e.isActive('taskList') },
  { icon: 'quote', label: '❝', action: (e) => e.chain().focus().toggleBlockquote().run(), isActive: (e) => e.isActive('blockquote') },
  { icon: 'code', label: '</>', action: (e) => e.chain().focus().toggleCodeBlock().run(), isActive: (e) => e.isActive('codeBlock') },
  { icon: 'divider', label: '—', action: (e) => e.chain().focus().setHorizontalRule().run() },
];

function pickImageFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function capturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      try { input.capture = 'environment'; } catch { /* capture not supported */ }
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
    } catch {
      resolve(null);
    }
  });
}

const INSERT_ITEMS_BASE: ToolbarButton[] = [
  {
    icon: 'image', label: '🖼',
    action: async (e) => {
      const src = await pickImageFile();
      if (src) e.chain().focus().setImage({ src }).run();
    },
  },
  {
    icon: 'camera', label: '📷',
    action: async (e) => {
      const src = await capturePhoto();
      if (src) e.chain().focus().setImage({ src }).run();
    },
  },
  {
    icon: 'table', label: '⊞',
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const theme = useTheme();
  const layout = useAdaptiveLayout();
  const [activeTab, setActiveTab] = useState<'format' | 'blocks' | 'insert'>('format');
  const [showSketch, setShowSketch] = useState(false);
  const [, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const touchHandledRef = useRef(false);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setTick(t => t + 1));
    };
    editor.on('transaction', onUpdate);
    return () => {
      editor.off('transaction', onUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor]);

  const handleAction = useCallback((action: (e: Editor) => void) => {
    if (!editor) return;
    action(editor);
    setTick(t => t + 1);
  }, [editor]);

  if (!editor) return null;

  const INSERT_ITEMS: ToolbarButton[] = [
    ...INSERT_ITEMS_BASE,
    {
      icon: 'pencil', label: '✏',
      action: () => setShowSketch(true),
    },
  ];

  const handleSketchSave = (dataUrl: string) => {
    if (editor) editor.chain().focus().setImage({ src: dataUrl }).run();
    setShowSketch(false);
  };

  const isMobile = layout === 'mobile';
  const items = isMobile
    ? (activeTab === 'format' ? FORMAT_ITEMS : activeTab === 'blocks' ? BLOCK_ITEMS : INSERT_ITEMS)
    : [...FORMAT_ITEMS, ...BLOCK_ITEMS, ...INSERT_ITEMS];

  return (
    <>
    {showSketch && (
      <SketchPad
        onSave={handleSketchSave}
        onCancel={() => setShowSketch(false)}
      />
    )}
    <div style={{
      borderTop: `1px solid ${theme.colors.borderLight}`,
      flexShrink: 0,
      backgroundColor: theme.isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {isMobile && (
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          padding: '0 8px',
        }}>
          <button
            onMouseDown={(e) => { e.preventDefault(); setActiveTab('format'); }}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 12, fontWeight: '600',
              color: activeTab === 'format' ? theme.colors.accent : theme.colors.textTertiary,
              borderBottom: activeTab === 'format' ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
              touchAction: 'manipulation',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            Aa
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setActiveTab('blocks'); }}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 12, fontWeight: '600',
              color: activeTab === 'blocks' ? theme.colors.accent : theme.colors.textTertiary,
              borderBottom: activeTab === 'blocks' ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
              touchAction: 'manipulation',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            ¶
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); setActiveTab('insert'); }}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 12, fontWeight: '600',
              color: activeTab === 'insert' ? theme.colors.accent : theme.colors.textTertiary,
              borderBottom: activeTab === 'insert' ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
              touchAction: 'manipulation',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            +
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.commands.blur()}
            style={{
              padding: '8px 12px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 12, fontWeight: '500',
              color: theme.colors.textTertiary,
              touchAction: 'manipulation',
            }}
          >
            ⌨↓
          </button>
        </div>
      )}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        padding: '6px 8px',
        gap: 3,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {items.map((item, idx) => {
          const active = item.isActive?.(editor) ?? false;
          return (
            <button
              key={`${item.icon}-${idx}`}
              onMouseDown={(e) => {
                e.preventDefault();
                if (touchHandledRef.current) { touchHandledRef.current = false; return; }
                handleAction(item.action);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                touchHandledRef.current = true;
                handleAction(item.action);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active ? theme.colors.accentLight : 'transparent',
                touchAction: 'manipulation',
                transition: 'background-color 0.15s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = active ? theme.colors.accentLight : 'transparent';
              }}
            >
              <Icon
                name={item.icon}
                size={17}
                color={active ? theme.colors.accent : theme.colors.textSecondary}
              />
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}
