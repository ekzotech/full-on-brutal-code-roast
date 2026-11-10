import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000004 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE revisions (
      paste_id uuid NOT NULL REFERENCES pastes(id) ON DELETE CASCADE,
      number integer NOT NULL CHECK (number > 0),
      code text NOT NULL CHECK (octet_length(code) BETWEEN 1 AND 51200),
      language text NOT NULL REFERENCES languages(slug),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (paste_id, number)
    )`);
  }

  async down(db: QueryRunner) {
    await db.query(`DROP TABLE revisions`);
  }
}
