import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MapGestureCore',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@mediapipe/tasks-vision'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
