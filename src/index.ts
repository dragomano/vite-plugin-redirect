import type { Plugin, ResolvedConfig } from 'vite'
import fs from 'fs'
import path from 'path'

function createMiddleware(redirects: Record<string, string>) {
  return (req: any, res: any, next: any) => {
    if (req.url && redirects[req.url]) {
      res.writeHead(301, { Location: redirects[req.url] })
      res.end()

      return
    }

    next()
  }
}

function generateHtml(to: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${to}">
    <link rel="canonical" href="${to}">
    <title>Redirecting...</title>
  </head>
  <body>
    <script>window.location.replace("${to}")</script>
  </body>
</html>`
}

export function redirectPlugin(redirects: Record<string, string>): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-redirect',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(server) {
      server.middlewares.use(createMiddleware(redirects))
    },

    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware(redirects))
    },

    closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir)

      if (outDir.includes('.temp')) return

      for (const [from, to] of Object.entries(redirects)) {
        const dir = path.join(outDir, from)

        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), generateHtml(to))
      }

      console.log(`✅ Generated ${Object.keys(redirects).length} redirect pages in ${outDir}`)
    },
  }
}