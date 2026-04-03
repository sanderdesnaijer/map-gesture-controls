import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OlGestureControls',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['ol', '@mediapipe/tasks-vision'],
      output: {
        globals: {
          ol: 'ol',
        },
      },
    },
    outDir: 'dist',
    cssCodeSplit: false,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
