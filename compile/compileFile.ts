import { cacheGet, CacheMethod, cacheSet } from '../cache.ts';
import { hashSource } from '../hash.ts';
import { ensureImportMap } from '../importmap/mod.ts';
import { fetchSourceFromPath } from '../path.ts';
import { compileSource } from './compileSource.ts';
import { ImportVisitor } from './ImportVisitor.ts';

/**
 * Compile a file using SWC. Uses the {@ImportVisitor} to rewrite imports to be
 * served from the {@appSourceMiddleware} or {@vendorSourceMiddleware}.
 * @async
 * The path of the file to be compiled.
 * @param {string} filePath
 * The path of the directory containing the cached files when the `cacheMethod` is 'disk'.
 * @param {string} cacheDirectoryPath
 * The cache method.
 * @param {CacheMethod} cacheMethod
 * The resolved imports.
 * @param {Record<string, string>} resolvedImports
 * The path of the directory containing the app source.
 * @param {string} sourceDirectoryPath
 * Path prefix from which the app source is served.
 * @param {string} appSourcePrefix
 * Path prefix from which the vendor source is served.
 * @param {string} vendorSourcePrefix
 * The compiled source.
 * @returns {Promise<string>}
 */
export const compileFile = async (
  filePath: string,
  cacheDirectoryPath: string,
  cacheMethod: CacheMethod,
  resolvedImports: Record<string, string>,
  sourceDirectoryPath: string,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<string> => {
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
