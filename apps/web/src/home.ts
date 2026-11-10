import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Api } from './api';

@Component({
  imports: [RouterLink],
  template: `
    <section class="hero">
      <p class="eyebrow">Публичная доска код-ревью</p>
      <h1>Full-on Brutal<br />Code Roast.</h1>
      <p class="lede">Выложите фрагмент кода анонимно. Получите разбор по строкам и оценки от других разработчиков.</p>
      <a class="button primary" routerLink="/pastes/new">Опубликовать код <span aria-hidden="true">↗</span></a>
    </section>
    <section aria-labelledby="languages">
      <div class="section-heading"><h2 id="languages">Языки</h2><span class="eyebrow">Каталог</span></div>
      @if (languages() === undefined) {
        <p role="status">Загружаем языки…</p>
      } @else if (languages() === null) {
        <p role="alert">Не удалось загрузить список языков.</p>
      } @else {
        <div class="language-grid">
          @for (language of languages(); track language.slug) {
            <a class="language-card" [routerLink]="['/languages', language.slug]">
              <strong>{{ language.name }}</strong><span aria-hidden="true">↗</span>
            </a>
          } @empty { <p>Языков пока нет.</p> }
        </div>
      }
    </section>
  `,
})
export class Home {
  readonly languages = toSignal(inject(Api).languages().pipe(catchError(() => of(null))));
}
