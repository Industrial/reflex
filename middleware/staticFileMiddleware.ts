import { Middleware } from '../deps.ts';

export const staticFileMiddleware = () => {
  const middleware: Middleware = async (ctx, next) => {
    try {
      const path = await ctx.send({
        root: `${Deno.cwd()}/public`,
      });
      if (path) {
        return;
      }
      await next();
    } catch (_error: unknown) {
      await next();
    }
  };

  return middleware;
};
