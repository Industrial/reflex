import { cacheGet, CacheMethod, cacheSet } from '../cache.ts';
import { hashSource } from '../hash.ts';
import { ensureImportMap } from '../importmap/mod.ts';
import { fetchSourceFromPath } from '../path.ts';
import { compileSource } from './compileSource.ts';
import { ImportVisitor } from './ImportVisitor.ts';

export const compileFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  resolvedImports,
  sourceDirectoryPath,
  filePath,
  vendorSourcePrefix,
}: {
  // Path prefix from which the app source is served.
  appSourcePrefix: string;
  // The path of the directory containing the cached files when the `cacheMethod` is 'disk'.
  cacheDirectoryPath: string;
  // The cache method.
  cacheMethod: CacheMethod;
  // The resolved imports.
  resolvedImports: Record<string, string>;
  // The path of the directory containing the app source.
  sourceDirectoryPath: string;
  // The path of the file to be compiled.
  filePath: string;
  // Path prefix from which the vendor source is served.
  vendorSourcePrefix: string;
}): Promise<string> => {
  let source: string;
  try {
    source = await fetchSourceFromPath(filePath);
  } catch (error: unknown) {
    if ((error as Error).message.includes('Is a directory')) {
      return filePath;
    }
    throw error;
  }

  let cacheKey: string = filePath;
  if (cacheMethod === 'disk') {
    cacheKey = hashSource(source);
  }

  const cached = await cacheGet(cacheKey, cacheMethod, cacheDirectoryPath);
  if (cached) {
    return cached;
  }

  const importMap = await ensureImportMap();

  try {
    const compiled = await compileSource(
      source,
      new ImportVisitor({
        appSourcePrefix,
        parsedImports: importMap.imports,
        resolvedImports,
        sourceDirectoryPath,
        filePath,
        vendorSourcePrefix,
      }),
    );

    await cacheSet(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

    return compiled;
  } catch (error: unknown) {
    console.error(error);
    return source;
  }
};
