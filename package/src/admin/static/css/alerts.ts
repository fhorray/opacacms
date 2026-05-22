// Alerts styling for OpacaCMS Admin UI


export const ALERTS_CSS = `
/* Flash Messages / Alerts */
.alert {
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--border-radius);
  margin-bottom: var(--space-2xl);
  font-size: var(--text-lg);
  font-weight: 600;
  border: 1px solid transparent;
}

.alert-error {
  background-color: #0b0202;
  color: var(--text-error);
  border-color: var(--text-error);
}

.alert-success {
  background-color: #020b04;
  color: #22c55e;
  border-color: #22c55e;
}
`;
