import { createCache } from 'https://deno.land/x/deno_cache@0.4.1/mod.ts';
import { createGraph } from 'https://deno.land/x/deno_graph@0.27.0/mod.ts';
import { walk } from 'https://deno.land/std@0.140.0/fs/mod.ts';

import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { fetchSourceFromPath, isPathAnURL } from './path.ts';
import { resolve } from 'https://deno.land/std@0.140.0/path/mod.ts';

const cache = createCache();
const appSourcePrefix = '/.x';
const vendorSourcePrefix = '/.v';

export type ImportMap = {
  imports: Record<string, string>;
};

export const getImportMap = async (path: string): Promise<ImportMap> => {
  const decoder = new TextDecoder();
  const file = await Deno.readFile(path);
  const importMap = JSON.parse(decoder.decode(file)) as ImportMap;
  return importMap;
};

export const resolveImports = async (): Promise<Record<string, string>> => {
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

export const compileImports = async (
  resolvedImports: Record<string, string>,
): Promise<Record<string, string>> => {
  const compiledImports = await asyncMap<string>(
    async (local, specifier) => {
      const path = local || specifier;
      const source = await fetchSourceFromPath(path);
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
    resolvedImports,
  );

  return compiledImports;
};

export const compileApplicationFiles = async (directoryPath: string): Promise<
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

export let importMap: ImportMap;
try {
  importMap = await getImportMap(`${Deno.cwd()}/importMap.json`);
} catch (_error: unknown) {
  console.error('No importMap.json found.');
  Deno.exit();
}

export let resolvedImports: Record<string, string>;
try {
  resolvedImports = await resolveImports();
} catch (_error: unknown) {
  console.error('There was an error resolving imports.');
  Deno.exit();
}

export let compiledImports: Record<string, string>;
try {
  compiledImports = await compileImports(resolvedImports);
} catch (_error: unknown) {
  console.error('There was an error compiling imports.');
  Deno.exit();
}

export let transpileFiles: Record<string, string>;
try {
  transpileFiles = await compileApplicationFiles(`${Deno.cwd()}/app`);
} catch (_error: unknown) {
  console.error('There was an error compiling imports.');
  Deno.exit();
}
