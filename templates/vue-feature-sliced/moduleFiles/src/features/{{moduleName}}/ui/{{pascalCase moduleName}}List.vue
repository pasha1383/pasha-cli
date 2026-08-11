<script setup lang="ts">
import type { {{pascalCase moduleName}} } from '../../entities/{{moduleName}}/types';

defineProps<{
  items: {{pascalCase moduleName}}[];
}>();

defineEmits<{
  remove: [id: string];
}>();
</script>

<template>
  <ul class="{{kebabCase moduleName}}-list divide-y rounded border">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex items-center justify-between px-4 py-3"
    >
      <span>{{ '{{' }} item.name }}</span>
      <button
        class="text-sm text-red-500 hover:text-red-700"
        @click="$emit('remove', item.id)"
      >
        Remove
      </button>
    </li>
    <li v-if="items.length === 0" class="px-4 py-6 text-center text-gray-500">
      No items yet.
    </li>
  </ul>
</template>
