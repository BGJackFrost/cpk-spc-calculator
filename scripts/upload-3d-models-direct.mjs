/**
 * Script to upload sample 3D models directly to S3 and insert database records
 * Bypasses tRPC authentication for seeding purposes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const MODELS_DIR = path.join(__dirname, '../temp_models');

// Sample models to upload
const sampleModels = [
  {
    fileName: 'DamagedHelmet.glb',
    name: 'Industrial Helmet',
    description: 'Mũ bảo hộ công nghiệp - Model mẫu từ Khronos glTF Sample',
    category: 'equipment',
    manufacturer: 'Khronos Group',
    modelNumber: 'HELMET-001',
    tags: JSON.stringify(['helmet', 'safety', 'equipment', 'sample']),
    defaultScale: 1,
  },
  {
    fileName: 'BoxAnimated.glb',
    name: 'Animated Box',
    description: 'Hộp có animation - Dùng để test animation trong 3D viewer',
    category: 'custom',
    manufacturer: 'Khronos Group',
    modelNumber: 'BOX-ANIM-001',
    tags: JSON.stringify(['box', 'animated', 'test', 'sample']),
    defaultScale: 1,
  },
  {
    fileName: 'CesiumMilkTruck.glb',
    name: 'Milk Truck',
    description: 'Xe tải sữa - Model phương tiện vận chuyển trong nhà máy',
    category: 'equipment',
    manufacturer: 'Cesium',
    modelNumber: 'TRUCK-001',
    tags: JSON.stringify(['truck', 'vehicle', 'transport', 'sample']),
    defaultScale: 0.5,
  },
];

async function uploadToS3(filePath, fileName) {
  if (!FORGE_API_URL || !FORGE_API_KEY) {
    throw new Error('FORGE_API_URL or FORGE_API_KEY not configured');
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const fileKey = `3d-models/${Date.now()}-${fileName}`;
  
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', fileKey);
  
  const blob = new Blob([fileBuffer], { type: 'model/gltf-binary' });
  const formData = new FormData();
  formData.append('file', blob, fileName);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return { url: result.url, fileKey, fileSize: fileBuffer.length };
}

async function insertModel(connection, model, uploadResult) {
  const sql = `
    INSERT INTO iot_3d_models 
    (name, description, category, model_url, model_format, file_size, 
     default_scale, manufacturer, model_number, tags, is_public, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'glb', ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
  `;
  
  const [result] = await connection.execute(sql, [
    model.name,
    model.description,
    model.category,
    uploadResult.url,
    uploadResult.fileSize,
    model.defaultScale,
    model.manufacturer,
    model.modelNumber,
    model.tags,
  ]);
  
  return result.insertId;
}

async function main() {
  console.log('=== Upload Sample 3D Models (Direct) ===\n');
  
  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL not configured');
    return;
  }
  
  // Parse DATABASE_URL
  const dbUrl = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });
  
  console.log('✅ Connected to database\n');
  
  for (const model of sampleModels) {
    const filePath = path.join(MODELS_DIR, model.fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${model.fileName}`);
      continue;
    }
    
    console.log(`📦 Processing: ${model.name}`);
    
    try {
      // Step 1: Upload file to S3
      console.log(`   Uploading ${model.fileName}...`);
      const uploadResult = await uploadToS3(filePath, model.fileName);
      console.log(`   ✅ Uploaded to: ${uploadResult.url}`);
      
      // Step 2: Insert database record
      console.log(`   Creating database record...`);
      const modelId = await insertModel(connection, model, uploadResult);
      console.log(`   ✅ Created model ID: ${modelId}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }
  
  await connection.end();
  console.log('=== Done ===');
}

main().catch(console.error);
