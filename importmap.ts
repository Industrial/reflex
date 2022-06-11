import { CacheMethod, get, set } from './cache.ts';
import { ImportVisitor } from './ast/ImportVisitor.ts';
import { asyncMap } from './object.ts';
import { compileSource } from './compile.ts';
import { createGraph, resolve, walk } from './deps.ts';
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

export type CompileVendorFileProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  local: string;
  resolvedImports: Record<string, string>;
  specifier: string;
  vendorSourcePrefix: string;
};

export const compileVendorFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  local,
  resolvedImports,
  specifier,
  vendorSourcePrefix,
}: CompileVendorFileProps): Promise<string> => {
  let source: string;
  try {
    source = await fetchSourceFromPath(local || specifier);
  } catch (error: unknown) {
    if ((error as Error).message.includes('Is a directory')) {
      return local;
    }
    throw error;
  }

  let cacheKey: string = specifier;
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
        specifier,
        appSourcePrefix,
        vendorSourcePrefix,
        parsedImports: importMap.imports,
        resolvedImports,
      }),
    );

    await set(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

    return compiled;
  } catch (_error: unknown) {
    console.error(`Error compiling ${specifier}. Using source.`);
    return source;
  }
};

export type CompileVendorFilesProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
};

export const compileVendorFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  resolvedImports,
  vendorSourcePrefix,
}: CompileVendorFilesProps): Promise<Record<string, string>> => {
  const compiledVendorFiles = await asyncMap<string>(
    async (local, specifier) => {
      return await compileVendorFile({
        appSourcePrefix,
        cacheDirectoryPath,
        cacheMethod,
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
  cacheMethod: CacheMethod;
  sourceDirectoryPath: string;
  importMap: ImportMap;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
  specifier: string;
};

export const compileApplicationFile = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  sourceDirectoryPath,
  importMap,
  resolvedImports,
  vendorSourcePrefix,
  specifier,
}: CompileApplicationFileProps) => {
  const source = await Deno.readTextFile(specifier);

  let cacheKey: string = specifier;
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
        specifier,
        sourceDirectoryPath,
        appSourcePrefix,
        vendorSourcePrefix,
        parsedImports: importMap.imports,
        resolvedImports,
      }),
    );

    await set(cacheKey, compiled, cacheMethod, cacheDirectoryPath);

    return compiled;
  } catch (_error: unknown) {
    console.error(`Error compiling ${specifier}. Using source.`);
    return source;
  }
};

export type CompileApplicationFilesProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  sourceDirectoryPath: string;
  importMap: ImportMap;
  resolvedImports: Record<string, string>;
  vendorSourcePrefix: string;
};

export const compileApplicationFiles = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  sourceDirectoryPath,
  importMap,
  resolvedImports,
  vendorSourcePrefix,
}: CompileApplicationFilesProps): Promise<
  Record<string, string>
> => {
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
      cacheMethod,
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
