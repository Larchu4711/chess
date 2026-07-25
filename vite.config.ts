import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade, damit der Build auch unter einem Unterverzeichnis
  // (z.B. GitHub Pages) ohne weitere Konfiguration funktioniert.
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
