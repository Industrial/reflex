import { from } from 'https://deno.land/std@0.143.0/node/internal/streams/readable.mjs';

// Concatenates several readable streams into one.
export function concatenateReadableStreams(
  ...streams: Array<ReadableStream>
): ReadableStream {
  const { readable, writable } = new TransformStream();
  (async () => {
    let i = 0;
    for (const stream of streams) {
      await stream.pipeTo(writable, {
        preventClose: true,
      });
      i = i + 1;
      if (i === streams.length) {
        await writable.getWriter().close();
      }
    }
  })();
  return readable;
}

// Streams a string.
export function streamString(input: string): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
}

// Takes two streams, the head and body content and returns a concatenated
// complete HTML stream with the html, head and body tags around them.
export function streamDocument(head: ReadableStream, body: ReadableStream) {
  return concatenateReadableStreams(
    streamString('<!DOCTYPE html><head>'),
    head,
    streamString('</head><body>'),
    body,
    streamString('</body></html>'),
  );
}

// Converts a NodeJS.ReadableStream to a Deno.ReadableStream.
export const nodeReadableStreamToWebReadableStream = (
  inputStream: NodeJS.ReadableStream,
): ReadableStream => {
  const outputStream = new TransformStream();
  const outputStreamWritableWriter = outputStream.writable.getWriter();

  (async () => {
    for await (const chunk of inputStream) {
      outputStreamWritableWriter.write(chunk);
    }
  })().then(() => {
    outputStreamWritableWriter.close();
  }).catch((error) => {
    outputStreamWritableWriter.abort(error);
  });

  return outputStream.readable;
};

// Converts a Deno.ReadableStream to a NodeJS.ReadableStream.
export const webReadableStreamToNodeReadableStream = (
  inputStream: ReadableStream,
): NodeJS.ReadableStream => {
  return from(inputStream);
};
