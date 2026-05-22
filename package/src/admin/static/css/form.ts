// Form component styling for OpacaCMS Admin UI


export const FORM_CSS = `
/* Form Layout & Fields */
.admin-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-secondary);
}

.form-group label.required::after {
  content: " *";
  color: var(--text-error);
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="email"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group select,
.form-group textarea {
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-primary);
  padding: 10px var(--space-md);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  width: 100%;
  box-shadow: none;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.form-group textarea {
  min-height: 120px;
  resize: vertical;
}

/* Custom Checkbox/Switch Style */
.form-group.checkbox-group {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-lg);
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  gap: var(--space-md);
  margin: 0;
  transition: all 0.15s ease-in-out;
}

.form-group.checkbox-group:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.03);
}

.form-group.checkbox-group label {
  cursor: pointer;
  margin: 0;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group.checkbox-group input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 38px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  border-radius: 99px;
  position: relative;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease-in-out;
}

.form-group.checkbox-group input[type="checkbox"]:checked {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

.form-group.checkbox-group input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #fff;
  transition: all 0.2s ease-in-out;
}

.form-group.checkbox-group input[type="checkbox"]:checked::after {
  transform: translateX(18px);
}

.field-error {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-error);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-lg);
  padding-top: var(--space-2xl);
  border-top: 1px solid var(--border-color);
}

/* Accordions and Groups */
.group-fieldset {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-xl);
  background-color: var(--bg-main);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.group-fieldset legend {
  font-weight: 600;
  padding: 0 var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  text-transform: none;
  letter-spacing: normal;
}

.accordion-details {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--bg-main);
}

.accordion-summary {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  padding: var(--space-md) var(--space-lg);
  cursor: pointer;
  user-select: none;
  outline: none;
  border-bottom: 1px solid transparent;
  transition: all 0.15s ease-in-out;
}

.accordion-summary:hover {
  background-color: var(--bg-sidebar);
}

.accordion-details[open] .accordion-summary {
  border-bottom-color: var(--border-color);
}

.accordion-content {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* TipTap Editor Styles */
.tiptap-editor-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--bg-input);
  overflow: hidden;
  transition: border-color 0.15s ease-in-out;
}

.tiptap-editor-container:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.tiptap-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs);
  background-color: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
}

.tiptap-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  padding: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease-in-out;
  width: 28px;
  height: 28px;
}

.tiptap-btn svg {
  width: 14px;
  height: 14px;
  stroke-width: 2px;
}

.tiptap-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.tiptap-btn.active {
  background-color: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--accent-color);
}

.tiptap-divider {
  width: 1px;
  height: 16px;
  background-color: var(--border-color);
  margin: 0 var(--space-xs);
}

.tiptap-editor {
  max-height: 400px;
  overflow-y: auto;
  color: var(--text-primary);
  outline: none;
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  line-height: 1.6;
}

.tiptap-editor .ProseMirror {
  min-height: 180px;
  padding: var(--space-md);
  outline: none;
}

.tiptap-editor p {
  margin-top: 0;
  margin-bottom: var(--space-md);
}

.tiptap-editor h1, 
.tiptap-editor h2, 
.tiptap-editor h3 {
  margin-top: var(--space-md);
  margin-bottom: var(--space-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.tiptap-editor ul, 
.tiptap-editor ol {
  margin-top: 0;
  margin-bottom: var(--space-md);
  padding-left: var(--space-xl);
}

.tiptap-editor blockquote {
  border-left: 3px solid var(--accent-color);
  margin: 0 0 var(--space-md) 0;
  padding-left: var(--space-md);
  color: var(--text-secondary);
  font-style: italic;
}

.tiptap-editor code {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.9em;
  padding: 2px 4px;
}

.tiptap-editor pre {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius);
  padding: var(--space-md);
  overflow-x: auto;
  margin: 0 0 var(--space-md) 0;
}

.tiptap-editor pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

/* Modern Split-screen Form Layout */
.form-container {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  max-width: 1200px !important;
  width: 100%;
}

.form-layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xl);
  margin-bottom: var(--space-xl);
}

@media (min-width: 1024px) {
  .form-layout-grid.has-sidebar {
    grid-template-columns: 2.5fr 1.5fr;
    align-items: start;
  }
}

.form-main-panel,
.form-sidebar-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-sidebar-panel .form-card {
  padding: var(--space-xl);
}

.form-section-title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
}

.form-section-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-color);
  width: 100%;
}

/* Row Container Styling */
.form-row-container {
  display: flex;
  gap: var(--space-lg);
  flex-wrap: wrap;
  width: 100%;
}

.form-row-item {
  flex: 1 1 0px;
  min-width: 200px;
}

/* Tabs Container Styling */
.tabs-container {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--bg-card);
  overflow: hidden;
  margin-bottom: var(--space-lg);
}

.tabs-header {
  display: flex;
  background-color: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
  gap: 2px;
  padding: 4px 4px 0 4px;
}

.tab-btn {
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  color: var(--text-secondary);
  padding: 8px 16px;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all 0.15s ease-in-out;
}

.tab-btn:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: var(--accent-color);
  background-color: var(--bg-card);
  border-color: var(--border-color);
  border-bottom-color: var(--bg-card);
  margin-bottom: -1px;
  font-weight: 600;
}

.tab-content {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Sidebar Container Styling */
.sidebar-container-box {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.sidebar-container-title {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
  margin: 0;
}

.sidebar-container-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
`;
