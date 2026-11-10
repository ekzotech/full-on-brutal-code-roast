import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, errorText, Language } from './api';
import { readSecret, saveSecret } from './ownership';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <a class="back" [routerLink]="id ? ['/pastes', id] : ['/']">← Назад</a>
    <p class="eyebrow">Анонимная публикация</p>
    <h1>{{ id ? 'Редактировать paste' : 'Новый paste' }}</h1>
    @if (loading()) {
      <p role="status">Загрузка…</p>
    } @else if (ready()) {
      <form class="panel editor" (ngSubmit)="save()">
        <label>Заголовок <input name="title" [(ngModel)]="title" maxlength="120" required /></label>
        <label
          >Язык
          <select name="language" [(ngModel)]="language" required>
            <option value="" disabled>Выберите язык</option>
            @for (option of languages(); track option.slug) {
              <option [value]="option.slug">{{ option.name }}</option>
            }
          </select>
        </label>
        <label
          >Код
          <textarea
            class="code-input"
            name="code"
            rows="12"
            [(ngModel)]="code"
            spellcheck="false"
            required
            aria-describedby="code-size"
          ></textarea>
        </label>
        <span id="code-size" class="meta" [class.error]="bytes > limit"
          >{{ bytes }} / {{ limit }} байт</span
        >
        @if (bytes > limit) {
          <p role="alert">Код превышает лимит.</p>
        }
        <p class="meta">Право на редактирование сохраняется в этом браузере.</p>
        <button
          class="button primary"
          type="submit"
          [disabled]="saving() || !title.trim() || !language || !code.trim() || bytes > limit"
        >
          {{ id ? 'Сохранить изменения' : 'Опубликовать' }}
        </button>
      </form>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (published()) {
      <a [routerLink]="['/pastes', published()]">Открыть публикацию</a>
    }
  `,
})
export class PasteForm {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly id = this.route.snapshot.paramMap.get('id');
  private readonly secret = this.id ? readSecret('paste', this.id) : null;
  readonly limit = 51200;
  readonly languages = signal<Language[]>([]);
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly published = signal('');
  title = '';
  language = '';
  code = '';
  private revision = 0;
  private originalCode = '';

  get bytes() {
    return new TextEncoder().encode(this.code).length;
  }

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      if (this.id && !this.secret) {
        this.error.set('В этом браузере нет секрета редактирования.');
        return;
      }
      const languages = await firstValueFrom(this.api.languages());
      this.languages.set(languages);
      const preferred = this.route.snapshot.queryParamMap.get('language');
      if (languages.some((option) => option.slug === preferred)) this.language = preferred!;
      if (this.id) {
        const paste = await firstValueFrom(this.api.paste(this.id));
        this.title = paste.title;
        this.language = paste.language.slug;
        this.originalCode = this.code = paste.code.replace(/\r\n?/g, '\n');
        this.revision = paste.revision;
      }
      this.ready.set(true);
    } catch (error) {
      this.error.set(errorText(error, 'Не удалось загрузить форму.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    if (
      this.saving() ||
      !this.ready() ||
      !this.title.trim() ||
      !this.language ||
      !this.code.trim() ||
      this.bytes > this.limit
    )
      return;
    this.saving.set(true);
    this.error.set('');
    const input = { title: this.title, language: this.language, code: this.code };
    try {
      if (this.id && this.secret) {
        await firstValueFrom(
          this.api.updatePaste(
            this.id,
            {
              ...input,
              code: this.code === this.originalCode ? undefined : this.code,
              expectedRevision: this.revision,
            },
            this.secret,
          ),
        );
        await this.router.navigate(['/pastes', this.id]);
      } else {
        const result = await firstValueFrom(this.api.createPaste(input));
        if (!saveSecret('paste', result.id, result.secret)) {
          this.ready.set(false);
          this.published.set(result.id);
          this.error.set('Код опубликован. Браузер не сохранил секрет редактирования.');
          return;
        }
        await this.router.navigate(['/pastes', result.id]);
      }
    } catch (error) {
      this.error.set(
        errorText(error, 'Не удалось сохранить публикацию. Введённый код остался в форме.'),
      );
    } finally {
      this.saving.set(false);
    }
  }
}
