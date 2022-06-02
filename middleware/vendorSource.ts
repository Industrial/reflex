import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { compiledImports, importMap } from '../importmap.ts';
import { internalToExternalURL } from '../path.ts';

export type VendorSourceProps = {
  vendorSourcePrefix: string;
};

export const vendorSource = ({ vendorSourcePrefix }: VendorSourceProps) => {
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

    let transpileFileResult;
    if (importMapURL) {
      transpileFileResult = compiledImports[importMapURL];
    }
    if (!transpileFileResult) {
      transpileFileResult = compiledImports[externalURL];
    }
    if (!transpileFileResult) {
      await next();
      return;
    }

    ctx.response.headers.set('Content-Type', 'text/javascript;charset=UTF-8');
    ctx.response.body = transpileFileResult;
  };

  return middleware;
};
