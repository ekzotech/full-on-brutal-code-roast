import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000003 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE pastes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      language text NOT NULL REFERENCES languages(slug),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX pastes_language_date ON pastes (language, created_at DESC, id DESC);
    CREATE INDEX pastes_date ON pastes (created_at DESC, id DESC)`);
  }

  async down(db: QueryRunner) {
    await db.query(`DROP TABLE pastes`);
  }
}
