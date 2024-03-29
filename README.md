# Reflex

[![Build](https://img.shields.io/github/workflow/status/Industrial/reflex/On%20Push%20&%20PR)](https://github.com/Industrial/reflex/actions/workflows/on-push-and-pr.yml)
[![Issues](https://img.shields.io/github/issues/Industrial/reflex)](https://github.com/Industrial/reflex/issues)
[![License](https://img.shields.io/github/license/Industrial/reflex)](https://github.com/Industrial/reflex/blob/main/LICENSE)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/Industrial/reflex)](https://github.com/Industrial/reflex/commits/main)
[![Discord](https://img.shields.io/discord/365982843970650113)](https://discord.gg/F3E35cx)

A [React](https://reactjs.org) framework for [Deno](https://deno.land) and [Oak](https://deno.land/x/oak).

## Fast

Reflex apps are fast and performant. Check out the [Lighthouse Score](https://pagespeed.web.dev/report?url=https%3A%2F%2Ftodo-reflex.deno.dev%2Flist&form_factor=mobile) of the demo app.

## Features

- React 18's Streaming server-side Rendering.
- No bundlers like webpack needed. Use modern ~~Java~~TypeScript.
- Serves all vendor files locally, ensuring that your users get what you expect and you don't need an external CDN.
- Caching out of the box using the Deno cache.

## Docs

[API Docs](https://doc.deno.land/https://deno.land/x/reflex/mod.ts)

## Support

Create an [Issue](https://github.com/Industrial/reflex/issues) or come hang out on [Discord](https://discord.gg/CvPVVeVk).

## Quick Start

See [create-reflex-app](https://github.com/Industrial/create-reflex-app) for a quick start guide.

See [todo](https://github.com/Industrial/todo) for an app I'm building with Reflex.

## Guide

### `server.ts`

Create a file called `server.ts` in the root of your project.

```ts
// Import Oak, the web framework for Deno.
import { Application } from 'https://deno.land/x/oak@v10.6.0/mod.ts';
// Import the middleware from Reflex.
import { reflexMiddleware } from 'https://deno.land/x/reflex/mod.ts';

// This is the server side HTML of your app. We will create this file later on.
import { Document } from './app/Document.tsx';

// Set a hostname and port to listen on and create an Oak application.
const hostname = Deno.env.get('hostname') ?? '127.0.0.1';
const port = Number(Deno.env.get('port') ?? 3000);
const app = new Application();

// Use the Reflex middleware.
app.use(reflexMiddleware({
  Document,
  // Reflex uses a memory cache for assets by default (Edge Function's can't
  // write to disk) but you can set it to disk for a speedy development
  // experience.
  cacheMethod: 'disk',
}));

// Start the Oak server.
console.log(`Listening on http://${hostname}:${port}`);

await app.listen({
  hostname,
  port,
});
```

### `app/Document.tsx`

Create a file called `Document.tsx` in the `app` directory.

```ts
// This is a module that is pulled from the `importMap.json` file.
import React from 'react';

// Easy types on the Document.
import type { DocumentElement } from 'https://deno.land/x/reflex/mod.ts';

// This is the App file, the root component of your app.
import { App } from './App.tsx';

// The Server Side Rendering part of your React application. This will not be
// rendered on the client side.
export const Document: DocumentElement = ({ vendorSourcePrefix }) => {
  return (
    <html>
      <head>
        <title>React Streaming</title>
      </head>
      <body>
        <div id='root'>
          <App />
        </div>
        {/* This script loads and hydrates the application in the browser. It loads <App /> under the id `root`. */}
        <script
          type='module'
          defer
          dangerouslySetInnerHTML={{
            __html: `
                import { createElement } from '${vendorSourcePrefix}/react';
                import { createRoot, hydrateRoot } from '${vendorSourcePrefix}/react-dom/client';
                import { App } from '/.x/App.tsx';
                const rootElement = document.getElementById('root');
                const appElement = createElement(App);
                hydrateRoot(rootElement, appElement);
              `,
          }}
        >
        </script>
      </body>
    </html>
  );
};
```

### `app/App.tsx`

Create a file called `App.tsx` in the `app` directory.

```ts
// This is a module that is pulled from the `importMap.json` file.
import React, { Suspense } from 'react';

export const App = () => {
  return (
    <div>
      <h1>Application</h1>
      <p>My application!</p>
    </div>
  );
};
```

### `importMap.json`

Create a file called `importMap.json` in the root of your project.

```json
{
  "imports": {
    "react": "https://esm.sh/react@18.1.0",
    "react-dom": "https://esm.sh/react-dom@18.1.0",
    "react-dom/client": "https://esm.sh/react-dom@18.1.0/client"
  }
}
```

### Run

Now run the server

```bash
deno run -A --unstable --no-check server.ts
```
