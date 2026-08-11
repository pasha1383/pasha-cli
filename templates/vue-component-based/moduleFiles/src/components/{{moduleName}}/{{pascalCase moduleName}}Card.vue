<script setup lang="ts">
defineProps<{
  {{camelCase moduleName}}: {
    id: string;
    name: string;
  };
}>();
</script>

<template>
  <div class="{{kebabCase moduleName}}-card rounded border p-4">
    <h3 class="text-lg font-semibold">{{ '{{' }} {{camelCase moduleName}}.name }}</h3>
    <p class="text-sm text-gray-500">ID: {{ '{{' }} {{camelCase moduleName}}.id }}</p>
  </div>
</template>
