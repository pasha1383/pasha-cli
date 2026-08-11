import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
{{#if useVueuse}}
import { useLocalStorage } from '@vueuse/core';
{{/if}}

interface {{pascalCase moduleName}}Item {
  id: string;
  name: string;
}

export const use{{pascalCase moduleName}}Store = defineStore('{{moduleName}}', () => {
  {{#if useVueuse}}
  const items = useLocalStorage<{{pascalCase moduleName}}Item[]>('{{moduleName}}-items', []);
  {{else}}
  const items = ref<{{pascalCase moduleName}}Item[]>([]);
  {{/if}}

  const count = computed(() => items.value.length);

  function addItem(name: string) {
    items.value.push({ id: crypto.randomUUID(), name });
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id);
  }

  function getAll(): {{pascalCase moduleName}}Item[] {
    return items.value;
  }

  return {
    items,
    count,
    addItem,
    removeItem,
    getAll,
  };
});
