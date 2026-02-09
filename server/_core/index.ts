import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { addSseClient, startHeartbeat } from "../sse";
import { initScheduledJobs } from "../scheduledJobs";
import { apiRateLimiter, authRateLimiter, exportRateLimiter, setAlertCallback } from "./rateLimiter";
import { notifyOwner } from "./notification";
import { storagePut } from "../storage";
import { wsServer } from "../websocket";
import addPerformanceIndexes from "../migrations/add-performance-indexes";
import addAdvancedIndexes from "../migrations/add-advanced-indexes";
import compression from "compression";
import { cspNonceMiddleware, getCSPDirectives } from "./cspNonce";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Initialize rate limit alert callback
setAlertCallback(async (alert) => {
  console.log(`[RateLimiter Alert] Block rate: ${alert.blockRate}%`);
  try {
    await notifyOwner({
      title: `⚠️ Cảnh báo Rate Limit - Block rate cao: ${alert.blockRate}%`,
      content: alert.message,
    });
  } catch (error) {
    console.error('[RateLimiter Alert] Failed to send notification:', error);
  }
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Gzip compression for all responses (reduces transfer size by 60-80%)
  app.use(compression({
    level: 6, // Balance between compression ratio and CPU usage
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Skip compression for SSE streams
      if (req.path === '/api/sse') return false;
      // Use default filter for everything else
      return compression.filter(req, res);
    },
  }));

  // CSP nonce middleware — generates res.locals.cspNonce per request
  app.use(cspNonceMiddleware);

  // Security headers with Helmet (nonce-based CSP in production)
  const isDev = process.env.NODE_ENV === 'development';
  app.use(helmet({
    contentSecurityPolicy: {
      directives: getCSPDirectives(isDev),
    },
    crossOriginEmbedderPolicy: false, // Allow embedding resources
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Rate limiting for API endpoints
  app.use("/api/trpc", apiRateLimiter);
  app.use("/api/oauth", authRateLimiter);
  app.use("/api/upload", exportRateLimiter);
  app.use("/api/upload-logo", exportRateLimiter);
  
  // Serve manifest.json directly without auth (fix CORS issue)
  app.get('/manifest.json', (req, res) => {
    const manifestPath = process.env.NODE_ENV === 'development'
      ? path.resolve(import.meta.dirname, '../../client/public/manifest.json')
      : path.resolve(import.meta.dirname, 'public/manifest.json');
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(manifestPath);
  });

  // Serve favicon.ico directly without auth (fix CORS issue)
  app.get('/favicon.ico', (req, res) => {
    const faviconPath = process.env.NODE_ENV === 'development'
      ? path.resolve(import.meta.dirname, '../../client/public/favicon.ico')
      : path.resolve(import.meta.dirname, 'public/favicon.ico');
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(faviconPath);
  });
  
  // Health check endpoints (no auth required, no rate limiting)
  app.get('/api/health', async (_req, res) => {
    try {
      const { getBasicHealth } = await import('../services/healthCheckService');
      const health = await getBasicHealth();
      res.json(health);
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
    }
  });

  app.get('/api/health/detailed', async (_req, res) => {
    try {
      const { getDetailedHealth } = await import('../services/healthCheckService');
      const health = await getDetailedHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
    }
  });

  app.get('/api/health/live', async (_req, res) => {
    try {
      const { getLivenessStatus } = await import('../services/healthCheckService');
      res.json(getLivenessStatus());
    } catch (error) {
      res.status(503).json({ status: 'error' });
    }
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      const { getReadinessStatus } = await import('../services/healthCheckService');
      const readiness = await getReadinessStatus();
      res.status(readiness.ready ? 200 : 503).json(readiness);
    } catch (error) {
      res.status(503).json({ ready: false, error: 'Readiness check failed' });
    }
  });

  app.get('/api/metrics', async (_req, res) => {
    try {
      const { getPrometheusMetrics } = await import('../services/healthCheckService');
      const metrics = await getPrometheusMetrics();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(503).send('# Health check failed\n');
    }
  });

  // API Documentation - OpenAPI 3.0 spec
  app.get('/api/openapi.json', async (_req, res) => {
    try {
      const { generateOpenAPISpec } = await import('../services/apiDocumentationService');
      const protocol = _req.protocol;
      const host = _req.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      const spec = generateOpenAPISpec(baseUrl);
      res.json(spec);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate API spec' });
    }
  });

  // Swagger UI
  app.get('/api/docs', async (_req, res) => {
    try {
      const { generateSwaggerUIHtml } = await import('../services/apiDocumentationService');
      const html = generateSwaggerUIHtml('/api/openapi.json');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).send('Failed to load API documentation');
    }
  });

  // API Statistics
  app.get('/api/docs/stats', async (_req, res) => {
    try {
      const { getAPIStatistics } = await import('../services/apiDocumentationService');
      res.json(getAPIStatistics());
    } catch (error) {
      res.status(500).json({ error: 'Failed to get API statistics' });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // SSE endpoint for realtime updates
  app.get("/api/sse", (req, res) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    addSseClient(clientId, res);
    // Note: startHeartbeat is called once at server startup, not per client
  });
  
  // Upload file endpoint (generic)
  app.post("/api/upload", async (req, res) => {
    try {
      const { filename, contentType, data, folder } = req.body;
      
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }

      // Extract base64 data (remove data:image/xxx;base64, prefix)
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const ext = filename.split('.').pop() || 'png';
      const folderPath = folder || 'uploads';
      const uniqueFilename = `${folderPath}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      // Upload to S3
      const result = await storagePut(uniqueFilename, buffer, contentType || 'image/png');
      
      res.json({ url: result.url, key: result.key });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Upload failed" });
    }
  });
  
  // Upload logo endpoint
  app.post("/api/upload-logo", async (req, res) => {
    try {
      const { filename, contentType, data } = req.body;
      
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }

      // Extract base64 data (remove data:image/xxx;base64, prefix)
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const ext = filename.split('.').pop() || 'png';
      const uniqueFilename = `logos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      // Upload to S3
      const result = await storagePut(uniqueFilename, buffer, contentType || 'image/png');
      
      res.json({ url: result.url, key: result.key });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Public License API (no authentication required)
  // These endpoints allow client applications to check license status without tRPC
  app.get("/api/license-public/check/:key", async (req, res) => {
    try {
      const { key } = req.params;
      if (!key) {
        return res.status(400).json({ error: "License key is required" });
      }
      
      const { getLicenseStatus, isLicenseDbConnected } = await import("../licenseServerDb");
      if (!isLicenseDbConnected()) {
        return res.status(503).json({ error: "License Server not available" });
      }
      
      const result = await getLicenseStatus(key);
      if (!result.found) {
        return res.status(404).json({ error: result.error || "License not found" });
      }
      
      // Return sanitized license info (no internal IDs)
      const license = result.license;
      res.json({
        valid: license.isActive === 1 && license.isRevoked !== 1 && 
               (!license.expiresAt || new Date(license.expiresAt) > new Date()),
        status: license.isRevoked === 1 ? "revoked" : 
                (license.expiresAt && new Date(license.expiresAt) <= new Date()) ? "expired" :
                license.isActive === 1 ? "active" : "inactive",
        type: license.licenseType,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        maxDevices: license.maxDevices,
        features: license.features ? JSON.parse(license.features) : null,
        companyName: license.companyName
      });
    } catch (error) {
      console.error("License check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/license-public/validate/:key/:deviceId", async (req, res) => {
    try {
      const { key, deviceId } = req.params;
      if (!key || !deviceId) {
        return res.status(400).json({ error: "License key and device ID are required" });
      }
      
      const { validateLicense, isLicenseDbConnected } = await import("../licenseServerDb");
      if (!isLicenseDbConnected()) {
        return res.status(503).json({ error: "License Server not available" });
      }
      
      const result = await validateLicense(key, deviceId);
      res.json(result);
    } catch (error) {
      console.error("License validate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/license-public/activate", async (req, res) => {
    try {
      const { licenseKey, deviceId, deviceName, deviceInfo } = req.body;
      if (!licenseKey || !deviceId) {
        return res.status(400).json({ error: "License key and device ID are required" });
      }
      
      const { activateLicense, isLicenseDbConnected } = await import("../licenseServerDb");
      if (!isLicenseDbConnected()) {
        return res.status(503).json({ error: "License Server not available" });
      }
      
      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await activateLicense(licenseKey, deviceId, deviceName, deviceInfo, ipAddress);
      res.json(result);
    } catch (error) {
      console.error("License activate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/license-public/heartbeat", async (req, res) => {
    try {
      const { licenseKey, deviceId, metadata } = req.body;
      if (!licenseKey || !deviceId) {
        return res.status(400).json({ error: "License key and device ID are required" });
      }
      
      const { recordHeartbeat, isLicenseDbConnected } = await import("../licenseServerDb");
      if (!isLicenseDbConnected()) {
        return res.status(503).json({ error: "License Server not available" });
      }
      
      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await recordHeartbeat(licenseKey, deviceId, ipAddress, metadata);
      res.json(result);
    } catch (error) {
      console.error("License heartbeat error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/license-public/revoked/:key", async (req, res) => {
    try {
      const { key } = req.params;
      if (!key) {
        return res.status(400).json({ error: "License key is required" });
      }
      
      const { checkLicenseRevoked, isLicenseDbConnected } = await import("../licenseServerDb");
      if (!isLicenseDbConnected()) {
        return res.status(503).json({ error: "License Server not available" });
      }
      
      const result = await checkLicenseRevoked(key);
      res.json(result);
    } catch (error) {
      console.error("License revoked check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Image optimization endpoint (on-the-fly WebP/AVIF conversion)
  app.get('/api/image-optimize/*', async (req, res, next) => {
    try {
      const { createImageOptimizationMiddleware } = await import('../services/imageOptimizationService');
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const middleware = createImageOptimizationMiddleware(uploadsDir);
      return middleware(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  
  // Kill any process using the port before starting
  try {
    const { execSync } = await import('child_process');
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (e) {
    // Ignore errors
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize WebSocket server
    wsServer.initialize(server);
    console.log(`WebSocket server initialized on ws://localhost:${port}/ws`);
    
    // Start SSE heartbeat (once at server startup)
    startHeartbeat(30000); // 30 second heartbeat
    
    // Initialize scheduled jobs after server starts
    initScheduledJobs();
    
    // Run performance indexes migration (async, non-blocking)
    addPerformanceIndexes().catch(err => {
      console.error('[Migration] Failed to add performance indexes:', err.message);
    });
    
    // Run advanced indexes migration Phase 2 (async, non-blocking)
    addAdvancedIndexes().catch(err => {
      console.error('[Migration] Failed to add advanced indexes:', err.message);
    });
  });
}

startServer().catch(console.error);
