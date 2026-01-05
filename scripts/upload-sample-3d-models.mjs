/**
 * Script to upload sample 3D models to S3 and create database records
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
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
    tags: ['helmet', 'safety', 'equipment', 'sample'],
    defaultScale: 1,
  },
  {
    fileName: 'BoxAnimated.glb',
    name: 'Animated Box',
    description: 'Hộp có animation - Dùng để test animation trong 3D viewer',
    category: 'custom',
    manufacturer: 'Khronos Group',
    modelNumber: 'BOX-ANIM-001',
    tags: ['box', 'animated', 'test', 'sample'],
    defaultScale: 1,
  },
  {
    fileName: 'CesiumMilkTruck.glb',
    name: 'Milk Truck',
    description: 'Xe tải sữa - Model phương tiện vận chuyển trong nhà máy',
    category: 'equipment',
    manufacturer: 'Cesium',
    modelNumber: 'TRUCK-001',
    tags: ['truck', 'vehicle', 'transport', 'sample'],
    defaultScale: 0.5,
  },
];

async function uploadFile(filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  
  const response = await fetch(`${API_BASE_URL}/api/trpc/model3d.uploadFile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: {
        fileName,
        fileData: base64Data,
        contentType: 'model/gltf-binary',
      },
    }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result.result?.data;
}

async function createModel(modelData) {
  const response = await fetch(`${API_BASE_URL}/api/trpc/model3d.create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: modelData,
    }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create model failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result.result?.data;
}

async function main() {
  console.log('=== Upload Sample 3D Models ===\n');
  
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
      const uploadResult = await uploadFile(filePath, model.fileName);
      console.log(`   ✅ Uploaded to: ${uploadResult?.url || 'unknown'}`);
      
      // Step 2: Create database record
      console.log(`   Creating database record...`);
      const fileStats = fs.statSync(filePath);
      
      const createResult = await createModel({
        name: model.name,
        description: model.description,
        category: model.category,
        modelUrl: uploadResult?.url,
        modelFormat: 'glb',
        fileSize: fileStats.size,
        defaultScale: model.defaultScale,
        manufacturer: model.manufacturer,
        modelNumber: model.modelNumber,
        tags: model.tags,
        isPublic: true,
      });
      
      console.log(`   ✅ Created model ID: ${createResult?.id || 'unknown'}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('=== Done ===');
}

main().catch(console.error);
