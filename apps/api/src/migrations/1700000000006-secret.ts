import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000006 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`ALTER TABLE pastes ADD COLUMN secret_hash text;
    ALTER TABLE comments ADD COLUMN secret_hash text`);
  }

  async down(db: QueryRunner) {
    await db.query(`ALTER TABLE comments DROP COLUMN secret_hash;
    ALTER TABLE pastes DROP COLUMN secret_hash`);
  }
}
