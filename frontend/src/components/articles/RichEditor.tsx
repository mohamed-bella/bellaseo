'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Link2, Image as ImageIcon,
  List, ListOrdered, Quote, Heading2, Heading3, AlignLeft, AlignCenter,
  AlignRight, Undo, Redo, Code, Minus,
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertLinkRef?: (fn: (anchor: string, url: string) => void) => void;
}

function Btn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${
        active
          ? 'bg-[#FF642D] text-white shadow-sm'
          : 'text-[#6B7280] hover:text-[#1A1D23] hover:bg-[#F3F4F6]'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-[#E5E8EB] mx-0.5 shrink-0" />;
}

export default function RichEditor({ value, onChange, placeholder, onInsertLinkRef }: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, 
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-[#F3F4F6] rounded-xl p-4 font-mono text-sm overflow-x-auto' } },
      }),
      Underline,
      Image.configure({ inline: false, HTMLAttributes: { class: 'rounded-xl shadow-sm max-w-full' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#FF642D] underline decoration-[#FF642D]/40 hover:decoration-[#FF642D]' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing your article…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-base max-w-none min-h-[460px] focus:outline-none px-6 py-5 prose-headings:text-[#1A1D23] prose-headings:font-bold prose-p:text-[#374151] prose-p:leading-relaxed prose-a:text-[#FF642D] prose-strong:text-[#1A1D23]',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const insertLink = useCallback((anchor: string, url: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`<a href="${url}">${anchor}</a>`).run();
  }, [editor]);

  useEffect(() => {
    if (onInsertLinkRef) onInsertLinkRef(insertLink);
  }, [insertLink, onInsertLinkRef]);

  const addImage = () => {
    const url = window.prompt('Image URL:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const prev = editor?.getAttributes('link').href || '';
    const url = window.prompt('URL:', prev);
    if (url === null) return;
    if (url === '') editor?.chain().focus().unsetLink().run();
    else editor?.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col border border-[#E5E8EB] rounded-2xl overflow-hidden bg-white h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#E5E8EB] bg-[#FAFAFA] sticky top-0 z-10 shrink-0">
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-3.5 h-3.5" /></Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="w-3.5 h-3.5" /></Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code className="w-3.5 h-3.5" /></Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-3.5 h-3.5" /></Btn>
        <Sep />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Left"><AlignLeft className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Right"><AlignRight className="w-3.5 h-3.5" /></Btn>
        <Sep />
        <Btn onClick={setLink} active={editor.isActive('link')} title="Link"><Link2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={addImage} title="Image"><ImageIcon className="w-3.5 h-3.5" /></Btn>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
