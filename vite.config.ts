import { readFileSync } from 'node:fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/** @mediapipe/tasks-vision references vision_bundle_mjs.js.map but only ships vision_bundle.mjs.map */
function mediapipeBrokenSourcemapWorkaround(): Plugin {
  return {
    name: 'mediapipe-broken-sourcemap-url',
    enforce: 'pre',
    load(id) {
      const path = id.split('?')[0];
      if (
        path.includes('@mediapipe/tasks-vision') &&
        path.endsWith('vision_bundle.mjs')
      ) {
        const code = readFileSync(path, 'utf-8').replace(
          /\n\/\/# sourceMappingURL=[^\n]+/,
          ''
        );
        return { code, map: null };
      }
    },
  };
}

export default defineConfig({
  root: 'examples',
  envDir: root,
  base: '/map-gesture-controls/',
  plugins: [mediapipeBrokenSourcemapWorkaround()],
  resolve: {
    alias: {
      '@map-gesture-controls/core': resolve(root, 'packages/map-gesture-core/src/index.ts'),
      '@map-gesture-controls/ol': resolve(root, 'packages/ol-gesture-controls/src/index.ts'),
      '@map-gesture-controls/google-maps': resolve(root, 'packages/google-maps-gesture-controls/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        index:    resolve(root, 'examples/index.html'),
        examples: resolve(root, 'examples/examples.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
