export type CacheMethod = 'memory' | 'disk';

export const ensureDirectory = async (path: string) => {
  await Deno.mkdir(path, { recursive: true });
};

const memoryCache = new Map<string, string>();

// TODO: put file hashing back.
export const get = async (
  key: string,
  method: CacheMethod = 'memory',
  directory = '.cache',
): Promise<string | undefined> => {
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

export const set = async (
  key: string,
  value: string,
  method: CacheMethod = 'memory',
  directory = '.cache',
): Promise<void> => {
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
