import App from '@app/App.svelte';
import { mount } from 'svelte';
import '@app/app.css';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
