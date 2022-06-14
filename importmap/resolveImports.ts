import { cacheGet, CacheMethod, cacheSet } from '../cache.ts';
import { createGraph } from '../deps.ts';
import { resolvePathToURL } from '../path.ts';
import { hashSource } from '../hash.ts';
import { getImportMap } from './getImportMap.ts';

export type ResolveImportsProps = {
  appSourcePrefix: string;
  cacheDirectoryPath?: string;
  cacheMethod?: CacheMethod;
  vendorSourcePrefix: string;
};

export const resolveImports = async ({
  cacheDirectoryPath,
  cacheMethod,
}: ResolveImportsProps): Promise<Record<string, string>> => {
  const importMap = await getImportMap();
  let cacheKey = 'importMap.json';
  if (cacheMethod === 'disk') {
    cacheKey = hashSource(JSON.stringify(importMap));
  }

  const cached = await cacheGet(cacheKey, cacheMethod, cacheDirectoryPath);
  if (cached) {
    return JSON.parse(cached);
  }

  const resolvedImports: Record<string, string> = {};

  for (const [_key, path] of Object.entries(importMap.imports)) {
    const resolvedPath = resolvePathToURL(path);

    const graph = await createGraph(resolvedPath, {
      kind: 'codeOnly',
    });

    const { modules } = graph.toJSON();

    for (const module of modules) {
      const { specifier, local } = module;
      let modulePath = local || specifier;

      if (modulePath.startsWith('file://')) {
        modulePath = modulePath.replace('file://', '');
      }

      resolvedImports[specifier] = modulePath;
    }
  }

  const compiled = JSON.stringify(resolvedImports);

  await cacheSet(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

  return resolvedImports;
};
