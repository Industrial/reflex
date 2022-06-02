import { Middleware } from 'https://deno.land/x/oak@v10.6.0/middleware.ts';
import { transpileFiles } from '../importmap.ts';

export type AppSourceProps = {
  appSourcePrefix: string;
};

export const appSource = ({ appSourcePrefix }: AppSourceProps) => {
  const middleware: Middleware = async (ctx, next) => {
    if (!ctx.request.url.pathname.startsWith(appSourcePrefix)) {
      await next();
      return;
    }

    const path = ctx.request.url.pathname.replace(`${appSourcePrefix}/`, '');

    const transpileFileResult = transpileFiles[path];
    if (!transpileFileResult) {
      await next();
      return;
    }

    ctx.response.headers.set('Content-Type', 'text/javascript;charset=UTF-8');
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
