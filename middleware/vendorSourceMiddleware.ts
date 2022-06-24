import { CacheMethod, ensureCachedFile } from '../cache.ts';
import { compileSource } from '../compile/compileSource.ts';
import { ImportVisitor } from '../compile/ImportVisitor.ts';
import { denoPlugin, esbuild, Middleware } from '../deps.ts';
import { ensureImportMap, ensureResolvedImports } from '../importmap/mod.ts';
import { debug } from '../log.ts';
import {
  fetchSourceFromPath,
  internalToExternalURL,
  resolveLocalPath,
} from '../path.ts';

export type VendorSourceMiddlewareProps = {
  appSourcePrefix: string;
  cacheDirectoryPath: string;
  cacheMethod: CacheMethod;
  sourceDirectoryPath: string;
  vendorSourcePrefix: string;
};

export const vendorSourceMiddleware = ({
  appSourcePrefix = '/.x',
  cacheDirectoryPath = '.cache',
  cacheMethod = 'memory',
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: VendorSourceMiddlewareProps) => {
  debug('vendorSourceMiddleware');

  const middleware: Middleware = async (ctx, next) => {
    debug('vendorSourceMiddleware:middleware', ctx.request.url.pathname);

    if (!ctx.request.url.pathname.startsWith(vendorSourcePrefix)) {
      debug('vendorSourceMiddleware:skipping', ctx.request.url.pathname);

      await next();
      return;
    }

    const importMap = await ensureImportMap();

    const resolvedImports = await ensureResolvedImports({
      cacheDirectoryPath,
      cacheMethod,
    });

    // Find it in the import map
    const path = ctx.request.url.pathname.replace(`${vendorSourcePrefix}/`, '');
    const importMapURL = importMap.imports[path];

    debug('vendorSourceMiddleware:importMapURL', importMapURL);

    // Also try the external url directly in the compiled imports
    const externalURL = internalToExternalURL(
      ctx.request.url.toString(),
      vendorSourcePrefix,
    );

    debug('vendorSourceMiddleware:externalURL', externalURL);

    const importURL = importMapURL || externalURL;
    const resolvedImport = resolvedImports[importURL] || importURL;

    debug('vendorSourceMiddleware:resolvedImport', resolvedImport);

    const source = await fetchSourceFromPath(resolvedImport);
    const transpileFileResult = await ensureCachedFile(
      resolvedImport,
      source,
      cacheDirectoryPath,
      cacheMethod,
      async () => {
        // Don't bundle and it works...
        return source;

        // const bundledDirPath = resolveLocalPath('.cache/compiled');
        // const bundledPath = resolveLocalPath(`.cache/bundled/${path}.js`);
        // debug('vendorSourceMiddleware:bundledPath', bundledPath);
        // await Deno.mkdir(bundledDirPath, { recursive: true });

        // const externals = Object.keys(importMap.imports);
        // debug('vendorSourceMiddleware:externals', externals);

        // const result = await esbuild.build({
        //   plugins: [
        //     denoPlugin({
        //       importMapURL: new URL(
        //         resolveLocalPath('./importMap.json'),
        //         import.meta.url,
        //       ),
        //     }),
        //   ],
        //   entryPoints: [resolvedImport],
        //   outfile: bundledPath,
        //   external: [
        //     '/v86/react@18.1.0/deno/react.js',
        //   ],
        //   bundle: true,
        //   minify: false,
        //   splitting: false,
        //   format: 'esm',
        // });
        // debug('vendorSourceMiddleware:bundled', bundledPath);
        // // esbuild.stop();

        // if (result.errors.length) {
        //   throw result.errors[0];
        // }

        // const outFile = await Deno.readTextFile(bundledPath);

        // return outFile;
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
