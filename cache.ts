import { hashSource } from './hash.ts';

export async function ensureCacheDirectory(
  cacheDirectoryPath: string,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<void> {
  await Deno.mkdir(cacheDirectoryPath, { recursive: true });
  await Deno.mkdir(`${cacheDirectoryPath}${appSourcePrefix}`, {
    recursive: true,
  });
  await Deno.mkdir(`${cacheDirectoryPath}${vendorSourcePrefix}`, {
    recursive: true,
  });
}

export const ensureCachedFile = async (
  cacheFilePath: string,
  source: string,
  compile: (hash: string, hashPath: string) => Promise<string>,
) => {
  const hash = hashSource(source);
  const hashPath = `${cacheFilePath}/${hash}`;
  try {
    const cached = await Deno.readTextFile(hashPath);
    return cached;
  } catch (_error: unknown) {
    const compiled = await compile(hash, hashPath);
    await Deno.writeTextFile(hashPath, compiled);
    return compiled;
  }
};
