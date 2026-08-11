<script lang="ts">
  {{#each modules}}
  import {{pascalCase this}} from './components/{{this}}/{{this}}.svelte';
  {{/each}}
</script>

<main>
  <h1>{{projectName}}</h1>
  {{#each modules}}
  <{{pascalCase this}} />
  {{/each}}
</main>

<style>
  main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
  }
</style>
