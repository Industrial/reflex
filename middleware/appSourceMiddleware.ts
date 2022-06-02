import { Middleware } from 'https://deno.land/x/oak@v10.6.0/middleware.ts';
import {
  compileApplicationFiles,
  getImportMap,
  resolveImports,
} from '../importmap.ts';

export type AppSourceProps = {
  appSourcePrefix: string;
  vendorSourcePrefix: string;
  importMapPath: string;
};

export const appSourceMiddleware = async ({
  appSourcePrefix,
  vendorSourcePrefix,
  importMapPath,
}: AppSourceProps) => {
  const importMap = await getImportMap(importMapPath);
  const resolvedImports = await resolveImports(importMap);

  let compiledApplicationFiles: Record<string, string>;
  try {
    compiledApplicationFiles = await compileApplicationFiles(
      `${Deno.cwd()}/app`,
      importMap,
      resolvedImports,
      appSourcePrefix,
      vendorSourcePrefix,
    );
  } catch (_error: unknown) {
    console.error('There was an error compiling imports.');
    Deno.exit();
  }

  const middleware: Middleware = async (ctx, next) => {
    if (!ctx.request.url.pathname.startsWith(appSourcePrefix)) {
      await next();
      return;
    }

    const path = ctx.request.url.pathname.replace(`${appSourcePrefix}/`, '');

    const transpileFileResult = compiledApplicationFiles[path];
    if (!transpileFileResult) {
      await next();
      return;
    }

    ctx.response.headers.set('Content-Type', 'text/javascript;charset=UTF-8');
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
