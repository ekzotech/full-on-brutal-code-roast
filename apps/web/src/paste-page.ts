import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Api, errorText, Paste, Quality, Revision } from './api';
import { Discussion } from './discussion';
import { CodeView, LineRange } from './code-view';
import { clearSecret, readSecret } from './ownership';

type State = { kind: 'loading' } | { kind: 'error'; text: string } |
  { kind: 'ready'; paste: Paste; revisions: Revision[]; historical: boolean };

@Component({
  imports: [RouterLink, CodeView, Discussion],
  template: `
    @let view = state();
    @if (view.kind === 'loading') {
      <p role="status">Загружаем код…</p>
    } @else if (view.kind === 'error') {
      <p role="alert">{{ view.text }}</p><a routerLink="/">На главную</a>
    } @else {
      @let paste = view.paste;
      <a class="back" [routerLink]="['/languages', paste.language.slug]">← {{ paste.language.name }}</a>
      <p class="eyebrow">{{ paste.language.name }} / Ревизия {{ paste.revision }}</p>
      <h1>{{ paste.title }}</h1>
      @let quality = refreshedQuality() ?? paste.quality;
      <p class="meta" aria-live="polite">
        @if (quality.count) { Качество {{ quality.average }} / 5 · Оценок {{ quality.count }} }
        @else { Оценок пока нет }
      </p>
      <div class="actions">
        @if (view.historical) { <a class="button" [routerLink]="['/pastes', paste.id]">Текущая версия</a> }
        @if (!view.historical && owns(paste.id)) {
          <a class="button" [routerLink]="['/pastes', paste.id, 'edit']">Редактировать</a>
          <button type="button" class="button" [disabled]="deleting()" (click)="remove(paste)">Удалить</button>
        }
      </div>
      @if (view.revisions.length > 1) {
        <details class="history">
          <summary>История ревизий</summary>
          <ul>
            @for (revision of view.revisions; track revision.number) {
              <li><a [routerLink]="['/pastes', paste.id, 'revisions', revision.number]"
                [attr.aria-current]="revision.number === paste.revision ? 'true' : null">
                Ревизия {{ revision.number }}
              </a></li>
            }
          </ul>
        </details>
      }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <roast-code [code]="paste.code" [language]="paste.language.slug" (changed)="range.set($event)" />
      <roast-discussion [paste]="paste" [range]="range()" (qualityChanged)="refreshedQuality.set($event)" />
    }
  `,
})
export class PastePage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly refreshedQuality = signal<Quality | null>(null);
  readonly range = signal<LineRange | null>(null);

  readonly state = toSignal(this.route.paramMap.pipe(
    switchMap(params => {
      this.refreshedQuality.set(null);
      this.range.set(null);
      this.error.set('');
      const id = params.get('id')!;
      const raw = params.get('number');
      if (raw !== null && !/^[1-9]\d{0,9}$/.test(raw)) {
        return of<State>({ kind: 'error', text: 'Ревизия не найдена.' });
      }
      return forkJoin({ paste: this.api.paste(id, raw === null ? undefined : Number(raw)),
        revisions: this.api.revisions(id) }).pipe(
        map(data => ({ kind: 'ready', ...data, historical: raw !== null }) as State),
        catchError(error => of<State>({ kind: 'error', text: errorText(error, 'Не удалось загрузить публикацию.') })),
        startWith({ kind: 'loading' } as State),
      );
    }),
  ), { initialValue: { kind: 'loading' } as State });

  owns(id: string) { return !!readSecret('paste', id); }

  async remove(paste: Paste) {
    const secret = readSecret('paste', paste.id);
    if (this.deleting() || !secret || !window.confirm('Удалить публикацию и все её комментарии?')) return;
    this.deleting.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.deletePaste(paste.id, secret));
      clearSecret('paste', paste.id);
      await this.router.navigate(['/languages', paste.language.slug]);
    } catch (error) {
      this.error.set(errorText(error, 'Не удалось удалить публикацию.'));
    } finally {
      this.deleting.set(false);
    }
  }
}
