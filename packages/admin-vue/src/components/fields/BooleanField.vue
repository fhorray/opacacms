<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <label class="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      "
      class="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
    />
    <span class="text-gray-300">{{ label }}</span>
  </label>
</template>
