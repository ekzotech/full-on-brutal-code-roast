import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Language { slug: string; name: string }
export interface Quality { average: number | null; count: number }
export interface PasteCard { id: string; title: string; language: Language; createdAt: string; quality: Quality }
export interface Paste extends PasteCard { code: string; revision: number }
export interface PasteInput { title: string; language: string; code: string }
export interface Revision { number: number; createdAt: string }
export interface Page<T> { items: T[]; page: number; hasMore: boolean }

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  languages() { return this.http.get<Language[]>('/api/languages'); }

  language(slug: string) {
    return this.http.get<Language>('/api/languages/' + encodeURIComponent(slug));
  }

  pastes(language: string, page: number) {
    return this.http.get<Page<PasteCard>>('/api/pastes', { params: { language, page } });
  }
  paste(id: string, revision?: number) {
    const path = '/api/pastes/' + encodeURIComponent(id);
    return this.http.get<Paste>(revision === undefined ? path : path + '/revisions/' + revision);
  }

  revisions(id: string) {
    return this.http.get<Revision[]>('/api/pastes/' + encodeURIComponent(id) + '/revisions');
  }

  createPaste(input: PasteInput) {
    return this.http.post<{ id: string; secret: string }>('/api/pastes', input);
  }

  updatePaste(id: string, input: PasteInput & { expectedRevision: number }, secret: string) {
    return this.http.patch<Paste>('/api/pastes/' + id, input, owner(secret));
  }

  deletePaste(id: string, secret: string) {
    return this.http.delete<void>('/api/pastes/' + id, owner(secret));
  }
}

function owner(secret: string) {
  return { headers: { Authorization: 'Bearer ' + secret } };
}

export function errorText(error: unknown, fallback: string) {
  if (error instanceof HttpErrorResponse && error.status === 404) return 'Запись не найдена.';
  if (error instanceof HttpErrorResponse && error.status === 409) return 'Появилась новая ревизия. Скопируйте изменения перед перезагрузкой.';
  if (error instanceof HttpErrorResponse && error.status === 429) return 'Слишком много запросов. Попробуйте позже.';
  return fallback;
}
