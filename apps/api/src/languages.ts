import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export async function getLanguage(db: EntityManager, slug: string) {
  const [language] = await db.query('SELECT slug, name FROM languages WHERE slug = $1', [slug]);
  if (!language) throw new NotFoundException('Language not found');
  return language as { slug: string; name: string };
}

@Controller('languages')
export class LanguagesController {
  constructor(private readonly db: DataSource) {}

  @Get()
  list() {
    return this.db.query('SELECT slug, name FROM languages ORDER BY name');
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return getLanguage(this.db.manager, slug);
  }
}
