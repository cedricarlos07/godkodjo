import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";

// Configuration spécifique pour la production
export default defineConfig({
  plugins: [
    react(),
    themePlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimisations pour la production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Stratégie de chunking pour optimiser le chargement
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          // Isoler les bibliothèques de graphiques dans leur propre chunk
          charts: ['chart.js', 'react-chartjs-2']
        },
        // Éviter les problèmes de chargement asynchrone
        inlineDynamicImports: false,
      },
    },
    // Assurer que les modules CSS sont correctement traités
    cssCodeSplit: true,
    // Améliorer la compatibilité avec les navigateurs
    target: 'es2015',
  },
  // Optimisations pour le serveur de développement
  server: {
    hmr: {
      overlay: false,
    },
  },
  // Configuration pour éviter les problèmes de SSR
  ssr: {
    noExternal: ['chart.js', 'react-chartjs-2'],
  },
});
