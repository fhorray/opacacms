// Button component styling for OpacaCMS Admin UI


export const BUTTON_CSS = `
/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-lg);
  font-size: var(--text-md);
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  border-radius: var(--border-radius);
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease-in-out;
}

.btn-primary {
  background-color: var(--accent-color);
  color: var(--accent-text);
  border-color: var(--accent-color);
}

.btn-primary:hover {
  background-color: var(--accent-hover);
  color: var(--accent-text);
  border-color: var(--accent-hover);
  text-decoration: none;
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.15);
  text-decoration: none;
}

.btn-danger {
  background-color: rgba(239, 68, 68, 0.05);
  color: var(--text-error);
  border-color: rgba(239, 68, 68, 0.2);
}

.btn-danger:hover {
  background-color: var(--danger-color);
  color: #ffffff;
  border-color: var(--danger-color);
  text-decoration: none;
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
}
`;
