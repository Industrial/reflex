import { CacheMethod } from '../cache.ts';
import { compileFile } from '../compile/compileFile.ts';
import { Middleware } from '../deps.ts';
import { ensureResolvedImports } from '../importmap/mod.ts';
import { resolveLocalPath } from '../path.ts';

export type AppSourceProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  sourceDirectoryPath: string;
  vendorSourcePrefix: string;
};

export const appSourceMiddleware = ({
  appSourcePrefix = '/.x',
  cacheMethod = 'memory',
  cacheDirectoryPath = '.cache',
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: AppSourceProps) => {
  const middleware: Middleware = async (ctx, next) => {
    if (!ctx.request.url.pathname.startsWith(appSourcePrefix)) {
      await next();
      return;
    }

    const resolvedImports = await ensureResolvedImports({
      cacheDirectoryPath,
      cacheMethod,
    });

    const path = ctx.request.url.pathname.replace(`${appSourcePrefix}/`, '');

    const transpileFileResult = await compileFile({
      vendorSourcePrefix,
      cacheDirectoryPath,
      cacheMethod,
      sourceDirectoryPath,
      resolvedImports,
      appSourcePrefix,
      filePath: `${sourceDirectoryPath}/${path}`,
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
