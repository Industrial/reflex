import {
  Cacher,
  createCache,
  Loader,
} from 'https://deno.land/x/deno_cache@0.4.1/mod.ts';
import {
  createGraph,
  ModuleGraph,
} from 'https://deno.land/x/deno_graph@0.27.0/mod.ts';
import { resolve } from 'https://deno.land/std@0.140.0/path/mod.ts';
import { walk } from 'https://deno.land/std@0.140.0/fs/mod.ts';

import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { ensureCachedFile, ensureCacheDirectory } from './cache.ts';
import { fetchSourceFromPath, isPathAnURL } from './path.ts';

export type ImportMap = {
  imports: Record<string, string>;
};

let importMap: ImportMap;
export const getImportMap = async (path: string): Promise<ImportMap> => {
  if (importMap) {
    return importMap;
  }
  const decoder = new TextDecoder();
  const file = await Deno.readFile(path);
  importMap = JSON.parse(decoder.decode(file)) as ImportMap;
  return importMap;
};

export type ResolveImportsProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  importMap: ImportMap;
  importMapPath: string;
  useDenoCache: boolean;
  vendorSourcePrefix: string;
};

export const resolveImports = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  importMap,
  importMapPath,
  useDenoCache = false,
  vendorSourcePrefix,
}: ResolveImportsProps): Promise<Record<string, string>> => {
  let cache: Loader & Cacher;
  if (useDenoCache) {
    cache = createCache();
  }

  const source = await Deno.readTextFile(importMapPath);

  await ensureCacheDirectory(
    cacheDirectoryPath,
    appSourcePrefix,
    vendorSourcePrefix,
  );

  const compiled = await ensureCachedFile(
    cacheDirectoryPath,
    source,
    async () => {
      const resolvedImports: Record<string, string> = {};

      for (const [_key, path] of Object.entries(importMap.imports)) {
        let resolvedPath: string;
        const isURL = isPathAnURL(path);

        if (isURL) {
          resolvedPath = path;
        } else {
          resolvedPath = resolve(`${Deno.cwd()}/${path}`);
          resolvedPath = `file://${resolvedPath}`;
        }

        let graph: ModuleGraph;
        if (useDenoCache) {
          graph = await createGraph(resolvedPath.toString(), {
            kind: 'codeOnly',
            cacheInfo: cache.cacheInfo,
            load: cache.load,
          });
        } else {
          graph = await createGraph(resolvedPath.toString(), {
            kind: 'codeOnly',
          });
        }

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

      return JSON.stringify(resolvedImports);
    },
  );

  return JSON.parse(compiled);
};

export type CompileVendorFileProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  local: string;
  resolvedImports: Record<string, string>;
  specifier: string;
  vendorSourcePrefix: string;
};

export const compileVendorFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  local,
  resolvedImports,
  specifier,
  vendorSourcePrefix,
}: CompileVendorFileProps) => {
  let source: string;
  try {
    source = await fetchSourceFromPath(local || specifier);
  } catch (error: unknown) {
    if ((error as Error).message.includes('Is a directory')) {
      return local;
    }
    throw error;
  }

  return await ensureCachedFile(
    `${cacheDirectoryPath}${vendorSourcePrefix}`,
    source,
    async () => {
      try {
        const compiled = await compileSource(
          source,
          new ImportVisitor({
            specifier,
            appSourcePrefix,
            vendorSourcePrefix,
            parsedImports: importMap.imports,
            resolvedImports,
          }),
        );
        return compiled;
      } catch (_error: unknown) {
        console.error(`Error compiling ${specifier}. Using source.`);
        return source;
      }
    },
  );
};

export type CompileVendorFilesProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
};

export const compileVendorFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  resolvedImports,
  vendorSourcePrefix,
}: CompileVendorFilesProps): Promise<Record<string, string>> => {
  await ensureCacheDirectory(
    cacheDirectoryPath,
    appSourcePrefix,
    vendorSourcePrefix,
  );

  const compiledVendorFiles = await asyncMap<string>(
    async (local, specifier) => {
      return await compileVendorFile({
        appSourcePrefix,
        cacheDirectoryPath,
        local,
        resolvedImports,
        specifier,
        vendorSourcePrefix,
      });
    },
    resolvedImports,
  );

  return compiledVendorFiles;
};

export type CompileApplicationFileProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  sourceDirectoryPath: string;
  importMap: ImportMap;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
  specifier: string;
};

export const compileApplicationFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  sourceDirectoryPath,
  importMap,
  resolvedImports,
  vendorSourcePrefix,
  specifier,
}: CompileApplicationFileProps) => {
  const source = await Deno.readTextFile(specifier);

  const compiled = await ensureCachedFile(
    `${cacheDirectoryPath}${appSourcePrefix}`,
    source,
    async () => {
      try {
        const compiled = await compileSource(
          source,
          new ImportVisitor({
            specifier,
            sourceDirectoryPath,
            appSourcePrefix,
            vendorSourcePrefix,
            parsedImports: importMap.imports,
            resolvedImports,
          }),
        );
        return compiled;
      } catch (_error: unknown) {
        console.error(`Error compiling ${specifier}. Using source.`);
        return source;
      }
    },
  );

  return compiled;
};

export type CompileApplicationFilesProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  sourceDirectoryPath: string;
  importMap: ImportMap;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
};

export const compileApplicationFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  sourceDirectoryPath,
  importMap,
  resolvedImports,
  vendorSourcePrefix,
}: CompileApplicationFilesProps): Promise<
  Record<string, string>
> => {
  await ensureCacheDirectory(
    cacheDirectoryPath,
    appSourcePrefix,
    vendorSourcePrefix,
  );

  const transpileFiles: Record<string, string> = {};
  for await (
    const entry of walk(sourceDirectoryPath, {
      includeDirs: false,
      followSymlinks: true,
      exts: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ],
    })
  ) {
    const path = entry.path.replace(`${sourceDirectoryPath}/`, '');

    const compiled = await compileApplicationFile({
      appSourcePrefix,
      cacheDirectoryPath,
      sourceDirectoryPath,
      importMap,
      resolvedImports,
      vendorSourcePrefix,
      specifier: entry.path,
    });

    transpileFiles[path] = compiled;
  }

  return transpileFiles;
};
