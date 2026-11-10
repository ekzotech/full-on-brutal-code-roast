import {
  Controller, Post, Body, Header, Get, Param, ParseUUIDPipe, Query, NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreatePaste } from './dto';
import { getLanguage } from './languages';
import { issueSecret } from './secrets';

@Controller('pastes')
export class PastesController {
  constructor(private readonly db: DataSource) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Body() input: CreatePaste) {
    return this.db.transaction(async db => {
      await getLanguage(db, input.language);
      const { secret, hash } = issueSecret();
      const [{ id }] = await db.query(
        'INSERT INTO pastes (title, language, secret_hash) VALUES ($1, $2, $3) RETURNING id',
        [input.title.trim(), input.language, hash],
      );
      await db.query(
        'INSERT INTO revisions (paste_id, number, code, language) VALUES ($1, 1, $2, $3)',
        [id, input.code, input.language],
      );
      return { id: id as string, secret };
    });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return getPaste(this.db.manager, id);
  }
}
export async function getPaste(db: EntityManager, id: string) {
  const [paste] = await db.query(`
    SELECT p.id, p.title, p.created_at AS "createdAt", r.number AS revision, r.code,
           json_build_object('slug', l.slug, 'name', l.name) AS language
    FROM pastes p
    JOIN LATERAL (
      SELECT number, code FROM revisions WHERE paste_id = p.id ORDER BY number DESC LIMIT 1
    ) r ON true
    JOIN languages l ON l.slug = p.language
    WHERE p.id = $1
  `, [id]);
  if (!paste) throw new NotFoundException('Paste not found');
  return paste;
}
