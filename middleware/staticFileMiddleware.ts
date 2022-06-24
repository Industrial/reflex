import { Middleware } from '../deps.ts';
import { debug } from '../log.ts';

export const staticFileMiddleware = () => {
  debug('staticFileMiddleware');

  const middleware: Middleware = async (ctx, next) => {
    debug('staticFileMiddleware:middleware', ctx.request.url.pathname);

    try {
      const path = await ctx.send({
        root: `${Deno.cwd()}/public`,
      });
      if (path) {
        debug('staticFileMiddleware:serving', ctx.request.url.pathname);
        ctx.response.headers.set('Cache-Control', 'max-age=31536000');
        return;
      }
      debug('staticFileMiddleware:skipping', ctx.request.url.pathname);
      await next();
    } catch (_error: unknown) {
      await next();
    }
  };

  return middleware;
};
