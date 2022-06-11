import { assertEquals } from './deps.ts';

import { hashSource } from './hash.ts';

Deno.test('hashSource', () => {
  const actual = hashSource('Hello World');
  const expected =
    '2c74fd17edafd80e8447b0d46741ee243b7eb74dd2149a0ab1b9246fb30382f27e853d8585719e0e67cbda0daa8f51671064615d645ae27acb15bfb1447f459b';

  assertEquals(actual, expected);
});
