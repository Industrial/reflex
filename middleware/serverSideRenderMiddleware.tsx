/** @jsx React.createElement */
import {
  Middleware,
  OakRequest,
  React,
  renderToReadableStream,
} from '../deps.ts';
import { debug } from '../log.ts';

export type DocumentElement = React.ElementType<DocumentProps>;

export type DocumentProps = {
  request: OakRequest;
  vendorSourcePrefix: string;
};

export type RenderFunction = (
  render: typeof renderToReadableStream,
  document: JSX.Element,
) => Promise<ReadableStream>;

export type ServerSideRenderMiddlewareProps = {
  Document: DocumentElement;
  render?: RenderFunction;
  vendorSourcePrefix: string;
};

export const serverSideRenderMiddleware = ({
  Document,
  render,
  vendorSourcePrefix,
}: ServerSideRenderMiddlewareProps) => {
  debug('serverSideRenderMiddleware');

  const middleware: Middleware = async (ctx) => {
    debug('serverSideRenderMiddleware:middleware', ctx.request.url.pathname);

    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');

    try {
      const documentElement = (
        <Document
          request={ctx.request}
          vendorSourcePrefix={vendorSourcePrefix}
        />
      );

      let stream: ReadableStream;
      if (render) {
        stream = await render(renderToReadableStream, documentElement);
      } else {
        stream = await renderToReadableStream(documentElement);
      }

      ctx.response.body = stream;
    } catch (_error) {
      ctx.response.status = 500;
      ctx.response.body = 'Internal Server Error';
    }
  };

  return middleware;
};
