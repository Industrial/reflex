import { CacheMethod, ensureCachedFile } from '../cache.ts';
import { bundle } from '../deps.ts';
import {
  ensureImportMap,
  ensureResolvedImports,
  ImportMap,
} from '../importmap/mod.ts';
import { debug } from '../log.ts';
import { fetchSourceFromPath, isPathAnURL } from '../path.ts';
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
  source: string,
  cacheDirectoryPath: string,
  cacheMethod: CacheMethod,
  sourceDirectoryPath: string,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<string> => {
  debug('compileFile', filePath);

  const importMap = await ensureImportMap();
  const resolvedImports = await ensureResolvedImports({
    cacheDirectoryPath,
    cacheMethod,
  });

  try {
    debug('compileFile:compiling', filePath);
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

    let bundled: string;
    if (isPathAnURL(filePath)) {
      console.log('path', filePath);
      bundled = (await bundle(new URL(filePath))).code;
      bundled = await compileSource(
        bundled,
        new ImportVisitor({
          appSourcePrefix,
          parsedImports: importMap.imports,
          resolvedImports,
          sourceDirectoryPath,
          filePath,
          vendorSourcePrefix,
        }),
      );
    } else {
      bundled = compiled;
    }

    debug('compileFile:complete', filePath);
    return bundled;
  } catch (error: unknown) {
    console.error(error);
    return source;
  }
};

export const compileAllImports = async (
  importMap: ImportMap,
  cacheDirectoryPath: string,
  cacheMethod: CacheMethod,
  sourceDirectoryPath: string,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<void> => {
  debug('compileAllImports:starting');

  for (const [key, filePath] of Object.entries(importMap.imports)) {
    debug('compileAllImports:entry', key, filePath);

    let source: string;
    try {
      source = await fetchSourceFromPath(filePath);
    } catch (error: unknown) {
      if ((error as Error).message.includes('Is a directory')) {
        continue;
      }
      throw error;
    }

    await ensureCachedFile(
      filePath,
      source,
      cacheDirectoryPath,
      cacheMethod,
      async () => {
        return await compileFile(
          filePath,
          source,
          cacheDirectoryPath,
          cacheMethod,
          sourceDirectoryPath,
          appSourcePrefix,
          vendorSourcePrefix,
        );
      },
    );
  }

  debug('compileAllImports:complete');
};
