import { ForbiddenException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function digest(secret: string) {
  return createHash('sha256').update(secret).digest();
}

export function issueSecret() {
  const secret = randomBytes(32).toString('base64url');
  return { secret, hash: digest(secret).toString('hex') };
}

export function assertOwner(hash: string | null, authorization?: string) {
  const match = /^Bearer ([\w-]{43})$/.exec(authorization ?? '');
  if (!hash || !match || !timingSafeEqual(Buffer.from(hash, 'hex'), digest(match[1]))) {
    throw new ForbiddenException('Editing secret required');
  }
}
