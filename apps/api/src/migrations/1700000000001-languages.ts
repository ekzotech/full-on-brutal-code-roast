import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000001 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE languages (
      slug text PRIMARY KEY,
      name text NOT NULL UNIQUE
    )`);
  }

  async down(db: QueryRunner) {
    await db.query(`DROP TABLE languages`);
  }
}
