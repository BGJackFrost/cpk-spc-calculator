import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize for lower memory usage
    target: 'es2020',
    cssCodeSplit: true,
    // Code splitting configuration - aggressive splitting to reduce chunk size
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Three.js ecosystem - very large
            if (id.includes('three') || id.includes('@react-three')) {
              return 'v-three';
            }
            // PDF export
            if (id.includes('jspdf')) {
              return 'v-jspdf';
            }
            // HTML to canvas
            if (id.includes('html2canvas')) {
              return 'v-html2canvas';
            }
            // Excel
            if (id.includes('xlsx')) {
              return 'v-xlsx';
            }
            // Recharts
            if (id.includes('recharts')) {
              return 'v-recharts';
            }
            // Chart.js
            if (id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'v-chartjs';
            }
            // D3
            if (id.includes('d3')) {
              return 'v-d3';
            }
            // React
            if (id.includes('react-dom')) {
              return 'v-react-dom';
            }
            if (id.includes('react')) {
              return 'v-react';
            }
            // Radix UI - split by component
            if (id.includes('@radix-ui')) {
              const match = id.match(/@radix-ui\/react-([^/]+)/);
              if (match) {
                return `v-radix-${match[1]}`;
              }
              return 'v-radix';
            }
            // Lucide icons
            if (id.includes('lucide')) {
              return 'v-icons';
            }
            // tRPC
            if (id.includes('@trpc')) {
              return 'v-trpc';
            }
            // TanStack
            if (id.includes('@tanstack')) {
              return 'v-tanstack';
            }
            // Date-fns
            if (id.includes('date-fns')) {
              return 'v-date';
            }
            // Zod
            if (id.includes('zod')) {
              return 'v-zod';
            }
            // Form
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'v-form';
            }
            // DnD
            if (id.includes('@dnd-kit')) {
              return 'v-dnd';
            }
            // Other vendors
            return 'v-misc';
          }
        },
        // Chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Reduce memory by limiting parallel processing
      maxParallelFileOps: 1,
    },
    // Performance optimizations
    chunkSizeWarningLimit: 10000,
    sourcemap: false,
    // Disable minification to reduce memory during build
    minify: false,
    // Reduce memory usage
    reportCompressedSize: false,
    // Disable inline assets
    assetsInlineLimit: 0,
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@react-three/fiber', '@react-three/drei', 'three'],
  },
  server: {
    host: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
