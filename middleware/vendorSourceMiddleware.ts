import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';
import { CacheMethod } from '../cache.ts';

import {
  compileVendorFile,
  getImportMap,
  resolveImports,
} from '../importmap.ts';
import { internalToExternalURL } from '../path.ts';

export type VendorSourceMiddlewareProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  importMapPath: string;
  vendorSourcePrefix: string;
};

export const vendorSourceMiddleware = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  cacheMethod,
  importMapPath,
  vendorSourcePrefix,
}: VendorSourceMiddlewareProps) => {
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
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
