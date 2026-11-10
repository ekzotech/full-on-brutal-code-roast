import {
  BadRequestException, Body, Controller, Delete, Get, Header, Headers, HttpCode,
  NotFoundException, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateComment, UpdateComment } from './dto';
import { pageNumber } from './pagination';
import { getRevision } from './pastes';
import { assertOwner, issueSecret } from './secrets';

const fields = 'id, start_line AS "startLine", end_line AS "endLine", body, rating, created_at AS "createdAt"';
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
    return this.db.transaction(async db => {
      const [paste] = await db.query('SELECT id FROM pastes WHERE id = $1 FOR KEY SHARE', [id]);
      if (!paste) throw new NotFoundException('Paste not found');
      const revision = await getRevision(db, id, number);
      const lineCount = revision.code.split(/\r\n|\r|\n/u).length;
      if (input.startLine > input.endLine || input.endLine > lineCount) {
        throw new BadRequestException('Selected lines are outside the revision');
      }
      const { secret, hash } = issueSecret();
      const [comment] = await db.query(`
        INSERT INTO comments (paste_id, revision, start_line, end_line, body, rating, secret_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${fields}
      `, [id, number, input.startLine, input.endLine, input.body.trim(), input.rating ?? null, hash]);
      return { ...comment, secret };
    });
  }
}
