import { createCache } from 'https://deno.land/x/deno_cache@0.4.1/mod.ts';
import { createGraph } from 'https://deno.land/x/deno_graph@0.27.0/mod.ts';
import { walk } from 'https://deno.land/std@0.140.0/fs/mod.ts';

import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { fetchSourceFromPath, isPathAnURL } from './path.ts';
import { resolve } from 'https://deno.land/std@0.140.0/path/mod.ts';
import { hashSource } from './hash.ts';

const cache = createCache();

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

let resolvedImports: Record<string, string>;
export const resolveImports = async (
  importMap: ImportMap,
): Promise<Record<string, string>> => {
  if (resolvedImports) {
    return resolvedImports;
  }

  resolvedImports = {};

  for (const [_key, path] of Object.entries(importMap.imports)) {
    let resolvedPath: string;
    const isURL = isPathAnURL(path);
    if (isURL) {
      resolvedPath = path;
    } else {
      resolvedPath = resolve(`${Deno.cwd()}/${path}`);
      resolvedPath = `file://${resolvedPath}`;
    }
    const graph = await createGraph(resolvedPath.toString(), {
      kind: 'codeOnly',
      cacheInfo: cache.cacheInfo,
      load: cache.load,
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

  return resolvedImports;
};

export type CompileVendorFileProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  importMap: ImportMap;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
};

export const compileVendorFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  importMap,
  resolvedImports,
  vendorSourcePrefix,
}: CompileVendorFileProps): Promise<Record<string, string>> => {
  await Deno.mkdir(cacheDirectoryPath, { recursive: true });
  await Deno.mkdir(`${cacheDirectoryPath}${appSourcePrefix}`, {
    recursive: true,
  });
  await Deno.mkdir(`${cacheDirectoryPath}${vendorSourcePrefix}`, {
    recursive: true,
  });

  const compiledVendorFiles = await asyncMap<string>(
    async (local, specifier) => {
      let source: string;
      try {
        source = await fetchSourceFromPath(local || specifier);
      } catch (error: unknown) {
        if ((error as Error).message.includes('Is a directory')) {
          return local;
        }
        throw error;
      }

      const hash = hashSource(source);
      const path = `${cacheDirectoryPath}${vendorSourcePrefix}/${hash}`;
      try {
        const cached = await Deno.readTextFile(path);
        return cached;
      } catch (_error: unknown) {
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
          await Deno.writeTextFile(path, compiled);
          return compiled;
        } catch (_error: unknown) {
          console.error(`Error compiling ${specifier}. Using source.`);
          return source;
        }
      }
    },
    resolvedImports,
  );

  return compiledVendorFiles;
};

export const compileApplicationFiles = async (
  directoryPath: string,
  importMap: ImportMap,
  resolvedImports: Record<string, string>,
  appSourcePrefix: string,
  vendorSourcePrefix: string,
): Promise<
  Record<string, string>
> => {
  const transpileFiles: Record<string, string> = {};
  for await (
    const entry of walk(directoryPath, {
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
    const path = entry.path.replace(`${directoryPath}/`, '');
    const source = await Deno.readTextFile(entry.path);
    transpileFiles[path] = await compileSource(
      source,
      new ImportVisitor({
        specifier: path,
        directoryPath,
        appSourcePrefix,
        vendorSourcePrefix,
        parsedImports: importMap.imports,
        resolvedImports,
      }),
    );
  }
  return transpileFiles;
};
