import { CacheMethod, ensureCachedFile } from '../cache.ts';
import { compileFile } from '../compile/compileFile.ts';
import { Middleware } from '../deps.ts';
import { debug } from '../log.ts';
import { fetchSourceFromPath, resolveLocalPath } from '../path.ts';

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
  debug('appSourceMiddleware');

  const middleware: Middleware = async (ctx, next) => {
    debug('appSourceMiddleware:middleware', ctx.request.url.pathname);

    if (!ctx.request.url.pathname.startsWith(appSourcePrefix)) {
      debug('appSourceMiddleware:skipping', ctx.request.url.pathname);
      await next();
      return;
    }

    const path = ctx.request.url.pathname.replace(`${appSourcePrefix}/`, '');
    const filePath = `${sourceDirectoryPath}/${path}`;

    const source = await fetchSourceFromPath(filePath);
    const transpileFileResult = await ensureCachedFile(
      filePath,
      source,
      cacheDirectoryPath,
      cacheMethod,
      async () => {
        return await compileFile(
          filePath,
          source,
          cacheDirectoryPath,
          cacheMethod,
          sourceDirectoryPath,
          appSourcePrefix,
          vendorSourcePrefix,
        );
      },
    );

    if (!transpileFileResult) {
      await next();
      return;
    }

    ctx.response.headers.set(
      'Content-Type',
      'application/javascript;charset=UTF-8',
    );
    ctx.response.headers.set('Cache-Control', 'max-age=31536000');
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
