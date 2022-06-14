import { CacheMethod } from '../cache.ts';
import { compileFile } from '../compile/compileFile.ts';
import { Middleware } from '../deps.ts';
import { getImportMap, resolveImports } from '../importmap/mod.ts';
import { internalToExternalURL, resolveLocalPath } from '../path.ts';

export type VendorSourceMiddlewareProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  sourceDirectoryPath: string;
  vendorSourcePrefix: string;
};

export const vendorSourceMiddleware = async ({
  appSourcePrefix = '/.x',
  cacheDirectoryPath = '.cache',
  cacheMethod = 'memory',
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: VendorSourceMiddlewareProps) => {
  const importMap = await getImportMap();
  const resolvedImports = await resolveImports({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    vendorSourcePrefix,
  });

  const middleware: Middleware = async (ctx, next) => {
    if (!ctx.request.url.pathname.startsWith(vendorSourcePrefix)) {
      await next();
      return;
    }

    // Find it in the import map
    const path = ctx.request.url.pathname.replace(`${vendorSourcePrefix}/`, '');
    const importMapURL = importMap.imports[path];

    // Also try the external url directly in the compiled imports
    const externalURL = internalToExternalURL(
      ctx.request.url.toString(),
      vendorSourcePrefix,
    );

    const importURL = importMapURL || externalURL;
    const resolvedImport = resolvedImports[importURL] || importURL;

    const transpileFileResult = await compileFile({
      appSourcePrefix,
      cacheDirectoryPath,
      cacheMethod,
      resolvedImports,
      sourceDirectoryPath,
      filePath: resolvedImport,
      vendorSourcePrefix,
    });

    if (!transpileFileResult) {
      await next();
      return;
    }

    ctx.response.headers.set('Content-Type', 'text/javascript;charset=UTF-8');
    ctx.response.headers.set('Cache-Control', 'max-age=31536000');
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
