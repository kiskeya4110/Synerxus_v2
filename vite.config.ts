import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Dynamically import cartographer only in development on Replit
const getPlugins = async () => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
  ];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer.cartographer());
    } catch (e) {
      // Cartographer not available, skip
    }
  }

  return plugins;
};

export default defineConfig(async () => ({
  plugins: await getPlugins(),
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      clientPort: 443
    }
  },
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
    // Code splitting for hyper-efficiency
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Vendor chunk splitting for better caching
          if (id.includes('node_modules')) {
            // React core - rarely changes
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Lucide icons - very large when bundled together
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Recharts needs its d3 dependencies bundled together to avoid circular deps
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            // D3 libraries (separate from recharts to allow proper initialization order)
            if (id.includes('d3-') || id.includes('d3/')) {
              return 'vendor-d3';
            }
            // Map libraries - large bundles
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            // UI components - shadcn/radix
            if (id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('clsx')) {
              return 'vendor-ui';
            }
            // Form handling
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'vendor-forms';
            }
            // Data fetching
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'vendor-data';
            }
            // PDF/Export utilities
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) {
              return 'vendor-export';
            }
            // Date utilities
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
              return 'vendor-date';
            }
            // Wouter routing
            if (id.includes('wouter')) {
              return 'vendor-router';
            }
            // Firebase
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }
            // Animation libraries
            if (id.includes('framer-motion') || id.includes('popmotion')) {
              return 'vendor-animation';
            }
            // Cropper and image utilities
            if (id.includes('cropper') || id.includes('react-cropper')) {
              return 'vendor-image';
            }
          }
        },
      },
    },
    // Increase chunk size warning limit since we're splitting properly
    chunkSizeWarningLimit: 600,
  },
}));
