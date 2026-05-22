// HTML Templates for OpacaCMS Admin UI
// All comments in English as requested.

export const LOGIN_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Login - OpacaCMS Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/admin/static/admin.css">
</head>
<body class="login-layout">
  <div class="login-card">
    <div class="login-header">
      <h1><span class="dot"></span>OpacaCMS</h1>
      <p>Admin Control Panel</p>
    </div>
    
    {% if error %}
    <div class="alert alert-error">{{ error }}</div>
    {% endif %}
    {% if success %}
    <div class="alert alert-success">{{ success }}</div>
    {% endif %}
    
    <form class="admin-form" method="POST" action="/admin/login">
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" name="email" required autofocus placeholder="admin@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required placeholder="••••••••" />
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Login</button>
    </form>
  </div>
</body>
</html>`;

export const LAYOUT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ title }} - OpacaCMS Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/admin/static/admin.css">
  <script src="https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js"></script>
  <script type="module" src="/admin/static/editor/editor.js"></script>
  <script>
  (function() {
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  })();

  function addArrayRow(fieldName) {
    const container = document.getElementById('array-rows-' + fieldName);
    const template = document.getElementById('template-' + fieldName);
    if (!container || !template) return;
    
    // Find the current highest index to avoid duplicate indices
    let maxIndex = -1;
    const rows = container.querySelectorAll('.array-row');
    rows.forEach(row => {
      const idx = parseInt(row.getAttribute('data-index') || '-1', 10);
      if (idx > maxIndex) maxIndex = idx;
    });
    
    const nextIndex = maxIndex + 1;
    const html = template.innerHTML.replace(/__INDEX__/g, nextIndex);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    const newRow = tempDiv.firstElementChild;
    container.appendChild(newRow);

    // Initialize newly added TipTap editors if present
    if (typeof window.initializeAllTiptap === 'function') {
      window.initializeAllTiptap();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
      });
    }
  });
  </script>
</head>
<body>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-nav">
        <div class="sidebar-header">
          <a href="/admin" class="sidebar-brand">
            <span class="dot"></span>
            <span class="brand-text">Opaca<span style="font-weight: 300; opacity: 0.85;">CMS</span></span>
          </a>
          <button type="button" id="sidebar-toggle" class="sidebar-toggle-btn" title="Toggle Sidebar">
            <span class="toggle-icon" style="display: inline-flex; align-items: center; justify-content: center;">
              <i data-lucide="chevron-left"></i>
            </span>
          </button>
        </div>
        <div>
          <ul class="nav-list" style="margin-bottom: 16px;">
            <li>
              <a href="/admin" class="nav-link {% if isDashboardActive %}active{% endif %}" title="Dashboard">
                <span class="nav-icon">
                  <i data-lucide="layout-dashboard"></i>
                </span>
                <span class="nav-text">Dashboard</span>
              </a>
            </li>
          </ul>
          
          <h3 class="nav-section-title">Collections</h3>
          <ul class="nav-list">
            {% for col in collections %}
            <li>
              <a href="/admin/collections/{{ col.slug }}" class="nav-link {% if col.active %}active{% endif %}" title="{{ col.label }}">
                <span class="nav-icon">
                  {% if col.icon %}
                    <i data-lucide="{{ col.icon }}"></i>
                  {% else %}
                    <span class="nav-text-badge">{{ (col.label || '').slice(0, 2).toUpperCase() }}</span>
                  {% endif %}
                </span>
                <span class="nav-text">{{ col.label }}</span>
              </a>
            </li>
            {% endfor %}
          </ul>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <div class="user-info">
          Logged in as:<br/>
          <strong>{{ userEmail }}</strong> ({{ userRole }})
        </div>
        <form action="/admin/logout" method="POST" style="margin: 0; display: block; width: 100%;">
          <button type="submit" class="logout-btn" style="width: 100%;">
            <span class="logout-icon" style="display: inline-block; margin-right: 6px;">⏻</span>
            <span class="logout-text">Log Out</span>
          </button>
        </form>
      </div>
    </aside>
    
    <main class="admin-main">
      {% if flashError %}
      <div class="alert alert-error">{{ flashError }}</div>
      {% endif %}
      {% if flashSuccess %}
      <div class="alert alert-success">{{ flashSuccess }}</div>
      {% endif %}
      
      {{ body }}
    </main>
  </div>
  <script>
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    function switchTab(btn, containerId, tabId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const buttons = container.querySelectorAll(':scope > .tabs-header > .tab-btn');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const contents = container.querySelectorAll(':scope > .tabs-body > .tab-content');
      contents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      const target = container.querySelector(':scope > .tabs-body > [data-tab-content="' + tabId + '"]');
      if (target) {
        target.classList.add('active');
        target.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;


export const DASHBOARD_TEMPLATE = `<div class="page-header">
  <div class="page-title">
    <h1>Dashboard</h1>
    <p>Welcome to the OpacaCMS Administration panel.</p>
  </div>
</div>

<div class="dashboard-grid">
  {% for widget in widgets %}
  <a href="/admin/collections/{{ widget.slug }}">
  <div class="widget-card">
    <div class="widget-header">
      <div class="widget-title">{{ widget.label }}</div>
      {% if widget.icon %}
      <span class="widget-icon">
        <i data-lucide="{{ widget.icon }}"></i>
      </span>
      {% endif %}
    </div>
    <div class="widget-value">{{ widget.count }}</div>
  </div>
  </a>
  {% endfor %}
</div>`;

export const LIST_TEMPLATE = `<div class="page-header">
  <div class="page-title">
    <h1>{{ collectionLabel }}</h1>
    <p>Manage and view your collection records.</p>
  </div>
  {% if canCreate %}
  <div class="header-actions">
    <a href="/admin/collections/{{ collectionSlug }}/new" class="btn btn-primary">Create New</a>
  </div>
  {% endif %}
</div>

<div class="table-container">
  {% if isEmpty %}
  <div class="no-records">
    No records found. Click "Create New" to create one.
  </div>
  {% else %}
  <table class="admin-table">
    <thead>
      <tr>
        <th>ID</th>
        {% for field in fields %}
        <th>{{ field }}</th>
        {% endfor %}
        <th style="text-align: right;">Actions</th>
      </tr>
    </thead>
    <tbody>
      {% for rec in records %}
      <tr>
        <td>{{ rec.id }}</td>
        {% for colVal in rec.values %}
        <td>{{ colVal }}</td>
        {% endfor %}
        <td class="table-actions">
          <a href="/admin/collections/{{ collectionSlug }}/{{ rec.id }}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</a>
        </td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
  {% endif %}
</div>

<div class="pagination">
  <div class="pagination-info">
    Showing {{ count }} records
  </div>
</div>`;

export const FORM_TEMPLATE = `<div class="page-header">
  <div class="page-title">
    <h1>{{ formTitle }}</h1>
    <p>{{ formSubtitle }}</p>
  </div>
  <div class="header-actions">
    <a href="/admin/collections/{{ collectionSlug }}" class="btn btn-secondary">Back to List</a>
  </div>
</div>

<div class="form-container">
  <form class="admin-form" method="POST" action="{{ formAction }}">
    <div class="form-layout-grid{% if hasSidebar %} has-sidebar{% endif %}">
      <div class="form-main-panel">
        <div class="form-card">
          {{ mainFieldsHtml }}
        </div>
      </div>
      
      {% if hasSidebar %}
      <div class="form-sidebar-panel">
        {{ sidebarFieldsHtml }}
      </div>
      {% endif %}
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save Changes</button>
      {% if isEdit %}
      <button type="submit" name="_action" value="delete" class="btn btn-danger" onclick="return confirm('Are you sure you want to delete this record?')">Delete</button>
      {% endif %}
    </div>
  </form>
</div>`;

export const SETUP_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Setup - OpacaCMS Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/admin/static/admin.css">
</head>
<body class="login-layout">
  <div class="login-card">
    <div class="login-header">
      <h1><span class="dot"></span>OpacaCMS</h1>
      <p>Create Administrator Account</p>
    </div>
    
    {% if error %}
    <div class="alert alert-error">{{ error }}</div>
    {% endif %}
    {% if success %}
    <div class="alert alert-success">{{ success }}</div>
    {% endif %}
    
    <form class="admin-form" method="POST" action="/admin/setup">
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" name="email" required autofocus placeholder="admin@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required placeholder="••••••••" minlength="8" />
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <input type="password" name="confirmPassword" required placeholder="••••••••" minlength="8" />
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Create Admin & Log In</button>
    </form>
  </div>
</body>
</html>`;
