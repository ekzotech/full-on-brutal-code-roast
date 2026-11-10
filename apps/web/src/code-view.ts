import { Component, computed, input, output, signal } from '@angular/core';
import hljs from 'highlight.js/lib/common';

export interface LineRange { startLine: number; endLine: number }

@Component({
  selector: 'roast-code',
  template: `
    <p id="line-help" class="meta">Выберите номер строки. Для диапазона протяните мышью по номерам
      или выберите две строки касанием. С клавиатуры используйте Shift и стрелки.</p>
    <div class="code-frame" role="region" aria-label="Исходный код" aria-describedby="line-help" tabindex="0"
      (window:pointerup)="finish()" (window:pointercancel)="finish()">
      @for (line of lines(); track $index) {
        @let number = $index + 1;
        <div class="code-row" [class.selected]="contains(number)" [id]="'line-' + number">
          <button type="button" class="line-number" [attr.aria-label]="'Строка ' + number"
            [attr.aria-pressed]="contains(number)" (pointerdown)="start(number, $event)"
            (pointerenter)="extend(number)" (click)="activate(number, $event)"
            (keydown.shift.arrowup)="step(number, -1, $event)"
            (keydown.shift.arrowdown)="step(number, 1, $event)">{{ number }}</button>
          @if (line.html !== undefined) { <code [innerHTML]="line.html"></code> }
          @else { <code>{{ line.text }}</code> }
        </div>
      }
    </div>
    <p class="meta" aria-live="polite">
      @if (range(); as selection) {
        Выбраны строки {{ selection.startLine }}–{{ selection.endLine }}.
        <button type="button" class="button" (click)="clear()">Сбросить</button>
      }
    </p>
  `,
})
export class CodeView {
  readonly code = input.required<string>();
  readonly language = input.required<string>();
  readonly range = signal<LineRange | null>(null);
  readonly changed = output<LineRange | null>();
  private drag: number | null = null;
  private anchor: number | null = null;
  private touchAnchor: number | null = null;

  readonly lines = computed(() => {
    const language = this.language();
    const supported = hljs.getLanguage(language);
    return this.code().split(/\r\n|\r|\n/u).map(text => ({
      text,
      html: supported && text ? hljs.highlight(text, { language, ignoreIllegals: true }).value : undefined,
    }));
  });

  contains(number: number) {
    const range = this.range();
    return !!range && number >= range.startLine && number <= range.endLine;
  }

  private select(first: number, last: number) {
    const range = { startLine: Math.min(first, last), endLine: Math.max(first, last) };
    this.range.set(range);
    this.changed.emit(range);
  }

  start(number: number, event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    this.drag = this.anchor = number;
    this.touchAnchor = null;
    this.select(number, number);
  }

  extend(number: number) {
    if (this.drag !== null) this.select(this.drag, number);
  }

  finish() { this.drag = null; }

  activate(number: number, event: MouseEvent) {
    if (event.detail === 0) {
      this.anchor = number;
      this.select(number, number);
    } else if (event instanceof PointerEvent && event.pointerType !== 'mouse') {
      this.anchor = this.touchAnchor ?? number;
      this.select(this.anchor, number);
      this.touchAnchor = this.touchAnchor === null ? number : null;
    }
  }

  step(number: number, delta: number, event: Event) {
    event.preventDefault();
    const end = Math.max(1, Math.min(this.lines().length, number + delta));
    this.anchor ??= number;
    this.select(this.anchor, end);
    document.querySelector<HTMLButtonElement>('#line-' + end + ' button')?.focus();
  }

  clear() {
    this.anchor = this.drag = this.touchAnchor = null;
    this.range.set(null);
    this.changed.emit(null);
  }
}
