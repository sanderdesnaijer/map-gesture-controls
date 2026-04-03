import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

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
  base: './',
  plugins: [mediapipeBrokenSourcemapWorkaround()],
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
