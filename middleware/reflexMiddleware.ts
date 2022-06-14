import { CacheMethod } from '../cache.ts';
import { Middleware } from '../deps.ts';
import { appSourceMiddleware } from './appSourceMiddleware.ts';
import { resolveLocalPath } from '../path.ts';
import {
  DocumentElement,
  RenderFunction,
  serverSideRenderMiddleware,
} from './serverSideRenderMiddleware.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';
import { vendorSourceMiddleware } from './vendorSourceMiddleware.ts';

export type ReflexMiddlewareProps = {
  Document: DocumentElement;
  appSourcePrefix?: string;
  cacheDirectoryPath?: string;
  cacheMethod?: CacheMethod;
  render?: RenderFunction;
  sourceDirectoryPath?: string;
  vendorSourcePrefix?: string;
};

export const reflexMiddleware = async ({
  Document,
  appSourcePrefix = '/.x',
  cacheDirectoryPath = '.cache',
  cacheMethod = 'memory',
  render,
  sourceDirectoryPath = resolveLocalPath('./app'),
  vendorSourcePrefix = '/.v',
}: ReflexMiddlewareProps) => {
  const startTime = Date.now();

  const appSource = await appSourceMiddleware({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    sourceDirectoryPath,
    vendorSourcePrefix,
  });

  const serverSideRender = serverSideRenderMiddleware({
    Document,
    vendorSourcePrefix,
    render,
  });

  const staticFile = staticFileMiddleware();

  const vendorSource = await vendorSourceMiddleware({
    appSourcePrefix,
    cacheDirectoryPath,
    cacheMethod,
    sourceDirectoryPath,
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
