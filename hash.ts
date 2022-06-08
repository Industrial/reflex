import { createHash } from 'https://deno.land/std@0.142.0/hash/mod.ts';

export const hashSource = (source: string): string => {
  const hash = createHash('sha512');
  hash.update(source);
  return hash.toString();
};
