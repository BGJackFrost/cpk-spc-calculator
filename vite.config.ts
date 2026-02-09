import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { visualizer } from "rollup-plugin-visualizer";


const plugins = [
  react(), 
  tailwindcss(), 
  jsxLocPlugin(), 
  vitePluginManusRuntime(),
  // Bundle analyzer - chỉ chạy khi có flag ANALYZE=true
  process.env.ANALYZE === 'true' && visualizer({
    open: false,
    filename: 'bundle-stats.html',
    gzipSize: true,
    brotliSize: true,
    template: 'treemap',
  }),
].filter(Boolean);

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
    cssCodeSplit: false,
    // Minimal rollup options to reduce memory
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore dynamic import warnings from vite:reporter
        if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'vite:reporter') {
          return;
        }
        warn(warning);
      },
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Charts & visualization
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            // 3D rendering
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-3d';
            // Icons
            if (id.includes('lucide')) return 'vendor-icons';
            // UI primitives
            if (id.includes('@radix-ui')) return 'vendor-radix';
            // React core
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
            // tRPC & data fetching
            if (id.includes('@trpc') || id.includes('@tanstack')) return 'vendor-data';
            // Date/time libs
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-date';
            // Form & validation
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-form';
            // PDF/Excel generation
            if (id.includes('xlsx') || id.includes('exceljs') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfmake')) return 'vendor-export';
            // Markdown & editor
            if (id.includes('marked') || id.includes('highlight') || id.includes('prism') || id.includes('codemirror') || id.includes('monaco')) return 'vendor-editor';
            // Misc vendor
            return 'vendor';
          }
        },
      },
      // Reduce memory by limiting parallel processing
      maxParallelFileOps: 1,
    },
    // Performance optimizations
    chunkSizeWarningLimit: 5000,
    sourcemap: false,
    minify: 'esbuild',
    reportCompressedSize: false,
    assetsInlineLimit: 0,
    cssMinify: true,
    modulePreload: false,
  },
  // Optimize deps - fix React unstable_now error
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'scheduler',
      '@tanstack/react-query',
      '@trpc/client',
      '@trpc/react-query',
    ],
    exclude: ['@react-three/fiber', '@react-three/drei', 'three'],
    force: false,
  },
  // Ensure consistent React resolution
  ssr: {
    noExternal: ['react', 'react-dom', 'scheduler'],
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
