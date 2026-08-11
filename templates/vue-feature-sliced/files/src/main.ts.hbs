import { createApp } from 'vue';
import App from './app/App.vue';
{{#if useRouter}}
import { createRouter, createWebHistory } from 'vue-router';
{{/if}}
{{#if usePinia}}
import { createPinia } from 'pinia';
{{/if}}
{{#if useNaiveUi}}
import naive from 'naive-ui';
{{/if}}
{{#if usePrimevue}}
import PrimeVue from 'primevue/config';
{{/if}}
{{#if useTailwind}}
import './app/styles/main.css';
{{/if}}
{{#if useRouter}}
{{#each modules}}
import { {{pascalCase this}}Page } from '@/pages/{{this}}';
{{/each}}

const routes = [
  {{#each modules}}
  { path: '/{{this}}', name: '{{pascalCase this}}', component: {{pascalCase this}}Page },
  {{/each}}
  { path: '/', redirect: '/{{modules.[0]}}' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});
{{/if}}

const app = createApp(App);

{{#if usePinia}}
app.use(createPinia());
{{/if}}
{{#if useRouter}}
app.use(router);
{{/if}}
{{#if useNaiveUi}}
app.use(naive);
{{/if}}
{{#if usePrimevue}}
app.use(PrimeVue);
{{/if}}

app.mount('#app');
