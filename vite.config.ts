import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Load environment variables from multiple files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

export default defineConfig((config) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'globalThis.TextEncoder': 'globalThis.TextEncoder',
    },
    build: {
      target: 'esnext',
    },
    plugins: [
      nodePolyfills({
        include: ['buffer', 'process', 'stream'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
        protocolImports: true,
        exclude: ['child_process', 'fs', 'path', 'util'],
      }),
      config.mode !== 'test' && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
      {
        name: 'fix-server-build',
        enforce: 'post',
        writeBundle() {
          // Post-process the built server bundle to fix two React 18 CJS issues:
          // 1. server.node.js lacks renderToReadableStream → use server.browser.js instead
          // 2. node-polyfills stub util lacks TextEncoder → Node's real util provides it
          try {
            const assetsDir = join(process.cwd(), 'build', 'server', 'assets');
            const files = readdirSync(assetsDir);
            const serverBuild = files.find(f => f.startsWith('server-build') && f.endsWith('.js'));
            if (!serverBuild) return;

            const filePath = join(assetsDir, serverBuild);
            let code = readFileSync(filePath, 'utf-8');

            const oldImport = "import { renderToReadableStream } from 'react-dom/server';";
            const polyfill = `import { renderToPipeableStream as __renderToPipeableStream } from 'react-dom/server.node';
            // React 18 server.node.js lacks renderToReadableStream (added in React 19).
            // Wrap renderToPipeableStream (which IS available) in a Web ReadableStream.
            function __renderToReadableStreamPolyfill(element, options) {
              return new Promise((resolve, reject) => {
                let pipeable;
                try { pipeable = __renderToPipeableStream(element, options); }
                catch (e) { reject(e); return; }
                const { readable, writable } = new TransformStream();
                pipeable.pipe(writable);
                pipeable.on('error', reject);
                resolve(readable);
              });
            }`;
            if (code.includes(oldImport)) {
              code = code.replace(oldImport, polyfill);
              code = code.replace(/renderToReadableStream\(/g, '__renderToReadableStreamPolyfill(');
            }

            code = code.replace(/util\.TextEncoder/g, 'globalThis.TextEncoder');
            code = code.replace(/util\.TextDecoder/g, 'globalThis.TextDecoder');

            writeFileSync(filePath, code, 'utf-8');
            console.log(`[fix-server-build] Patched ${serverBuild}`);
          } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            console.warn('[fix-server-build] Could not patch server build:', err.message);
          }
        },
      },
    ],
    envPrefix: [
      'VITE_',
      'OPENAI_LIKE_API_BASE_URL',
      'OPENAI_LIKE_API_MODELS',
      'OLLAMA_API_BASE_URL',
      'LMSTUDIO_API_BASE_URL',
      'TOGETHER_API_BASE_URL',
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    test: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/preview/**', // Exclude preview tests that require Playwright
      ],
    },
  };
});

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}