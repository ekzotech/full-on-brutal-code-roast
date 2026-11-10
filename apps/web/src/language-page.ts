import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Api, errorText, Language, Page, PasteCard } from './api';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; text: string }
  | { kind: 'ready'; language: Language; result: Page<PasteCard> };

@Component({
  imports: [RouterLink, DatePipe],
  template: `
    <a routerLink="/" class="back">← Все языки</a>
    @let view = state();
    @if (view.kind === 'loading') {
      <p role="status">Загружаем публикации…</p>
    } @else if (view.kind === 'error') {
      <p role="alert">{{ view.text }}</p>
    } @else {
      <p class="eyebrow">Раздел языка</p>
      <h1>{{ view.language.name }}</h1>
      <ul class="paste-list">
        @for (paste of view.result.items; track paste.id) {
          <li>
            <a [routerLink]="['/pastes', paste.id]">
              <strong>{{ paste.title }}</strong>
              <span class="meta"
                >{{ paste.createdAt | date: 'dd.MM.yyyy' }} ·
                @if (paste.quality.count) {
                  {{ paste.quality.average }} / 5 ({{ paste.quality.count }})
                } @else {
                  Без оценок
                }
              </span>
            </a>
          </li>
        } @empty {
          <li class="panel">
            <p>На этой странице пока нет публикаций.</p>
            <a routerLink="/pastes/new" [queryParams]="{ language: view.language.slug }"
              >Опубликовать код</a
            >
          </li>
        }
      </ul>
      <nav class="actions" aria-label="Страницы публикаций">
        @if (view.result.page > 1) {
          <a class="button" [routerLink]="[]" [queryParams]="{ page: view.result.page - 1 }"
            >← Назад</a
          >
        }
        @if (view.result.hasMore) {
          <a class="button" [routerLink]="[]" [queryParams]="{ page: view.result.page + 1 }"
            >Далее →</a
          >
        }
      </nav>
    }
  `,
})
export class LanguagePage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);

  readonly state = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, query]) => {
        const slug = params.get('slug')!;
        const rawPage = query.get('page') ?? '1';
        const page = /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
        return forkJoin({
          language: this.api.language(slug),
          result: this.api.pastes(slug, page),
        }).pipe(
          map((data) => ({ kind: 'ready', ...data }) as State),
          catchError((error) =>
            of<State>({ kind: 'error', text: errorText(error, 'Не удалось загрузить раздел.') }),
          ),
          startWith({ kind: 'loading' } as State),
        );
      }),
    ),
    { initialValue: { kind: 'loading' } as State },
  );
}
