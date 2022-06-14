import { cacheGet, CacheMethod, cacheSet } from '../cache.ts';
import { hashSource } from '../hash.ts';
import { getImportMap } from '../importmap/mod.ts';
import { fetchSourceFromPath } from '../path.ts';
import { compileSource } from './compileSource.ts';
import { ImportVisitor } from './ImportVisitor.ts';

export const compileFile = async ({
  // Path prefix from which the app source is served.
  appSourcePrefix,
  // The path of the directory containing the cached files when the `cacheMethod` is 'disk'.
  cacheDirectoryPath,
  // The cache method.
  cacheMethod,
  // The resolved imports.
  resolvedImports,
  // The path of the directory containing the app source.
  sourceDirectoryPath,
  // The path of the file to be compiled.
  filePath,
  // Path prefix from which the vendor source is served.
  vendorSourcePrefix,
}: {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  resolvedImports: Record<string, string>;
  sourceDirectoryPath: string;
  filePath: string;
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

  const importMap = await getImportMap();

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
