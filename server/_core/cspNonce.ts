/**
 * CSP Nonce Middleware
 * 
 * Generates a unique cryptographic nonce per request and attaches it to
 * res.locals.cspNonce so that:
 *  1. Helmet can include it in the Content-Security-Policy header
 *  2. The HTML template renderer can inject it into <script> tags
 *
 * This replaces 'unsafe-inline' in script-src with a nonce, significantly
 * improving XSS protection while still allowing Vite's inline scripts.
 */

import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export function cspNonceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate a 16-byte random nonce, base64-encoded
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;
  next();
}

/**
 * Build Helmet CSP directives with nonce support.
 * In development, we still allow 'unsafe-eval' for Vite HMR.
 * In production, nonce replaces 'unsafe-inline' for script-src.
 */
export function getCSPDirectives(isDev: boolean) {
  // Base directives shared between dev and prod
  const base = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: ["'self'", "https:", "wss:"],
    frameSrc: ["'self'"],
    objectSrc: ["'none'"],
    workerSrc: ["'self'"],
    childSrc: ["'self'", "blob:"],
    upgradeInsecureRequests: [] as string[],
  };

  if (isDev) {
    // Development: keep unsafe-inline and unsafe-eval for Vite HMR
    return {
      ...base,
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
    };
  }

  // Production: use nonce for scripts (set dynamically per-request via Helmet callback)
  return {
    ...base,
    scriptSrc: [
      "'self'",
      // The nonce is injected dynamically by Helmet's callback feature
      (req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`,
      // Keep unsafe-eval for libraries that need it (e.g., chart.js, mermaid)
      "'unsafe-eval'",
      "https://fonts.googleapis.com",
    ],
  };
}
