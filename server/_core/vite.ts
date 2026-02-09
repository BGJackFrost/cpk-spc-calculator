import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      // Inject CSP nonce into script tags (dev mode keeps unsafe-inline so nonce is optional)
      const nonce = res.locals.cspNonce;
      if (nonce) {
        template = template.replace(
          /<script(\s)/g,
          `<script nonce="${nonce}"$1`
        );
      }
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Discover critical assets from build output for preload hints
  const criticalAssets = discoverCriticalAssets(distPath);

  // Serve static files with immutable caching for hashed assets
  app.use(express.static(distPath, {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Hashed assets are immutable (content hash in filename)
      if (/\/assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9]{8,}\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // fall through to index.html with Link preload headers and CSP nonce injection
  app.use("*", (_req, res) => {
    // Add Link headers for HTTP/2 Server Push / preload hints
    if (criticalAssets.length > 0) {
      const linkHeaders = criticalAssets.map(asset => {
        const asType = asset.endsWith('.css') ? 'style' : 'script';
        return `<${asset}>; rel=preload; as=${asType}`;
      });
      res.setHeader('Link', linkHeaders.join(', '));
    }

    // In production, inject nonce into the built index.html
    const nonce = res.locals.cspNonce;
    const indexPath = path.resolve(distPath, "index.html");
    if (nonce && fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      html = html.replace(/<script(\s)/g, `<script nonce="${nonce}"$1`);
      if (criticalAssets.length > 0) {
        const preloadTags = criticalAssets.map(asset => {
          const asType = asset.endsWith('.css') ? 'style' : 'script';
          const crossorigin = asType === 'script' ? ' crossorigin' : '';
          return `<link rel="preload" href="${asset}" as="${asType}"${crossorigin}>`;
        }).join('\n    ');
        html = html.replace('</head>', `    ${preloadTags}\n  </head>`);
      }
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.sendFile(indexPath);
    }
  });
}

/**
 * Discover critical assets (index.js, vendor-react.js, style.css) from build output
 * These are the files needed for initial page render
 */
function discoverCriticalAssets(distPath: string): string[] {
  const assetsDir = path.resolve(distPath, 'assets');
  if (!fs.existsSync(assetsDir)) return [];

  try {
    const files = fs.readdirSync(assetsDir);
    const critical: string[] = [];

    for (const file of files) {
      // Match critical entry files by name pattern
      if (/^index-[a-zA-Z0-9]+\.js$/.test(file)) {
        critical.push(`/assets/${file}`);
      } else if (/^vendor-react-[a-zA-Z0-9-]+\.js$/.test(file) && !file.includes('ext')) {
        critical.push(`/assets/${file}`);
      } else if (/^style-[a-zA-Z0-9-]+\.css$/.test(file)) {
        critical.push(`/assets/${file}`);
      }
    }

    if (critical.length > 0) {
      console.log(`[HTTP/2] Discovered ${critical.length} critical assets for preload`);
    }
    return critical;
  } catch {
    return [];
  }
}
