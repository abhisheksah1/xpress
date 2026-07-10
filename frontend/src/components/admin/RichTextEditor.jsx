import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Node, mergeAttributes } from '@tiptap/core';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const ActionButton = Node.create({
  name: 'actionButton',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      href: { default: '/shop' },
      label: {
        default: 'Shop now',
        parseHTML: (el) => el.textContent?.trim() || 'Shop now',
        renderHTML: () => ({}),
      },
      variant: { default: 'primary' },
    };
  },
  parseHTML() {
    return [{ tag: 'a[data-cms-btn]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes.variant || 'primary';
    const cls =
      variant === 'secondary'
        ? 'cms-btn cms-btn-secondary'
        : 'cms-btn cms-btn-primary';
    const { label, ...rest } = HTMLAttributes;
    return [
      'a',
      mergeAttributes(rest, {
        'data-cms-btn': 'true',
        class: cls,
        href: HTMLAttributes.href || '/shop',
      }),
      label || 'Shop now',
    ];
  },
});

function ToolbarBtn({ active, disabled, onClick, title, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-semibold border transition-colors disabled:opacity-30 ${
        active
          ? 'bg-violet-100 border-violet-300 text-violet-900'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" aria-hidden />;
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start writing…',
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'cms-link' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'cms-rich-image' },
        allowBase64: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      ActionButton,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'cms-rich-editor prose prose-sm sm:prose-base max-w-none min-h-[220px] px-3 py-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor || value == null) return;
    const current = editor.getHTML();
    // Avoid resetting caret while typing the same document
    if (value !== current && !editor.isFocused) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const insertImageFromUrl = () => {
    const url = window.prompt('Image URL');
    if (!url?.trim()) return;
    const alt = window.prompt('Image alt text', '') || '';
    editor.chain().focus().setImage({ src: url.trim(), alt }).run();
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await adminApi.uploadImage(file, {
        category: 'cms',
        sourceContext: 'rich-text',
      });
      const url = data.data?.url;
      if (!url) throw new Error('No URL returned');
      const alt = window.prompt('Image alt text', file.name.replace(/\.[^.]+$/, '')) || '';
      editor.chain().focus().setImage({ src: url, alt }).run();
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const insertButton = () => {
    const label = window.prompt('Button text', 'Shop now');
    if (label === null) return;
    const href = window.prompt('Button link URL', '/shop');
    if (href === null) return;
    const variant = window.confirm('OK = primary button, Cancel = secondary/outline')
      ? 'primary'
      : 'secondary';
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'actionButton',
        attrs: { label: label.trim() || 'Shop now', href: href.trim() || '/shop', variant },
      })
      .run();
  };

  const insertTable = () => {
    const rows = Math.min(10, Math.max(1, Number(tableRows) || 3));
    const cols = Math.min(10, Math.max(1, Number(tableCols) || 3));
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  const toggleHtml = () => {
    if (showHtml) {
      editor.commands.setContent(htmlDraft || '', false);
      onChange?.(editor.getHTML());
      setShowHtml(false);
    } else {
      setHtmlDraft(editor.getHTML());
      setShowHtml(true);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarBtn>

        <Divider />

        {[1, 2, 3, 4, 5, 6].map((level) => (
          <ToolbarBtn
            key={level}
            title={`Heading ${level}`}
            active={editor.isActive('heading', { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </ToolbarBtn>
        ))}
        <ToolbarBtn title="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
          P
        </ToolbarBtn>

        <Divider />

        <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-1" title="Text colour">
          <span>A</span>
          <input
            type="color"
            className="w-6 h-6 p-0 border border-gray-200 rounded cursor-pointer bg-white"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-1" title="Highlight">
          <span>▮</span>
          <input
            type="color"
            className="w-6 h-6 p-0 border border-gray-200 rounded cursor-pointer bg-white"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>
        <ToolbarBtn title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          Tx
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Add link" active={editor.isActive('link')} onClick={setLink}>
          🔗
        </ToolbarBtn>
        <ToolbarBtn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
          ⛓
        </ToolbarBtn>
        <ToolbarBtn title="Insert image from URL" onClick={insertImageFromUrl}>
          🖼
        </ToolbarBtn>
        <ToolbarBtn title="Upload image" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? '…' : '⬆🖼'}
        </ToolbarBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => uploadImage(e.target.files?.[0])}
        />
        <ToolbarBtn title="Action button with link" onClick={insertButton}>
          CTA
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          •≡
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          ⬅
        </ToolbarBtn>
        <ToolbarBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          ↔
        </ToolbarBtn>
        <ToolbarBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          ➡
        </ToolbarBtn>
        <ToolbarBtn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          ☰
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          “”
        </ToolbarBtn>
        <ToolbarBtn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          {'</>'}
        </ToolbarBtn>
        <ToolbarBtn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          ↶
        </ToolbarBtn>
        <ToolbarBtn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          ↷
        </ToolbarBtn>
        <ToolbarBtn title={showHtml ? 'Apply HTML' : 'Edit HTML source'} active={showHtml} onClick={toggleHtml}>
          HTML
        </ToolbarBtn>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-gray-100 bg-white">
        <span className="text-[10px] font-semibold uppercase text-gray-400">Table</span>
        <input
          type="number"
          min={1}
          max={10}
          className="w-12 input-field py-1 text-xs"
          value={tableRows}
          onChange={(e) => setTableRows(e.target.value)}
          title="Rows"
        />
        <span className="text-xs text-gray-400">×</span>
        <input
          type="number"
          min={1}
          max={10}
          className="w-12 input-field py-1 text-xs"
          value={tableCols}
          onChange={(e) => setTableCols(e.target.value)}
          title="Columns"
        />
        <ToolbarBtn title="Insert table" onClick={insertTable}>
          + Table
        </ToolbarBtn>
      </div>

      {showHtml ? (
        <textarea
          className="w-full min-h-[220px] p-3 font-mono text-xs border-0 focus:outline-none focus:ring-0"
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
