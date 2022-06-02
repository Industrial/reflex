import { createCache } from 'https://deno.land/x/deno_cache@0.4.1/mod.ts';
import { createGraph } from 'https://deno.land/x/deno_graph@0.27.0/mod.ts';
import { walk } from 'https://deno.land/std@0.140.0/fs/mod.ts';

import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { fetchSourceFromPath } from './path.ts';

const cache = createCache();
const appSourcePrefix = '/.x';
const vendorSourcePrefix = '/.v';

export const importMap = new TextDecoder('utf-8').decode(
  await Deno.readFile(`${Deno.cwd()}/importMap.json`),
);

export type ImportMap = {
  imports: Record<string, string>;
};

export const parsedImportMap = JSON.parse(importMap) as ImportMap;
export const resolvedImports: Record<string, string> = {};

for (const [_key, path] of Object.entries(parsedImportMap.imports)) {
  const graph = await createGraph(path, {
    kind: 'codeOnly',
    cacheInfo: cache.cacheInfo,
    load: cache.load,
  });
  const { modules } = graph.toJSON();
  for (const module of modules) {
    const { specifier, local } = module;
    resolvedImports[specifier] = String(local);
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
          parsedImports: parsedImportMap.imports,
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
      parsedImports: parsedImportMap.imports,
      resolvedImports,
    }),
  );
}
