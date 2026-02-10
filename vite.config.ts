import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";


const plugins = [
  react(), 
  tailwindcss(), 
  jsxLocPlugin(), 
  vitePluginManusRuntime(),
  // Pre-build gzip files for static assets (Nginx gzip_static on)
  viteCompression({
    algorithm: 'gzip',
    ext: '.gz',
    threshold: 1024, // Only compress files > 1KB
    deleteOriginFile: false, // Keep original files for fallback
    filter: /\.(js|css|html|json|svg|xml|txt|woff|woff2|ttf|eot)$/i,
  }),
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
            // Charts & visualization (recharts + d3 + chart.js + react-chartjs-2)
            if (id.includes('recharts') || id.includes('d3-') || id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
            // 3D rendering
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-3d';
            // Icons
            if (id.includes('lucide')) return 'vendor-icons';
            // UI primitives (Radix + shadcn deps)
            if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul') || id.includes('sonner') || id.includes('embla-carousel') || id.includes('input-otp') || id.includes('react-resizable-panels') || id.includes('next-themes')) return 'vendor-ui';
            // React core
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
            // tRPC & data fetching
            if (id.includes('@trpc') || id.includes('@tanstack')) return 'vendor-data';
            // Date/time libs
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-date';
            // Form & validation
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-form';
            // PDF/Excel generation
            if (id.includes('xlsx') || id.includes('exceljs') || id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas') || id.includes('pdfmake') || id.includes('pdfkit')) return 'vendor-export';
            // Markdown & editor (streamdown + all its remark/rehype/unified deps must be in same chunk to avoid circular dep)
            if (id.includes('marked') || id.includes('highlight') || id.includes('prism') || id.includes('codemirror') || id.includes('monaco') || id.includes('streamdown') || id.includes('mdast') || id.includes('micromark') || id.includes('remark') || id.includes('rehype') || id.includes('unified') || id.includes('unist') || id.includes('hast') || id.includes('katex') || id.includes('remend')) return 'vendor-editor';
            // Superjson (serialization)
            if (id.includes('superjson')) return 'vendor-superjson';
            // QR Code & scanning
            if (id.includes('html5-qrcode') || id.includes('qrcode')) return 'vendor-qrcode';
            // Drag & drop
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            // React extensions (day-picker, joyride, image-crop)
            if (id.includes('react-day-picker') || id.includes('react-joyride') || id.includes('react-image-crop')) return 'vendor-react-ext';
            // Routing
            if (id.includes('wouter')) return 'vendor-router';
            // Utility libs (clsx, tailwind-merge, class-variance-authority)
            if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) return 'vendor-utils';
            // Mermaid & diagram rendering (heavy: langium, chevrotain, dagre)
            if (id.includes('mermaid') || id.includes('langium') || id.includes('chevrotain') || id.includes('dagre') || id.includes('khroma') || id.includes('cytoscape')) return 'vendor-mermaid';
            // Syntax highlighting (shiki + vscode-jsonrpc + vscode-textmate)
            if (id.includes('shiki') || id.includes('vscode-jsonrpc') || id.includes('vscode-textmate') || id.includes('vscode-oniguruma')) return 'vendor-syntax';
            // Animation (framer-motion)
            if (id.includes('framer-motion') || id.includes('motion')) return 'vendor-animation';
            // MQTT & IoT
            if (id.includes('mqtt')) return 'vendor-mqtt';
            // State management (zustand)
            if (id.includes('zustand')) return 'vendor-state';
            // HTML parsing (parse5)
            if (id.includes('parse5')) return 'vendor-html-parser';
            // PPT generation
            if (id.includes('pptxgenjs')) return 'vendor-pptx';
            // Lodash utilities
            if (id.includes('lodash')) return 'vendor-lodash';
            // Core-js polyfills
            if (id.includes('core-js')) return 'vendor-polyfill';
            // (vendor-markdown merged into vendor-editor above to prevent circular dependency)
            // UUID & crypto
            if (id.includes('uuid') || id.includes('nanoid')) return 'vendor-crypto';
            // Misc vendor (remaining)
            return 'vendor-misc';
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
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps) => {
        // Don't preload heavy optional chunks - they'll be loaded on demand
        const heavyChunks = ['vendor-syntax', 'vendor-mermaid', 'vendor-3d', 'vendor-export', 'vendor-qrcode', 'vendor-pptx', 'vendor-mqtt', 'vendor-editor', 'vendor-html-parser', 'vendor-animation'];
        return deps.filter(dep => !heavyChunks.some(chunk => dep.includes(chunk)));
      },
    },
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
