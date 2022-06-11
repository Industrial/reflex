import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

import { CacheMethod } from '../cache.ts';
import { DocumentElement } from '../types.ts';
import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { resolveLocalPath } from '../path.ts';
import { serverSideRenderMiddleware } from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';

export type ReflexMiddlewareProps = {
  Document: DocumentElement;
  appSourcePrefix?: string;
  cacheMethod?: CacheMethod;
  cacheDirectoryPath?: string;
  importMapPath?: string;
  modifyStream?: (applicationStream: ReadableStream) => ReadableStream;
  sourceDirectoryPath?: string;
  vendorSourcePrefix?: string;
};

export const reflexMiddleware = async ({
  Document,
  appSourcePrefix = '/.x',
  cacheMethod = 'memory',
  cacheDirectoryPath = './.cache',
  importMapPath = resolveLocalPath('./importMap.json'),
  modifyStream,
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: ReflexMiddlewareProps) => {
  const startTime = Date.now();

  const appSource = await appSourceMiddleware({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    importMapPath,
    sourceDirectoryPath,
    vendorSourcePrefix,
  });

  const serverSideRender = serverSideRenderMiddleware({
    Document,
    vendorSourcePrefix,
    modifyStream,
  });

  const staticFile = staticFileMiddleware();

  const vendorSource = await vendorSourceMiddleware({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    importMapPath,
    vendorSourcePrefix,
  });

  // TODO: Use Oak Compose here.
  const middleware: Middleware = async (ctx, next) => {
    await vendorSource(ctx, async () => {
      await appSource(ctx, async () => {
        await staticFile(ctx, async () => {
          await serverSideRender(ctx, next);
        });
      });
    });
  };

  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`Reflex middleware loaded in ${duration}ms`);

  return middleware;
};
