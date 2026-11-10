import {
  Controller, Post, Body, Header, Get, Param, ParseUUIDPipe, Query, NotFoundException, Patch, Headers, ConflictException, ParseIntPipe, Delete, HttpCode,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { pageNumber } from './pagination';
import { CreatePaste, UpdatePaste } from './dto';
import { getLanguage } from './languages';
import { assertOwner, issueSecret } from './secrets';

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

  @Get()
  async list(@Query('language') language?: string, @Query('page') rawPage?: string) {
    const page = pageNumber(rawPage);
    if (language !== undefined) await getLanguage(this.db.manager, language);
    const rows = await this.db.query(`
      SELECT p.id, p.title, p.created_at AS "createdAt",
             json_build_object('slug', l.slug, 'name', l.name) AS language
      FROM pastes p JOIN languages l ON l.slug = p.language
      WHERE ($1::text IS NULL OR p.language = $1)
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 21 OFFSET $2
    `, [language ?? null, (page - 1) * 20]);
    return { items: rows.slice(0, 20), page, hasMore: rows.length > 20 };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return getPaste(this.db.manager, id);
  }
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() input: UpdatePaste,
  ) {
    return this.db.transaction(async db => {
      const paste = await lockPaste(db, id, authorization);
      const current = await getPaste(db, id);
      if (current.revision !== input.expectedRevision) {
        throw new ConflictException('A newer revision already exists');
      }
      const language = input.language ?? paste.language;
      if (input.language !== undefined) await getLanguage(db, language);
      await db.query('UPDATE pastes SET title = $2, language = $3 WHERE id = $1', [
        id, input.title?.trim() ?? paste.title, language,
      ]);
      const code = input.code ?? current.code;
      if (code !== current.code || language !== paste.language) {
        await db.query(
          'INSERT INTO revisions (paste_id, number, code, language) VALUES ($1, $2, $3, $4)',
          [id, current.revision + 1, code, language],
        );
      }
      return getPaste(db, id);
    });
  }
  @Get(':id/revisions')
  async revisions(@Param('id', ParseUUIDPipe) id: string) {
    const rows = await this.db.query(
      'SELECT number, created_at AS "createdAt" FROM revisions WHERE paste_id = $1 ORDER BY number DESC',
      [id],
    );
    if (!rows.length) throw new NotFoundException('Paste not found');
    return rows;
  }
  @Get(':id/revisions/:number')
  revision(@Param('id', ParseUUIDPipe) id: string, @Param('number', ParseIntPipe) number: number) {
    return getRevision(this.db.manager, id, number);
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.db.transaction(async db => {
      await lockPaste(db, id, authorization);
      await db.query('DELETE FROM pastes WHERE id = $1', [id]);
    });
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
async function lockPaste(db: EntityManager, id: string, authorization?: string) {
  const [paste] = await db.query(
    'SELECT title, language, secret_hash FROM pastes WHERE id = $1 FOR UPDATE', [id],
  );
  if (!paste) throw new NotFoundException('Paste not found');
  assertOwner(paste.secret_hash, authorization);
  return paste as { title: string; language: string };
}
export async function getRevision(db: EntityManager, id: string, number: number) {
  if (number < 1 || number > 2147483647) throw new NotFoundException('Revision not found');
  const [revision] = await db.query(`
    SELECT p.id, p.title, p.created_at AS "createdAt", r.number AS revision, r.code,
           json_build_object('slug', l.slug, 'name', l.name) AS language
    FROM revisions r JOIN pastes p ON p.id = r.paste_id
    JOIN languages l ON l.slug = r.language
    WHERE r.paste_id = $1 AND r.number = $2
  `, [id, number]);
  if (!revision) throw new NotFoundException('Revision not found');
  return revision;
}
