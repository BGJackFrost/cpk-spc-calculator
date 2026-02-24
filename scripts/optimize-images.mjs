#!/usr/bin/env node
/**
 * Static Image Optimization Script
 * Converts images in client/public and uploads/ to WebP/AVIF formats
 * Run: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
const QUALITY = { webp: 80, avif: 65 };

// Directories to scan
const SCAN_DIRS = [
  path.join(ROOT, 'client', 'public'),
  path.join(ROOT, 'uploads'),
];

let totalOriginal = 0;
let totalOptimized = 0;
let filesProcessed = 0;
let filesSkipped = 0;

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) return;

  const dir = path.dirname(filePath);
  const name = path.basename(filePath, ext);
  const webpPath = path.join(dir, `${name}.webp`);
  const avifPath = path.join(dir, `${name}.avif`);

  // Skip if already optimized
  if (fs.existsSync(webpPath) && fs.existsSync(avifPath)) {
    filesSkipped++;
    return;
  }

  try {
    const originalSize = fs.statSync(filePath).size;
    totalOriginal += originalSize;

    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Generate WebP
    if (!fs.existsSync(webpPath)) {
      const webpBuffer = await sharp(filePath)
        .webp({ quality: QUALITY.webp, effort: 4 })
        .toBuffer();
      fs.writeFileSync(webpPath, webpBuffer);
      totalOptimized += webpBuffer.length;
      console.log(`  WebP: ${name}${ext} (${formatSize(originalSize)} → ${formatSize(webpBuffer.length)}, -${Math.round((1 - webpBuffer.length / originalSize) * 100)}%)`);
    }

    // Generate AVIF (only for images > 10KB, AVIF is slow for tiny images)
    if (!fs.existsSync(avifPath) && originalSize > 10240) {
      const avifBuffer = await sharp(filePath)
        .avif({ quality: QUALITY.avif, effort: 4 })
        .toBuffer();
      fs.writeFileSync(avifPath, avifBuffer);
      console.log(`  AVIF: ${name}${ext} (${formatSize(originalSize)} → ${formatSize(avifBuffer.length)}, -${Math.round((1 - avifBuffer.length / originalSize) * 100)}%)`);
    }

    filesProcessed++;
  } catch (error) {
    console.error(`  Error processing ${filePath}: ${error.message}`);
  }
}

async function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return;
  }

  console.log(`\nScanning: ${dir}`);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
    } else if (entry.isFile()) {
      await optimizeFile(fullPath);
    }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

async function main() {
  console.log('=== Image Optimization Script ===');
  console.log(`Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  console.log(`Output: WebP (quality: ${QUALITY.webp}), AVIF (quality: ${QUALITY.avif})`);

  for (const dir of SCAN_DIRS) {
    await scanDirectory(dir);
  }

  console.log('\n=== Summary ===');
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files skipped (already optimized): ${filesSkipped}`);
  if (totalOriginal > 0) {
    console.log(`Total original size: ${formatSize(totalOriginal)}`);
    console.log(`Total WebP size: ${formatSize(totalOptimized)}`);
    console.log(`Savings: ${Math.round((1 - totalOptimized / totalOriginal) * 100)}%`);
  }
}

main().catch(console.error);
