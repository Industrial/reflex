import React, { ElementType } from 'https://esm.sh/react@18.1.0';
import { renderToReadableStream } from 'https://esm.sh/react-dom@18.1.0/server?dev';
import { Middleware } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

export type ServerSideRenderMiddlewareProps = {
  Document: ElementType;
  modifyStream?: (applicationStream: ReadableStream) => ReadableStream;
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
      <Document vendorSourcePrefix={vendorSourcePrefix} />,
    );

    if (modifyStream) {
      stream = modifyStream(stream);
    }

    ctx.response.body = stream;
  };

  return middleware;
};
