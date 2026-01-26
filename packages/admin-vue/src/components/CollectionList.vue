<script setup lang="ts">
import { ref, watch, inject, computed } from 'vue';
import { useStore } from '@nanostores/vue';
import { $collections, $router, AdminClientKey } from 'opacacms';

const client = inject(AdminClientKey)!;
const collections = useStore($collections);
const router = useStore($router);
const docs = ref<any[]>([]);

const collection = computed(() => router.value?.params?.collection);
const meta = computed(() =>
  collections.value.find((c) => c.slug === collection.value),
);

watch(
  collection,
  async (slug) => {
    if (slug) {
      docs.value = await client.find(slug);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="meta">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">{{ meta.slug }}</h1>
      <a
        :href="`/${collection}/create`"
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
            <th
              v-for="f in meta.fields.slice(0, 3)"
              :key="f.name"
              class="px-4 py-3 text-left text-sm font-medium"
            >
              {{ f.label }}
            </th>
            <th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="doc in docs" :key="doc.id" class="hover:bg-gray-700/50">
            <td class="px-4 py-3 text-gray-400">{{ doc.id }}</td>
            <td
              v-for="f in meta.fields.slice(0, 3)"
              :key="f.name"
              class="px-4 py-3"
            >
              {{ String(doc[f.name] ?? '') }}
            </td>
            <td class="px-4 py-3 text-right">
              <a
                :href="`/${collection}/${doc.id}`"
                class="text-blue-400 hover:text-blue-300"
              >
                Edit
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="docs.length === 0" class="p-8 text-center text-gray-500">
        No documents yet
      </div>
    </div>
  </div>

  <div v-else class="text-gray-400">Select a collection from the sidebar</div>
</template>
