import { ref, computed } from 'vue';
{{#if useVueuse}}
import { useLocalStorage } from '@vueuse/core';
{{/if}}

interface {{pascalCase moduleName}}Item {
  id: string;
  name: string;
}

export function use{{pascalCase moduleName}}() {
  {{#if useVueuse}}
  const items = useLocalStorage<{{pascalCase moduleName}}Item[]>('{{moduleName}}-items', []);
  {{else}}
  const items = ref<{{pascalCase moduleName}}Item[]>([]);
  {{/if}}

  const count = computed(() => items.value.length);

  function addItem(item: {{pascalCase moduleName}}Item) {
    items.value.push(item);
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id);
  }

  {{#if usePinia}}
  function getAll(): {{pascalCase moduleName}}Item[] {
    return items.value;
  }
  {{/if}}

  return {
    items,
    count,
    addItem,
    removeItem,
    {{#if usePinia}}
    getAll,
    {{/if}}
  };
}
