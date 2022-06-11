import { createHash } from './deps.ts';

export const hashSource = (source: string): string => {
  const hash = createHash('sha512');
  hash.update(source);
  return hash.toString();
};
