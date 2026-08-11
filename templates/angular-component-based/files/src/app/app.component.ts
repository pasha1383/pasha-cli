import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
{{#each modules}}
import { {{pascalCase this}}Component } from './{{this}}/{{this}}.component';
{{/each}}
{{#if useMaterial}}
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
{{/if}}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    {{#if useMaterial}}
    MatToolbarModule,
    MatCardModule,
    {{/if}}
    {{#each modules}}
    {{pascalCase this}}Component,
    {{/each}}
  ],
  template: `
    <header class="app-header">
      <h1>{{projectName}}</h1>
      <p>Angular + Standalone Components</p>
    </header>

    <main class="app-main">
      {{#each modules}}
      <app-{{kebabCase this}} />
      {{/each}}
    </main>
  `,
  styles: [`
    .app-header {
      padding: 2rem;
      background: #1a365d;
      color: white;
      text-align: center;
    }

    .app-header h1 {
      margin: 0;
      font-size: 2rem;
    }

    .app-header p {
      margin: 0.5rem 0 0;
      opacity: 0.8;
    }

    .app-main {
      max-width: 960px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
  `],
})
export class AppComponent {
  title = '{{projectName}}';
}
