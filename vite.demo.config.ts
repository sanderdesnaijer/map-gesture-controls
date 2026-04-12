import { readFileSync } from 'node:fs';
import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';

const root = new URL('.', import.meta.url).pathname;

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
  // Demos are served from /map-gesture-controls/demo/ on GitHub Pages
  // and from docs/public/demo/ during local VitePress preview.
  base: '/map-gesture-controls/demo/',
  plugins: [mediapipeBrokenSourcemapWorkaround()],
  resolve: {
    alias: {
      '@map-gesture-controls/core': resolve(root, 'packages/map-gesture-core/src/index.ts'),
      '@map-gesture-controls/ol': resolve(root, 'packages/ol-gesture-controls/src/index.ts'),
      '@map-gesture-controls/google-maps': resolve(root, 'packages/google-maps-gesture-controls/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(root, 'docs/public/demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'demo-basic':              resolve(root, 'examples/demo-basic.html'),
        'demo-controls-overview':  resolve(root, 'examples/demo-controls-overview.html'),
        'demo-toggle':             resolve(root, 'examples/demo-toggle.html'),
        'demo-custom-overlay':     resolve(root, 'examples/demo-custom-overlay.html'),
        'demo-sensitivity':        resolve(root, 'examples/demo-sensitivity.html'),
        'demo-basic-gmaps':        resolve(root, 'examples/demo-basic-gmaps.html'),
        'demo-toggle-gmaps':       resolve(root, 'examples/demo-toggle-gmaps.html'),
        'demo-custom-overlay-gmaps': resolve(root, 'examples/demo-custom-overlay-gmaps.html'),
        'demo-sensitivity-gmaps':  resolve(root, 'examples/demo-sensitivity-gmaps.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
