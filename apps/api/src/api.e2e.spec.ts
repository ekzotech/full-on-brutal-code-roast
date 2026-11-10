import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './app';
import { configure } from './configure';
import { createDatabase } from './database';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('PostgreSQL API', () => {
  let app: INestApplication;
  let db: DataSource;
  const input = { title: 'List loop', language: 'typescript', code: 'const a = 1;\nconst b = 2;' };

  beforeAll(async () => {
    if (!new URL(url!).pathname.endsWith('_test')) throw new Error('Use a dedicated _test database');
    db = await createDatabase(url).initialize();
    await db.runMigrations();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource).useValue(db).compile();
    app = module.createNestApplication({ bodyParser: false });
    configure(app);
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE pastes CASCADE');
  });

  const http = () => request(app.getHttpServer());

  async function createPaste() {
    const response = await http().post('/api/pastes').send(input).expect(201);
    return response.body as { id: string; secret: string };
  }

  it('creates a paste and first revision without storing the plaintext secret', async () => {
    const { id, secret } = await createPaste();
    const [row] = await db.query(`
      SELECT p.title, p.language, p.secret_hash, r.code
      FROM pastes p JOIN revisions r ON r.paste_id = p.id AND r.number = 1 WHERE p.id = $1
    `, [id]);
    expect(row).toMatchObject(input);
    expect(row.secret_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.secret_hash).not.toBe(secret);
    const response = await http().get('/api/pastes/' + id).expect(200);
    expect(response.body).not.toHaveProperty('secret');
    expect(response.body).not.toHaveProperty('secret_hash');
  });

  it.each(['', ' \n', 'я'.repeat(25601)])('returns 400 for invalid code case %#', async code => {
    await http().post('/api/pastes').send({ ...input, code }).expect(400);
    const [result] = await db.query('SELECT count(*)::int AS count FROM pastes');
    expect(result.count).toBe(0);
  });

  it('accepts exactly 51,200 bytes even when JSON escaping expands the body', async () => {
    await http().post('/api/pastes').send({ ...input, code: '\u0001'.repeat(51200) }).expect(201);
  });

  it('keeps old revisions and rejects stale editors', async () => {
    const { id, secret } = await createPaste();
    const path = '/api/pastes/' + id;
    const authorization = 'Bearer ' + secret;
    const updated = await http().patch(path).set('Authorization', authorization)
      .send({ expectedRevision: 1, code: 'new code' }).expect(200);
    expect(updated.body.revision).toBe(2);
    const historical = await http().get(path + '/revisions/1').expect(200);
    expect(historical.body.code).toBe(input.code);
    await http().patch(path).set('Authorization', authorization)
      .send({ expectedRevision: 1, code: 'stale code' }).expect(409);
  });

  it('validates line ranges and recalculates scores after comment mutations', async () => {
    const { id, secret } = await createPaste();
    const path = '/api/pastes/' + id;
    const comments = path + '/revisions/1/comments';
    const payload = { startLine: 1, endLine: 2, body: 'Prefer a better name', rating: 4 };
    await http().post(comments).send({ ...payload, endLine: 3 }).expect(400);
    await http().post(comments).send({ ...payload, startLine: 2, endLine: 1 }).expect(400);
    const { body: comment } = await http().post(comments).send(payload).expect(201);
    await http().post(comments).send({ ...payload, startLine: 2, rating: 2 }).expect(201);
    const score = async () => (await http().get(path).expect(200)).body.quality;
    expect(await score()).toEqual({ average: 3, count: 2 });
    const commentPath = '/api/comments/' + comment.id;
    await http().delete(commentPath).expect(403);
    await http().patch(commentPath).set('Authorization', 'Bearer ' + comment.secret)
      .send({ body: payload.body, rating: null }).expect(200);
    expect(await score()).toEqual({ average: 2, count: 1 });
    await http().delete(commentPath).set('Authorization', 'Bearer ' + comment.secret).expect(204);
    await http().patch(path).set('Authorization', 'Bearer ' + secret)
      .send({ expectedRevision: 1, code: 'new code' }).expect(200);
    expect(await score()).toEqual({ average: null, count: 0 });
    const old = await http().get(comments).expect(200);
    expect(old.body.items).toHaveLength(1);
    expect(old.body.items[0]).not.toHaveProperty('secret');
    await http().delete(path).expect(403);
    await http().delete(path).set('Authorization', 'Bearer ' + secret).expect(204);
    const [count] = await db.query('SELECT count(*)::int AS count FROM comments');
    expect(count.count).toBe(0);
  });
});
