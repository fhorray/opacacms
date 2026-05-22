// Table component styling for OpacaCMS Admin UI


export const TABLE_CSS = `
/* Tables */
.table-container {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  margin-bottom: var(--space-2xl);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.admin-table th {
  background-color: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-sm) var(--space-md);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: var(--text-lg);
  transition: background-color 0.15s ease-in-out;
}

.admin-table tr:hover td {
  background-color: rgba(255, 255, 255, 0.01);
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.table-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

.no-records {
  padding: var(--space-3xl);
  text-align: center;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: none;
  font-size: var(--text-sm);
  letter-spacing: normal;
}
`;
