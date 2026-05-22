// Card and widget component styling for OpacaCMS Admin UI


export const CARD_CSS = `
/* Cards & Containers */
.login-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-3xl);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.login-header {
  margin-bottom: var(--space-xl);
  text-align: center;
}

.login-header h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  text-transform: none;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.login-header h1 .dot {
  width: 6px;
  height: 6px;
  background-color: var(--accent-color);
  display: inline-block;
  border-radius: var(--radius-full);
}

.login-header p {
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.form-container {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-2xl);
  max-width: 800px;
}

/* Dashboard Widgets */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.widget-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-xl);
  transition: all 0.2s ease-in-out;
}

.widget-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background-color: var(--bg-card-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.widget-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: none;
  color: var(--text-secondary);
  letter-spacing: normal;
  margin: 0;
}

.widget-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  width: 20px;
  height: 20px;
  background: none;
  border: none;
}

.widget-icon svg, .widget-icon .lucide {
  width: 14px;
  height: 14px;
  stroke-width: 1.5px;
}

.widget-value {
  font-size: var(--text-4xl);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}
`;
