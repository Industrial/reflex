/** @jsx React.createElement */
import { Middleware, React, renderToReadableStream } from '../deps.ts';
import { DocumentElement } from '../types.ts';

export type ModifyStreamFunction = (
  applicationStream: ReadableStream,
) => ReadableStream;

export type ServerSideRenderMiddlewareProps = {
  Document: DocumentElement;
  modifyStream?: ModifyStreamFunction;
  vendorSourcePrefix: string;
};

export const serverSideRenderMiddleware = ({
  Document,
  modifyStream,
  vendorSourcePrefix,
}: ServerSideRenderMiddlewareProps) => {
  const middleware: Middleware = async (ctx) => {
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');

    let stream: ReadableStream = await renderToReadableStream(
      <Document
        request={ctx.request}
        vendorSourcePrefix={vendorSourcePrefix}
      />,
    );

    if (modifyStream) {
      stream = modifyStream(stream);
    }

    ctx.response.body = stream;
  };

  return middleware;
};
