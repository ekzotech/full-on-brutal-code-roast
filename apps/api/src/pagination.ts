import { BadRequestException } from '@nestjs/common';

export function pageNumber(raw?: string) {
  if (raw === undefined) return 1;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,5}$/.test(raw)) {
    throw new BadRequestException('Invalid page');
  }
  return Number(raw);
}
