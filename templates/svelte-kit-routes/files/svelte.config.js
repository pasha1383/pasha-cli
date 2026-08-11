{{#if useTailwind}}
import adapter from '@sveltejs/adapter-auto';
{{else}}
import adapter from '@sveltejs/adapter-auto';
{{/if}}
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  compilerOptions: {
    runes: true,
  },
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$lib': './src/lib',
    },
  },
};
