import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'opaca-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="flex h-screen bg-gray-900 text-white">
      <!-- Sidebar -->
      <aside class="w-64 bg-gray-800 border-r border-gray-700">
        <div class="p-4 border-b border-gray-700">
          <h1 class="text-xl font-bold text-blue-400">OpacaCMS</h1>
        </div>
        <nav class="p-4">
          <h2 class="text-xs uppercase text-gray-500 mb-3">Collections</h2>
          <ul class="space-y-1">
            @for (col of adminService.collections(); track col.slug) {
              <li>
                <a
                  [routerLink]="['/', col.slug]"
                  class="block px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  {{ col.slug }}
                </a>
              </li>
            }
          </ul>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-auto p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {
  adminService = inject(AdminService);
}
