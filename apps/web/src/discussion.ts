import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Api, Comment, errorText, Paste, Quality } from './api';
import { LineRange } from './code-view';
import { clearSecret, readSecret, saveSecret } from './ownership';

@Component({
  selector: 'roast-discussion',
  imports: [FormsModule],
  template: `
    <section aria-labelledby="discussion-heading">
      <div class="section-heading"><h2 id="discussion-heading">Обсуждение</h2></div>
      @if (range(); as selected) {
        <form class="panel editor" (ngSubmit)="create()">
          <p class="meta">{{ lineLabel(selected) }}</p>
          <label>Комментарий <textarea name="body" rows="3" required maxlength="2000" [(ngModel)]="body"></textarea></label>
          <label>Оценка качества
            <select name="rating" [(ngModel)]="rating">
              <option [ngValue]="null">Без оценки</option>
              @for (score of scores; track score) { <option [ngValue]="score">{{ score }}</option> }
            </select>
          </label>
          <button type="submit" class="button primary" [disabled]="busy() || !body.trim()">Добавить комментарий</button>
        </form>
      } @else { <p class="meta">Выберите строки кода, чтобы оставить комментарий.</p> }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (loading()) { <p role="status">Загружаем комментарии…</p> }
      <ul class="comment-list">
        @for (comment of comments(); track comment.id) {
          <li class="panel">
            <div class="actions meta">
              <a [attr.href]="'#line-' + comment.startLine" (click)="jump(comment.startLine, $event)">{{ lineLabel(comment) }}</a>
              @if (comment.rating !== null) { <span>Оценка {{ comment.rating }} / 5</span> }
            </div>
            @if (editing() === comment.id) {
              <form class="editor" (ngSubmit)="update(comment)">
                <label>Текст комментария <textarea name="editBody" rows="3" required maxlength="2000" [(ngModel)]="editBody"></textarea></label>
                <label>Новая оценка
                  <select name="editRating" [(ngModel)]="editRating">
                    <option [ngValue]="null">Без оценки</option>
                    @for (score of scores; track score) { <option [ngValue]="score">{{ score }}</option> }
                  </select>
                </label>
                <div class="actions">
                  <button class="button primary" type="submit" [disabled]="busy() || !editBody.trim()">Сохранить</button>
                  <button class="button" type="button" [disabled]="busy()" (click)="editing.set(null)">Отмена</button>
                </div>
              </form>
            } @else {
              <p class="comment-text">{{ comment.body }}</p>
              @if (owns(comment.id)) {
                <div class="actions">
                  <button class="button" type="button" [disabled]="busy()" (click)="edit(comment)">Изменить комментарий</button>
                  <button class="button" type="button" [disabled]="busy()" (click)="remove(comment)">Удалить комментарий</button>
                </div>
              }
            }
          </li>
        } @empty { @if (!loading()) { <li>Комментариев пока нет.</li> } }
      </ul>
      @if (hasMore()) {
        <button class="button" type="button" [disabled]="loading() || busy()" (click)="load(page + 1)">Ещё комментарии</button>
      }
    </section>
  `,
  styles: `
    .comment-list { display: grid; gap: .65rem; padding: 0; list-style: none; }
    .comment-text { white-space: pre-wrap; overflow-wrap: anywhere; }
  `,
})
export class Discussion implements OnInit {
  private readonly api = inject(Api);
  private readonly lifetime = inject(DestroyRef);
  readonly paste = input.required<Paste>();
  readonly range = input.required<LineRange | null>();
  readonly qualityChanged = output<Quality>();
  readonly scores = [1, 2, 3, 4, 5];
  readonly comments = signal<Comment[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly hasMore = signal(false);
  readonly editing = signal<string | null>(null);
  readonly error = signal('');
  page = 0;
  body = '';
  rating: number | null = null;
  editBody = '';
  editRating: number | null = null;

  ngOnInit() { void this.load(1); }

  lineLabel(range: LineRange) {
    return range.startLine === range.endLine ? 'Строка ' + range.startLine
      : 'Строки ' + range.startLine + '–' + range.endLine;
  }

  jump(line: number, event: Event) {
    event.preventDefault();
    document.querySelector<HTMLButtonElement>('#line-' + line + ' button')?.focus();
  }

  owns(id: string) { return !!readSecret('comment', id); }

  async load(page: number) {
    this.loading.set(true);
    try {
      const paste = this.paste();
      const result = await firstValueFrom(this.api.comments(paste.id, paste.revision, page));
      this.comments.update(current => page === 1 ? result.items : [...current, ...result.items]);
      this.page = result.page;
      this.hasMore.set(result.hasMore);
    } catch (error) {
      this.error.set(errorText(error, 'Не удалось загрузить обсуждение.'));
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    const range = this.range();
    if (!range || !this.body.trim()) return;
    await this.mutate(async () => {
      const paste = this.paste();
      const comment = await firstValueFrom(this.api.createComment(paste.id, paste.revision, {
        ...range, body: this.body, rating: this.rating,
      }));
      if (!saveSecret('comment', comment.id, comment.secret)) {
        this.error.set('Комментарий опубликован. Браузер не сохранил секрет редактирования.');
      }
      this.body = '';
      this.rating = null;
    });
  }

  edit(comment: Comment) {
    this.editBody = comment.body;
    this.editRating = comment.rating;
    this.editing.set(comment.id);
  }

  async update(comment: Comment) {
    const secret = readSecret('comment', comment.id);
    if (!secret || !this.editBody.trim()) return;
    await this.mutate(async () => {
      await firstValueFrom(this.api.updateComment(comment.id, { body: this.editBody, rating: this.editRating }, secret));
      this.editing.set(null);
    });
  }

  async remove(comment: Comment) {
    const secret = readSecret('comment', comment.id);
    if (!secret || !window.confirm('Удалить комментарий?')) return;
    await this.mutate(async () => {
      await firstValueFrom(this.api.deleteComment(comment.id, secret));
      clearSecret('comment', comment.id);
    });
  }

  private async mutate(action: () => Promise<void>) {
    if (this.busy() || this.loading()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(errorText(error, 'Не удалось сохранить изменение.'));
      this.busy.set(false);
      return;
    }
    try {
      const paste = this.paste();
      const [, updated] = await Promise.all([
        this.load(1),
        firstValueFrom(this.api.paste(paste.id, paste.revision)),
      ]);
      if (!this.lifetime.destroyed) this.qualityChanged.emit(updated.quality);
    } catch (error) {
      this.error.set(errorText(error, 'Изменение сохранено. Не удалось обновить оценку.'));
    } finally {
      this.busy.set(false);
    }
  }
}
