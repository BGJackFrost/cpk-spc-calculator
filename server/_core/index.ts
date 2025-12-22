import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { addSseClient, startHeartbeat } from "../sse";
import { initScheduledJobs } from "../scheduledJobs";
import { apiRateLimiter, authRateLimiter, setAlertCallback } from "./rateLimiter";
import { notifyOwner } from "./notification";
import { storagePut } from "../storage";
import { wsServer } from "../websocket";
import addPerformanceIndexes from "../migrations/add-performance-indexes";

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
  
  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
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
  });
}

startServer().catch(console.error);
