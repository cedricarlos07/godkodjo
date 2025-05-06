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
        manualChunks: function(id) {
          // Regrouper les modules React dans un chunk
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/wouter') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }

          // Regrouper les composants UI dans un chunk
          if (id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-ui';
          }

          // Isoler les bibliothèques de graphiques
          if (id.includes('node_modules/chart.js') ||
              id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }

          // Autres modules node_modules dans un chunk séparé
          if (id.includes('node_modules')) {
            return 'vendor-deps';
          }
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
  // Désactiver complètement le SSR pour les bibliothèques problématiques
  ssr: {
    // Traiter ces modules comme externes en SSR
    external: [
      'chart.js',
      'react-chartjs-2',
      // Autres bibliothèques qui pourraient causer des problèmes en SSR
      'recharts',
      'xlsx'
    ],
    // Ne pas transformer ces modules en SSR
    noExternal: []
  },
});
