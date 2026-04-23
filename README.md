# vite-plugin-redirect

![Vite compatibility](https://registry.vite.dev/api/badges?package=vite-plugin-redirect&tool=vite)

A lightweight Vite plugin that adds redirect support for dev and preview servers, and generates static HTML redirect pages on build. Compatible with Vite and VitePress.

## Installation

```bash
pnpm i vite-plugin-redirect -D
```

## Usage with Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { redirectPlugin } from 'vite-plugin-redirect'

export default defineConfig({
  plugins: [
    redirectPlugin({
      '/foo': '/bar',
    }),
  ]
})
```

## Usage with VitePress

```ts
// config.ts
import { defineConfig } from 'vitepress'
import { redirectPlugin } from 'vite-plugin-redirect'

export default defineConfig({
  vite: {
    plugins: [
      redirectPlugin({
        '/foo': '/bar',
      }),
    ]
  }
})
```
