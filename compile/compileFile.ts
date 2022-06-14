import { cacheGet, CacheMethod, cacheSet } from '../cache.ts';
import { hashSource } from '../hash.ts';
import { getImportMap } from '../importmap/mod.ts';
import { fetchSourceFromPath } from '../path.ts';
import { compileSource } from './compileSource.ts';
import { ImportVisitor } from './ImportVisitor.ts';

export type CompileFileProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  resolvedImports: Record<string, string>;
  sourceDirectoryPath: string;
  filePath: string;
  vendorSourcePrefix: string;
};

export const compileFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  resolvedImports,
  sourceDirectoryPath,
  filePath,
  vendorSourcePrefix,
}: CompileFileProps): Promise<string> => {
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
