<script setup lang="ts">
{{#if useRouter}}
import { RouterView } from 'vue-router';
{{/if}}
</script>

<template>
  <div id="app" class="app-container">
    {{#if useRouter}}
    <RouterView />
    {{else}}
    <templates-default-layout>
      <h1>{{projectName}}</h1>
    </templates-default-layout>
    {{/if}}
  </div>
</template>

{{#if useTailwind}}
<style>
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
{{else}}
<style>
.app-container {
  font-family: system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
{{/if}}
