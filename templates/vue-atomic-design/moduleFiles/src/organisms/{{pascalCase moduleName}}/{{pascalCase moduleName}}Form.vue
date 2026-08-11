<script setup lang="ts">
import { ref } from 'vue';
import {{pascalCase moduleName}}Input from '@/molecules/{{pascalCase moduleName}}/{{pascalCase moduleName}}Input.vue';
import BaseButton from '@/atoms/BaseButton.vue';

const emit = defineEmits<{
  submit: [name: string];
}>();

const name = ref('');

function handleSubmit() {
  if (!name.value.trim()) return;
  emit('submit', name.value.trim());
  name.value = '';
}
</script>

<template>
  <form class="{{kebabCase moduleName}}-form" @submit.prevent="handleSubmit">
    <div class="flex gap-2">
      <{{pascalCase moduleName}}Input v-model="name" placeholder="Enter {{moduleName}} name..." />
      <BaseButton type="submit" variant="primary">
        Add
      </BaseButton>
    </div>
  </form>
</template>
