import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { redirectPlugin } from '../src/index.ts';

function createServerStub() {
  const use = vi.fn();

  return {
    middlewares: { use },
    use,
  };
}

describe('vite-plugin-redirect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the same redirect middleware for dev and preview servers', () => {
    const plugin = redirectPlugin({ '/foo': '/bar' });
    const devServer = createServerStub();
    const previewServer = createServerStub();

    plugin.configureServer(devServer);
    plugin.configurePreviewServer(previewServer);

    expect(devServer.use).toHaveBeenCalledTimes(1);
    expect(previewServer.use).toHaveBeenCalledTimes(1);

    const devMiddleware = devServer.use.mock.calls[0][0];
    const previewMiddleware = previewServer.use.mock.calls[0][0];

    expect(typeof devMiddleware).toBe('function');
    expect(typeof previewMiddleware).toBe('function');

    const redirectReq = { url: '/foo' };
    const redirectRes = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    const redirectNext = vi.fn();

    devMiddleware(redirectReq, redirectRes, redirectNext);

    expect(redirectRes.writeHead).toHaveBeenCalledWith(301, { Location: '/bar' });
    expect(redirectRes.end).toHaveBeenCalledTimes(1);
    expect(redirectNext).not.toHaveBeenCalled();

    const passThroughReq = { url: '/missing' };
    const passThroughRes = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    const passThroughNext = vi.fn();

    previewMiddleware(passThroughReq, passThroughRes, passThroughNext);

    expect(passThroughRes.writeHead).not.toHaveBeenCalled();
    expect(passThroughRes.end).not.toHaveBeenCalled();
    expect(passThroughNext).toHaveBeenCalledTimes(1);
  });

  it('also passes through requests without a url', () => {
    const plugin = redirectPlugin({ '/foo': '/bar' });
    const server = createServerStub();

    plugin.configureServer(server);

    const middleware = server.use.mock.calls[0][0];
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    const next = vi.fn();

    middleware({}, res, next);

    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates redirect pages during closeBundle', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-plugin-redirect-'));
    const outDirName = 'dist';
    const outputDir = path.join(rootDir, outDirName);
    const redirects = {
      '/foo': '/bar',
      '/docs/start': '/guide/getting-started',
    };
    const plugin = redirectPlugin(redirects);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    plugin.configResolved({
      root: rootDir,
      build: {
        outDir: outDirName,
      },
    });

    plugin.closeBundle();

    const fooHtml = fs.readFileSync(path.join(outputDir, 'foo', 'index.html'), 'utf8');
    const docsHtml = fs.readFileSync(path.join(outputDir, 'docs', 'start', 'index.html'), 'utf8');

    expect(fooHtml).toContain('<meta http-equiv="refresh" content="0; url=/bar">');
    expect(fooHtml).toContain('<link rel="canonical" href="/bar">');
    expect(fooHtml).toContain('window.location.replace("/bar")');

    expect(docsHtml).toContain('/guide/getting-started');
    expect(logSpy).toHaveBeenCalledWith(
      `✅ Generated ${Object.keys(redirects).length} redirect pages in ${outputDir}`,
    );

    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('skips generation for temporary output directories', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-plugin-redirect-'));
    const outDirName = '.temp/build';
    const outputDir = path.resolve(rootDir, outDirName);
    const plugin = redirectPlugin({ '/foo': '/bar' });
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync');
    const writeSpy = vi.spyOn(fs, 'writeFileSync');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    plugin.configResolved({
      root: rootDir,
      build: {
        outDir: outDirName,
      },
    });

    plugin.closeBundle();

    expect(mkdirSpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(outputDir)).toBe(false);

    fs.rmSync(rootDir, { recursive: true, force: true });
  });
});
