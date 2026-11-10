import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouterLink, RouterOutlet } from '@angular/router';
import { Home } from './home';
import { LanguagePage } from './language-page';

@Component({
  selector: 'roast-app',
  imports: [RouterLink, RouterOutlet],
  template: `
    <header class="site-header"><div class="container bar">
      <a routerLink="/" class="brand" aria-label="Full-on Brutal Code Roast, главная">
        <span class="brand-mark" aria-hidden="true">/&gt;</span> Code Roast
      </a>
      <a class="button primary" routerLink="/pastes/new">+ Новый paste</a>
    </div></header>
    <main class="container"><router-outlet /></main>
    <footer class="container">Full-on Brutal Code Roast <span> / </span> Анонимное код-ревью</footer>
  `,
})
class App {}

@Component({
  imports: [RouterLink],
  template: '<h1>Страница не найдена</h1><a routerLink="/">На главную</a>',
})
class NotFound {}

void bootstrapApplication(App, {
  providers: [provideHttpClient(), provideRouter([
    { path: '', component: Home, pathMatch: 'full' },
    { path: 'languages/:slug', component: LanguagePage },
    { path: '**', component: NotFound },
  ])],
});
