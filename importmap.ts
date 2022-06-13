import { CacheMethod, get, set } from './cache.ts';
import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { createGraph, resolve } from './deps.ts';
import { fetchSourceFromPath, isPathAnURL } from './path.ts';
import { hashSource } from './hash.ts';

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
  cacheDirectoryPath?: string;
  cacheMethod?: CacheMethod;
  importMap: ImportMap;
  importMapPath: string;
  vendorSourcePrefix: string;
};

export const resolveImports = async ({
  cacheDirectoryPath,
  cacheMethod,
  importMap,
  importMapPath,
}: ResolveImportsProps): Promise<Record<string, string>> => {
  let cacheKey: string = importMapPath;
  if (cacheMethod === 'disk') {
    cacheKey = hashSource(JSON.stringify(importMap));
  }

  const cached = await get(cacheKey, cacheMethod, cacheDirectoryPath);
  if (cached) {
    return JSON.parse(cached);
  }

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

  await set(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

  return resolvedImports;
};

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
  // console.log('compileFile:local', local);
  // console.log('compileFile:specifier', specifier);
  // console.log('compileFile:cacheMethod', cacheMethod);
  // console.log('compileFile:cacheDirectoryPath', cacheDirectoryPath);
  // // console.log('compileFile:resolvedImports', resolvedImports);
  // console.log('compileFile:appSourcePrefix', appSourcePrefix);
  // console.log('compileFile:vendorSourcePrefix', vendorSourcePrefix);

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

  const cached = await get(cacheKey, cacheMethod, cacheDirectoryPath);
  if (cached) {
    return cached;
  }

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

    await set(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

    return compiled;
  } catch (error: unknown) {
    // console.error(`Error compiling ${specifier}. Using source.`);
    console.error(error);
    return source;
  }
};

export type CompileFilesProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  resolvedImports: Record<string, string>;
  sourceDirectoryPath: string;
  vendorSourcePrefix: string;
};

export const compileFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  resolvedImports,
  sourceDirectoryPath,
  vendorSourcePrefix,
}: CompileFilesProps): Promise<Record<string, string>> => {
  const compiledVendorFiles = await asyncMap<string>(
    async (_local, filePath) => {
      return await compileFile({
        appSourcePrefix,
        cacheDirectoryPath,
        cacheMethod,
        resolvedImports,
        sourceDirectoryPath,
        filePath,
        vendorSourcePrefix,
      });
    },
    resolvedImports,
  );

  return compiledVendorFiles;
};
