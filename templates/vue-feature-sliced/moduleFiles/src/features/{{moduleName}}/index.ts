<script setup lang="ts">
import { ref, computed } from 'vue';
{{#if useVueuse}}
import { useLocalStorage } from '@vueuse/core';
{{/if}}
import type { {{pascalCase moduleName}} } from '@/entities/{{moduleName}}/types';
import {{pascalCase moduleName}}List from './ui/{{pascalCase moduleName}}List.vue';

{{#if useVueuse}}
const items = useLocalStorage<{{pascalCase moduleName}}[]>('{{moduleName}}-items', []);
{{else}}
const items = ref<{{pascalCase moduleName}}[]>([]);
{{/if}}

const count = computed(() => items.value.length);
const newName = ref('');

function handleAdd() {
  if (!newName.value.trim()) return;
  items.value.push({ id: crypto.randomUUID(), name: newName.value.trim() });
  newName.value = '';
}

function handleRemove(id: string) {
  items.value = items.value.filter((i) => i.id !== id);
}
</script>

<template>
  <div class="feature-{{kebabCase moduleName}}">
    <h2 class="mb-4 text-xl font-bold">{{\{{ pascalCase moduleName }}\}}</h2>

    <div class="mb-4 flex gap-2">
      <input
        v-model="newName"
        type="text"
        placeholder="Add..."
        class="rounded border px-3 py-2"
        @keyup.enter="handleAdd"
      />
      <button class="rounded bg-blue-600 px-4 py-2 text-white" @click="handleAdd">
        Add
      </button>
    </div>

    <{{pascalCase moduleName}}List
      :items="items"
      @remove="handleRemove"
    />
  </div>
</template>
