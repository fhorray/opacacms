<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { $collections, $router } from 'opacacms';

const collections = useStore($collections);
</script>

<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-800 border-r border-gray-700">
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-xl font-bold text-blue-400">OpacaCMS</h1>
      </div>
      <nav class="p-4">
        <h2 class="text-xs uppercase text-gray-500 mb-3">Collections</h2>
        <ul class="space-y-1">
          <li v-for="col in collections" :key="col.slug">
            <a
              :href="`/${col.slug}`"
              class="block px-3 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              {{ col.slug }}
            </a>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto p-6">
      <slot />
    </main>
  </div>
</template>
