<script setup lang="ts">
import { ref } from 'vue';
import { use{{pascalCase moduleName}}Store } from './stores/{{moduleName}}.store';
import {{pascalCase moduleName}}Form from './components/{{pascalCase moduleName}}Form.vue';
import {{pascalCase moduleName}}List from './components/{{pascalCase moduleName}}List.vue';

const store = use{{pascalCase moduleName}}Store();

const newName = ref('');

function handleAdd() {
  if (!newName.value.trim()) return;
  store.addItem(newName.value.trim());
  newName.value = '';
}
</script>

<template>
  <div class="{{kebabCase moduleName}}-module p-6">
    <h1 class="mb-6 text-2xl font-bold">{{\{{ pascalCase moduleName }}\}}</h1>
    <{{pascalCase moduleName}}Form v-model="newName" @add="handleAdd" />
    <p class="my-4 text-sm text-gray-600">Total: {{ '{{' }} store.count }}</p>
    <{{pascalCase moduleName}}List
      :items="store.items"
      @remove="store.removeItem"
    />
  </div>
</template>
