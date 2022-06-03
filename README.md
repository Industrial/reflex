# Reflex

A [React](https://reactjs.org) framework for [Deno](https://deno.land) and [Oak](https://deno.land/x/oak).

## Features

- React 18's Streaming Server Side Rendering.
- No bundlers like webpack needed. Use modern ~~Java~~TypeScript.
- Serves all vendor files locally, ensuring that your users get what you expect and you don't need an external CDN.
- Caching out of the box using the Deno cache.

## Quick Start

See https://github.com/Industrial/create-reflex-app for a quick start guide.

## Guide

### `server.ts`

Create a file called `server.ts` in the root of your project.

```ts
// Import Oak, the web framework for Deno.
import { Application } from 'https://deno.land/x/oak@v10.6.0/mod.ts';
// Import the middleware from Reflex.
import { reflexMiddleware } from 'https://deno.land/x/reflex@v0.3.0/mod.ts';

// This is the server side HTML of your app. We will create this file later on.
import { Document } from './app/Document.tsx';

// Set a hostname and port to listen on and create an Oak application.
const hostname = Deno.env.get('hostname') ?? '127.0.0.1';
const port = Number(Deno.env.get('port') ?? 3000);
const app = new Application();

// Use the Reflex middleware.
app.use(await reflexMiddleware({ Document }));

// Start the Oak server.
console.log(`Listening on http://${hostname}:${port}`);

await app.listen({
  hostname,
  port,
});
```
