import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateComment, UpdateComment } from './dto';
import { pageNumber } from './pagination';
import { getRevision } from './pastes';
import { assertOwner, issueSecret } from './secrets';

const fields =
  'id, start_line AS "startLine", end_line AS "endLine", body, rating, created_at AS "createdAt"';
const discussion = 'pastes/:id/revisions/:number/comments';

@Controller()
export class CommentsController {
  constructor(private readonly db: DataSource) {}

  @Post(discussion)
  @Header('Cache-Control', 'no-store')
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Body() input: CreateComment,
  ) {
    return this.db.transaction(async (db) => {
      const [paste] = await db.query('SELECT id FROM pastes WHERE id = $1 FOR KEY SHARE', [id]);
      if (!paste) throw new NotFoundException('Paste not found');
      const revision = await getRevision(db, id, number);
      const lineCount = revision.code.split(/\r\n|\r|\n/u).length;
      if (input.startLine > input.endLine || input.endLine > lineCount) {
        throw new BadRequestException('Selected lines are outside the revision');
      }
      const { secret, hash } = issueSecret();
      const [comment] = await db.query(
        `
        INSERT INTO comments (paste_id, revision, start_line, end_line, body, rating, secret_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${fields}
      `,
        [id, number, input.startLine, input.endLine, input.body.trim(), input.rating ?? null, hash],
      );
      return { ...comment, secret };
    });
  }

  @Get(discussion)
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('number', ParseIntPipe) number: number,
    @Query('page') rawPage?: string,
  ) {
    const page = pageNumber(rawPage);
    await getRevision(this.db.manager, id, number);
    const rows = await this.db.query(
      `
      SELECT ${fields} FROM comments WHERE paste_id = $1 AND revision = $2
      ORDER BY start_line, end_line, created_at, id LIMIT 21 OFFSET $3
    `,
      [id, number, (page - 1) * 20],
    );
    return { items: rows.slice(0, 20), page, hasMore: rows.length > 20 };
  }

  @Patch('comments/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() input: UpdateComment,
  ) {
    return this.db.transaction(async (db) => {
      const current = await lockComment(db, id, authorization);
      const [comment] = await db.query(
        `
        UPDATE comments SET body = $2, rating = $3 WHERE id = $1 RETURNING ${fields}
      `,
        [id, input.body.trim(), input.rating === undefined ? current.rating : input.rating],
      );
      return comment;
    });
  }
  @Delete('comments/:id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.db.transaction(async (db) => {
      await lockComment(db, id, authorization);
      await db.query('DELETE FROM comments WHERE id = $1', [id]);
    });
  }
}
async function lockComment(db: EntityManager, id: string, authorization?: string) {
  const [comment] = await db.query(
    'SELECT secret_hash, rating FROM comments WHERE id = $1 FOR UPDATE',
    [id],
  );
  if (!comment) throw new NotFoundException('Comment not found');
  assertOwner(comment.secret_hash, authorization);
  return comment as { rating: number | null };
}
