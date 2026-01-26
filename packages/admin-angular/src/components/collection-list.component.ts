import { Component, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'opaca-collection-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (meta()) {
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ meta()!.slug }}</h1>
        <a
          [routerLink]="['/', collection(), 'create']"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          + Create
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium">ID</th>
              @for (f of meta()!.fields.slice(0, 3); track f.name) {
                <th class="px-4 py-3 text-left text-sm font-medium">{{ f.label }}</th>
              }
              <th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            @for (doc of docs(); track doc.id) {
              <tr class="hover:bg-gray-700/50">
                <td class="px-4 py-3 text-gray-400">{{ doc.id }}</td>
                @for (f of meta()!.fields.slice(0, 3); track f.name) {
                  <td class="px-4 py-3">{{ doc[f.name] ?? '' }}</td>
                }
                <td class="px-4 py-3 text-right">
                  <a
                    [routerLink]="['/', collection(), doc.id]"
                    class="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (docs().length === 0) {
          <div class="p-8 text-center text-gray-500">No documents yet</div>
        }
      </div>
    } @else {
      <div class="text-gray-400">Select a collection from the sidebar</div>
    }
  `,
})
export class CollectionListComponent {
  private route = inject(ActivatedRoute);
  private adminService = inject(AdminService);

  collection = signal<string>('');
  docs = signal<any[]>([]);

  constructor() {
    effect(async () => {
      const slug = this.collection();
      if (slug) {
        const data = await this.adminService.find(slug);
        this.docs.set(data);
      }
    });

    this.route.params.subscribe((params) => {
      this.collection.set(params['collection'] || '');
    });
  }

  meta() {
    return this.adminService.collections().find((c) => c.slug === this.collection());
  }
}
