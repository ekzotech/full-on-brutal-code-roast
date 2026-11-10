import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreatePaste } from './dto';

describe('CreatePaste', () => {
  test.each(['', ' \n\t', 'x'.repeat(51201), 'я'.repeat(25601), 'a\0b'])(
    'rejects invalid code case %#',
    async (code) => {
      const dto = Object.assign(new CreatePaste(), { code, title: 'Loop', language: 'typescript' });
      expect((await validate(dto)).map((error) => error.property)).toEqual(['code']);
    },
  );

  test.each([1, 25600])('accepts %i UTF-8 characters at or below the limit', async (length) => {
    const dto = Object.assign(new CreatePaste(), {
      code: 'я'.repeat(length),
      title: 'Loop',
      language: 'typescript',
    });
    expect(await validate(dto)).toEqual([]);
  });
});
