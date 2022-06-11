import { Middleware } from '../deps.ts';

export const staticFileMiddleware = () => {
  const middleware: Middleware = async (ctx, next) => {
    try {
      const path = await ctx.send({
        root: `${Deno.cwd()}/public`,
      });
      if (path) {
        ctx.response.headers.set('Cache-Control', 'max-age=31536000');
        return;
      }
      await next();
    } catch (_error: unknown) {
      await next();
    }
  };

  return middleware;
};
