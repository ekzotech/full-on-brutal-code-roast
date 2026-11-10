import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000005 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      paste_id uuid NOT NULL,
      revision integer NOT NULL,
      start_line integer NOT NULL CHECK (start_line > 0),
      end_line integer NOT NULL CHECK (end_line >= start_line),
      body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
      rating integer CHECK (rating BETWEEN 1 AND 5),
      created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY (paste_id, revision) REFERENCES revisions(paste_id, number) ON DELETE CASCADE
    );
    CREATE INDEX comments_revision_lines ON comments (paste_id, revision, start_line, end_line, created_at, id)`);
  }

  async down(db: QueryRunner) {
    await db.query(`DROP TABLE comments`);
  }
}
