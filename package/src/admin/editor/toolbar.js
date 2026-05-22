import { commands } from './commands.js';

export function setupToolbar(editor, toolbarEl) {
  const buttons = toolbarEl.querySelectorAll('button[data-action]');
  
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const action = button.getAttribute('data-action');
      if (action && action in commands) {
        commands[action](editor);
      }
    });
  });

  const updateActiveStates = () => {
    buttons.forEach(button => {
      const action = button.getAttribute('data-action');
      if (!action) return;

      let isActive = false;
      if (action === 'bold') isActive = editor.isActive('bold');
      else if (action === 'italic') isActive = editor.isActive('italic');
      else if (action === 'strike') isActive = editor.isActive('strike');
      else if (action === 'h1') isActive = editor.isActive('heading', { level: 1 });
      else if (action === 'h2') isActive = editor.isActive('heading', { level: 2 });
      else if (action === 'h3') isActive = editor.isActive('heading', { level: 3 });
      else if (action === 'bulletList') isActive = editor.isActive('bulletList');
      else if (action === 'orderedList') isActive = editor.isActive('orderedList');
      else if (action === 'blockquote') isActive = editor.isActive('blockquote');
      else if (action === 'codeBlock') isActive = editor.isActive('codeBlock');

      if (isActive) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  };

  editor.on('selectionUpdate', updateActiveStates);
  editor.on('transaction', updateActiveStates);

  // Initial update
  updateActiveStates();
}
