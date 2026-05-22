// Base styling variables and resets for OpacaCMS Admin UI


export const BASE_CSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  line-height: 1.6;
  overflow-x: hidden;
  letter-spacing: -0.01em;
}

a {
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.15s ease-in-out;
}

a:hover {
  text-decoration: none;
  color: var(--accent-color);
}

.login-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg-main);
  padding: var(--space-xl);
}

/* Main Layout Grid */
.admin-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  min-height: 100vh;
}

.admin-main {
  padding: var(--space-3xl);
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2xl);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--space-lg);
}

.page-title h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.page-title p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

/* Pagination Utilities */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
`;
