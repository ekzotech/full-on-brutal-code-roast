type Kind = 'paste' | 'comment';

export function readSecret(kind: Kind, id: string) {
  try { return localStorage.getItem('roast:' + kind + ':' + id); }
  catch { return null; }
}

export function saveSecret(kind: Kind, id: string, secret: string) {
  try { localStorage.setItem('roast:' + kind + ':' + id, secret); return true; }
  catch { return false; }
}

export function clearSecret(kind: Kind, id: string) {
  try { localStorage.removeItem('roast:' + kind + ':' + id); }
  catch { /* Storage may be disabled. */ }
}
