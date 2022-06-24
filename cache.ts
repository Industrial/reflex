import { hashSource } from './hash.ts';
import { debug } from './log.ts';

export type CacheMethod = 'memory' | 'disk';

export const ensureDirectory = async (path: string) => {
  await Deno.mkdir(path, { recursive: true });
};

const memoryCache = new Map<string, string>();

export const cacheGet = async (
  key: string,
  method: CacheMethod = 'memory',
  directory = '.cache',
): Promise<string | undefined> => {
  // console.log('cache.get', key, method, directory);

  if (method === 'memory') {
    return memoryCache.get(key);
  }

  if (method === 'disk') {
    await ensureDirectory(directory);

    const path = `${directory}/${key}`;

    try {
      const cached = await Deno.readTextFile(path);
      return cached;
    } catch (_error: unknown) {
      return undefined;
    }
  }

  return undefined;
};

export const cacheSet = async (
  key: string,
  value: string,
  method: CacheMethod = 'memory',
  directory = '.cache',
): Promise<void> => {
  // console.log('cache.set', key, value, method, directory);

  if (method === 'memory') {
    memoryCache.set(key, value);
  }

  if (method === 'disk') {
    await ensureDirectory(directory);

    const path = `${directory}/${key}`;

    try {
      await Deno.writeTextFile(path, value);
    } catch (_error: unknown) {
      return undefined;
    }
  }
};

export const ensureCachedFile = async (
  filePath: string,
  source: string,
  cacheDirectoryPath: string,
  cacheMethod: CacheMethod,
  fn: (source: string) => Promise<string>,
) => {
  debug('ensureCachedFile', filePath);

  let cacheKey: string = filePath;
  if (cacheMethod === 'disk') {
    cacheKey = hashSource(source);
  }

  const cached = await cacheGet(cacheKey, cacheMethod, cacheDirectoryPath);
  if (cached) {
    debug('ensureCachedFile:cached', filePath);
    return cached;
  }

  const result = await fn(source);

  await cacheSet(cacheKey, result, cacheMethod, cacheDirectoryPath);

  return result;
};
