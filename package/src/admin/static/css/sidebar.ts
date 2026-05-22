// Sidebar component styling for OpacaCMS Admin UI


export const SIDEBAR_CSS = `
/* Sidebar Layout & Elements */
.admin-sidebar {
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  padding: var(--space-xl) var(--space-md);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 240px;
  overflow-x: hidden;
  white-space: nowrap;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-brand {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: none;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sidebar-brand .dot {
  width: 6px;
  height: 6px;
  background-color: var(--accent-color);
  display: inline-block;
  border-radius: var(--radius-full);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  flex-grow: 1;
}

.nav-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: var(--text-md);
  text-transform: none;
  letter-spacing: normal;
  border-radius: var(--border-radius);
  border: 1px solid transparent;
  transition: all 0.15s ease-in-out;
}

.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  transition: all 0.15s ease-in-out;
}

.nav-icon svg, .nav-icon .lucide {
  width: 15px;
  height: 15px;
  stroke-width: 1.5px;
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.03);
  text-decoration: none;
}

.nav-link:hover .nav-icon {
  color: var(--text-primary);
}

.nav-link.active {
  color: var(--text-primary);
  background-color: var(--bg-card);
  border-color: var(--border-color);
  font-weight: 600;
}

.nav-link.active .nav-icon {
  color: var(--accent-color);
}

.nav-text-badge {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xs);
  padding: 1px 4px;
  line-height: 1;
  text-transform: uppercase;
  font-family: var(--font-sans);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
}

.sidebar-footer {
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.user-info {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: normal;
  line-height: 1.4;
}

.logout-btn {
  background: none;
  border: 1px solid transparent;
  color: var(--text-error);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
  text-align: left;
  cursor: pointer;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: var(--border-radius);
  transition: all 0.15s ease-in-out;
}

.logout-btn:hover {
  background-color: rgba(248, 113, 113, 0.05);
  border-color: rgba(248, 113, 113, 0.1);
}

.sidebar-toggle-btn {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease-in-out;
}

.sidebar-toggle-btn:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.05);
}

.sidebar-toggle-btn svg, .sidebar-toggle-btn .lucide {
  width: 12px;
  height: 12px;
  stroke-width: 1.5px;
}

.toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Sidebar Collapsed State Rules */
.sidebar-collapsed .admin-sidebar {
  padding: var(--space-xl) var(--space-xs);
  width: 64px;
}

.sidebar-collapsed .sidebar-header {
  flex-direction: column;
  gap: var(--space-lg);
  justify-content: center;
}

.sidebar-collapsed .sidebar-brand {
  justify-content: center;
}

.sidebar-collapsed .brand-text,
.sidebar-collapsed .nav-section-title,
.sidebar-collapsed .nav-text,
.sidebar-collapsed .user-info,
.sidebar-collapsed .logout-text {
  display: none;
}

.sidebar-collapsed .nav-link {
  padding: var(--space-sm) 0;
  justify-content: center;
}

.sidebar-collapsed .nav-link.active {
  background-color: var(--bg-card);
}

.sidebar-collapsed .logout-btn {
  justify-content: center;
  padding: var(--space-sm) 0;
}

.sidebar-collapsed .toggle-icon {
  transform: rotate(180deg);
}
`;
