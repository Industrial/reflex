import { Middleware } from 'https://deno.land/x/oak@v10.6.0/middleware.ts';
import {
  compileApplicationFile,
  getImportMap,
  resolveImports,
} from '../importmap.ts';

export type AppSourceProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  importMapPath: string;
  sourceDirectoryPath: string;
  vendorSourcePrefix: string;
};

export const appSourceMiddleware = async ({
  appSourcePrefix,
  cacheDirectoryPath,
  importMapPath,
  sourceDirectoryPath,
  vendorSourcePrefix,
}: AppSourceProps) => {
  const importMap = await getImportMap(importMapPath);
  const resolvedImports = await resolveImports(importMap);

  const middleware: Middleware = async (ctx, next) => {
    if (!ctx.request.url.pathname.startsWith(appSourcePrefix)) {
      await next();
      return;
    }

    const path = ctx.request.url.pathname.replace(`${appSourcePrefix}/`, '');

    const transpileFileResult = await compileApplicationFile({
      vendorSourcePrefix,
      cacheDirectoryPath,
      importMap,
      sourceDirectoryPath,
      resolvedImports,
      appSourcePrefix,
      specifier: `${sourceDirectoryPath}/${path}`,
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
