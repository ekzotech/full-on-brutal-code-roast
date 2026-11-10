import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1700000000002 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`INSERT INTO languages (slug, name) VALUES
      ('typescript','TypeScript'), ('javascript','JavaScript'), ('python','Python'),
      ('rust','Rust'), ('go','Go'), ('java','Java'), ('csharp','C#'), ('cpp','C++'),
      ('sql','SQL'), ('html','HTML'), ('css','CSS'), ('text','Plain text')`);
  }

  async down(db: QueryRunner) {
    await db.query(`DELETE FROM languages WHERE slug IN
      ('typescript','javascript','python','rust','go','java','csharp','cpp','sql','html','css','text')`);
  }
}
