import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor>['editor'] }) {
  if (!editor) return null;

  const btn =
    'rounded p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100';
  const active = 'bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-slate-100';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-600 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${editor.isActive('bold') ? active : ''}`}
        title="Bold"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${editor.isActive('italic') ? active : ''}`}
        title="Italic"
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${btn} ${editor.isActive('strike') ? active : ''}`}
        title="Strikethrough"
      >
        <span className="line-through">S</span>
      </button>
      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn} ${editor.isActive('heading', { level: 2 }) ? active : ''}`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${btn} ${editor.isActive('heading', { level: 3 }) ? active : ''}`}
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`${btn} ${editor.isActive('paragraph') ? active : ''}`}
        title="Paragraph"
      >
        P
      </button>
      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive('bulletList') ? active : ''}`}
        title="Bullet list"
      >
        •
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${editor.isActive('orderedList') ? active : ''}`}
        title="Numbered list"
      >
        1.
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${btn} ${editor.isActive('blockquote') ? active : ''}`}
        title="Quote"
      >
        “
      </button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something…',
  minHeight = '12rem',
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-32 px-3 py-2 focus:outline-none',
      },
    },
  });

  // Sync when value loads from API (e.g. settings fetch) and editor is still empty
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const empty = !current || current === '<p></p>' || current === '<p></p>\n';
    if (empty && value && value.trim() !== '') {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 ${className}`}
      style={{ minHeight }}
    >
      <Toolbar editor={editor} />
      <div className="bg-white dark:bg-slate-800 [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:text-slate-900 [&_.ProseMirror]:dark:text-slate-100 [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
