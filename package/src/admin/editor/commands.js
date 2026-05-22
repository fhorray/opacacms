export const commands = {
  bold: (editor) => editor.chain().focus().toggleBold().run(),
  italic: (editor) => editor.chain().focus().toggleItalic().run(),
  strike: (editor) => editor.chain().focus().toggleStrike().run(),
  h1: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  h2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  h3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
  blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
  codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  undo: (editor) => editor.chain().focus().undo().run(),
  redo: (editor) => editor.chain().focus().redo().run(),
};
