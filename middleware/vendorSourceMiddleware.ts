import { CacheMethod } from '../cache.ts';
import { Middleware } from '../deps.ts';
import {
  compileVendorFile,
  getImportMap,
  resolveImports,
} from '../importmap.ts';
import { internalToExternalURL, resolveLocalPath } from '../path.ts';

export type VendorSourceMiddlewareProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  importMapPath: string;
  vendorSourcePrefix: string;
};

export const vendorSourceMiddleware = async ({
  appSourcePrefix = '/.x',
  cacheMethod = 'memory',
  cacheDirectoryPath = '.cache',
  importMapPath = resolveLocalPath('./importMap.json'),
  vendorSourcePrefix = '/.v',
}: VendorSourceMiddlewareProps) => {
  // console.log('vendorSourceMiddleware:cacheMethod', cacheMethod);
  // console.log('vendorSourceMiddleware:cacheDirectoryPath', cacheDirectoryPath);
  // console.log('vendorSourceMiddleware:importMapPath', importMapPath);
  // console.log('vendorSourceMiddleware:appSourcePrefix', appSourcePrefix);
  // console.log('vendorSourceMiddleware:vendorSourcePrefix', vendorSourcePrefix);

  const importMap = await getImportMap(importMapPath);
  const resolvedImports = await resolveImports({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    importMap,
    importMapPath,
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

    const transpileFileResult = await compileVendorFile({
      appSourcePrefix,
      cacheDirectoryPath,
      cacheMethod,
      local: resolvedImport,
      resolvedImports,
      specifier: importURL,
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
