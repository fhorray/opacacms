import { Editor } from 'https://esm.sh/@tiptap/core';
import { getExtensions } from './extensions.js';
import { setupToolbar } from './toolbar.js';

const editorInstances = new Map();

export function initializeEditor(container) {
  const fieldName = container.getAttribute('data-field-name');
  if (!fieldName) return;

  const editorEl = container.querySelector('.tiptap-editor');
  const toolbarEl = container.querySelector('.tiptap-toolbar');
  const textarea = container.querySelector(`textarea[name="${fieldName}"]`);

  if (!editorEl || !textarea) return;

  // If already initialized, destroy it first
  if (editorInstances.has(fieldName)) {
    try {
      editorInstances.get(fieldName)?.destroy();
    } catch (e) {}
    editorInstances.delete(fieldName);
  }

  const editor = new Editor({
    element: editorEl,
    extensions: getExtensions(),
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = editor.getHTML();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    },
  });

  if (toolbarEl) {
    setupToolbar(editor, toolbarEl);
  }

  editorInstances.set(fieldName, editor);
}

export function initializeAllTiptap() {
  const containers = document.querySelectorAll('.tiptap-editor-container');
  containers.forEach(container => {
    const fieldName = container.getAttribute('data-field-name');
    if (fieldName && !editorInstances.has(fieldName)) {
      initializeEditor(container);
    }
  });

  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  }
}

window.initializeAllTiptap = initializeAllTiptap;
window.editorInstances = editorInstances;

document.addEventListener('DOMContentLoaded', () => {
  initializeAllTiptap();
});
