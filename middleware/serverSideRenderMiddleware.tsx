/** @jsx React.createElement */
import {
  Middleware,
  OakRequest,
  React,
  renderToReadableStream,
} from '../deps.ts';

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
  const middleware: Middleware = async (ctx) => {
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');

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
  };

  return middleware;
};
