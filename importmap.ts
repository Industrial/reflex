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

export let importMap: ImportMap;
try {
  const decoder = new TextDecoder();
  const file = await Deno.readFile(`${Deno.cwd()}/importMap.json`);
  importMap = JSON.parse(decoder.decode(file)) as ImportMap;
} catch (_error: unknown) {
  console.error('No importMap.json found.');
  Deno.exit();
}

export type ImportMap = {
  imports: Record<string, string>;
};

export const resolvedImports: Record<string, string> = {};

for (const [_key, path] of Object.entries(importMap.imports)) {
  let resolvedPath: string;
  const isURL = isPathAnURL(path);
  if (isURL) {
    resolvedPath = path;
  } else {
    resolvedPath = resolve(`${Deno.cwd()}/${path}`);
    resolvedPath = `file://${resolvedPath}`;
    // resolvedPath = new URL(path, import.meta.url);
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

export const compiledImports = await asyncMap<string>(
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
    } catch (error: unknown) {
      console.error(`Error compiling ${specifier}. Using source.`);
      return source;
    }
  },
  resolvedImports,
);

const directoryPath = `${Deno.cwd()}/app`;
export const transpileFiles: Record<string, string> = {};
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
