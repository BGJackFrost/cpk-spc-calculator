/**
 * Seed script for AVI/AOI test data
 * Run: node scripts/seed-avi-aoi-data.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
};

// Demo data generators
const machines = ['AVI-001', 'AVI-002', 'AOI-001', 'AOI-002', 'AOI-003'];
const products = ['PCB-A100', 'PCB-B200', 'PCB-C300', 'Module-X1', 'Module-X2'];
const defectTypes = [
  'Solder Bridge', 'Missing Component', 'Tombstone', 'Insufficient Solder',
  'Excess Solder', 'Polarity Reversed', 'Component Shifted', 'Cold Solder',
  'Lifted Lead', 'Damaged Component', 'Foreign Material', 'Scratch'
];
const inspectionTypes = ['AVI', 'AOI', 'SPI', 'X-Ray'];
const results = ['pass', 'fail', 'warning'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateSerialNumber() {
  const prefix = randomElement(['SN', 'PCB', 'MOD']);
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const seq = String(randomInt(1, 9999)).padStart(4, '0');
  return `${prefix}${date}${seq}`;
}

function generateTimestamp(hoursAgo) {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function seedData() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected successfully!');

  try {
    // 1. Seed machine_inspection_data
    console.log('\n📊 Seeding machine_inspection_data...');
    const inspectionData = [];
    
    for (let i = 0; i < 500; i++) {
      const result = randomElement(results);
      const defectCount = result === 'pass' ? 0 : randomInt(1, 5);
      const defectTypesArr = defectCount > 0 
        ? Array.from({ length: defectCount }, () => randomElement(defectTypes))
        : [];
      
      inspectionData.push([
        1, // apiKeyId
        randomInt(1, 5), // machineId
        randomInt(1, 3), // productionLineId
        randomElement(products), // productCode
        generateSerialNumber(), // serialNumber
        randomElement(inspectionTypes), // inspectionType
        result, // inspectionResult
        defectCount, // defectCount
        JSON.stringify(defectTypesArr), // defectTypes
        JSON.stringify(defectTypesArr.map(dt => ({ type: dt, location: `Zone-${randomInt(1, 8)}`, confidence: randomFloat(0.85, 0.99) }))), // defectDetails
        null, // imageUrls
        generateTimestamp(randomInt(0, 168)), // inspectedAt (last 7 days)
        randomInt(800, 3000), // cycleTimeMs
        `OP-${randomInt(1, 10)}`, // operatorId
        `SHIFT-${randomElement(['A', 'B', 'C'])}`, // shiftId
        randomInt(1, 2), // factory_id
        randomInt(1, 4), // workshop_id
        randomInt(1, 5), // workstation_id
      ]);
    }

    const insertInspectionSql = `
      INSERT INTO machine_inspection_data 
      (apiKeyId, machineId, productionLineId, productCode, serialNumber, 
       inspectionType, inspectionResult, defectCount, defectTypes, defectDetails, imageUrls, 
       inspectedAt, cycleTimeMs, operatorId, shiftId, factory_id, workshop_id, workstation_id)
      VALUES ?
    `;
    
    await connection.query(insertInspectionSql, [inspectionData]);
    console.log(`✅ Inserted ${inspectionData.length} inspection records`);

    // 2. Seed quality_images
    console.log('\n📸 Seeding quality_images...');
    
    // First check if table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'quality_images'");
    if (tables.length === 0) {
      console.log('⏭️ quality_images table does not exist, skipping...');
    } else {
      const qualityImages = [];
      const imageTypes = ['before', 'after', 'reference', 'defect', 'camera_capture'];
      
      for (let i = 0; i < 100; i++) {
        const imageType = randomElement(imageTypes);
        const hasDefect = imageType === 'defect' || Math.random() > 0.7;
        
        qualityImages.push([
          randomElement(products), // product_code
          randomInt(1, 3), // production_line_id
          randomInt(1, 5), // workstation_id
          `https://storage.example.com/quality/${Date.now()}-${i}.jpg`, // image_url
          `quality/${Date.now()}-${i}.jpg`, // image_key
          null, // thumbnail_url
          imageType, // image_type
          randomElement(['upload', 'camera', 'ai_analysis']), // capture_source
          `Ảnh kiểm tra #${i + 1}`, // description
          JSON.stringify({ width: 1920, height: 1080, format: 'JPEG' }), // metadata
          hasDefect ? JSON.stringify({
            defects: Array.from({ length: randomInt(1, 3) }, () => ({
              type: randomElement(defectTypes),
              confidence: randomFloat(0.8, 0.99),
              boundingBox: { x: randomInt(10, 400), y: randomInt(10, 300), w: randomInt(20, 100), h: randomInt(20, 100) }
            }))
          }) : null, // ai_analysis_result
          hasDefect ? randomElement(defectTypes) : null, // defect_type
          hasDefect ? randomElement(['minor', 'major', 'critical']) : null, // defect_severity
          generateTimestamp(randomInt(0, 720)), // captured_at
          randomInt(1, 5), // created_by
        ]);
      }

      const insertImagesSql = `
        INSERT INTO quality_images 
        (product_code, production_line_id, workstation_id, image_url, image_key, thumbnail_url,
         image_type, capture_source, description, metadata, ai_analysis_result, defect_type, 
         defect_severity, captured_at, created_by)
        VALUES ?
      `;
      
      await connection.query(insertImagesSql, [qualityImages]);
      console.log(`✅ Inserted ${qualityImages.length} quality images`);
    }

    // 3. Seed spc_defect_categories
    console.log('\n📋 Seeding spc_defect_categories...');
    
    // Check if categories exist
    const [existingCategories] = await connection.query('SELECT COUNT(*) as count FROM spc_defect_categories');
    if (existingCategories[0].count === 0) {
      const defectCategories = defectTypes.map((dt, idx) => [
        `DEF-${String(idx + 1).padStart(3, '0')}`, // code
        dt, // name
        `${dt} - Lỗi phát hiện bởi hệ thống AVI/AOI`, // description
        dt.includes('Solder') ? 'Soldering' : dt.includes('Component') ? 'Component' : 'Other', // category
        randomElement(['minor', 'major', 'critical']), // severity
        1 // isActive
      ]);

      const insertCategoriesSql = `
        INSERT INTO spc_defect_categories (code, name, description, category, severity, is_active)
        VALUES ?
      `;
      await connection.query(insertCategoriesSql, [defectCategories]);
      console.log(`✅ Inserted ${defectCategories.length} defect categories`);
    } else {
      console.log(`⏭️ Defect categories already exist (${existingCategories[0].count}), skipping...`);
    }

    // 4. Seed spc_defect_records
    console.log('\n🔴 Seeding spc_defect_records...');
    const defectRecords = [];
    
    for (let i = 0; i < 200; i++) {
      defectRecords.push([
        randomInt(1, defectTypes.length), // defectCategoryId
        randomInt(1, 3), // productionLineId
        randomInt(1, 5), // workstationId
        randomInt(1, 5), // productId
        null, // spcAnalysisId
        Math.random() > 0.5 ? `Rule ${randomInt(1, 8)}` : null, // ruleViolated
        randomInt(1, 10), // quantity
        randomElement(['open', 'in_progress', 'resolved', 'closed']), // status
        randomElement(['pending', 'real_ng', 'ntf']), // verificationStatus
        generateTimestamp(randomInt(0, 168)), // occurredAt
        randomInt(1, 5), // reportedBy
      ]);
    }

    const insertDefectsSql = `
      INSERT INTO spc_defect_records 
      (defectCategoryId, productionLineId, workstationId, productId, spcAnalysisId, 
       ruleViolated, quantity, status, verificationStatus, occurredAt, reportedBy)
      VALUES ?
    `;
    
    await connection.query(insertDefectsSql, [defectRecords]);
    console.log(`✅ Inserted ${defectRecords.length} defect records`);

    // 5. Seed machine_realtime_events
    console.log('\n⚡ Seeding machine_realtime_events...');
    const realtimeEvents = [];
    const eventTypes = ['inspection', 'measurement', 'oee', 'alert', 'status'];
    
    for (let i = 0; i < 300; i++) {
      const eventType = randomElement(eventTypes);
      const machineName = randomElement(machines);
      
      let eventData;
      switch (eventType) {
        case 'inspection':
          eventData = {
            serialNumber: generateSerialNumber(),
            result: randomElement(results),
            defectCount: randomInt(0, 5),
            cycleTime: randomInt(800, 3000)
          };
          break;
        case 'measurement':
          eventData = {
            parameter: randomElement(['dimension', 'weight', 'voltage', 'resistance']),
            value: randomFloat(0, 100),
            unit: randomElement(['mm', 'g', 'V', 'Ω']),
            inSpec: Math.random() > 0.1
          };
          break;
        case 'oee':
          eventData = {
            availability: randomFloat(80, 100),
            performance: randomFloat(75, 100),
            quality: randomFloat(90, 100),
            oee: randomFloat(70, 95)
          };
          break;
        case 'alert':
          eventData = {
            alertType: randomElement(['cpk_low', 'defect_high', 'oee_drop', 'machine_error']),
            message: 'Alert triggered',
            threshold: randomFloat(1, 2),
            currentValue: randomFloat(0.5, 1.5)
          };
          break;
        case 'status':
          eventData = {
            previousStatus: randomElement(['running', 'idle', 'maintenance']),
            newStatus: randomElement(['running', 'idle', 'maintenance', 'error']),
            reason: 'Status change'
          };
          break;
      }
      
      realtimeEvents.push([
        eventType, // eventType
        randomInt(1, 5), // machineId
        machineName, // machineName
        1, // apiKeyId
        JSON.stringify(eventData), // eventData
        randomElement(['info', 'warning', 'error', 'critical']), // severity
      ]);
    }

    const insertEventsSql = `
      INSERT INTO machine_realtime_events 
      (eventType, machineId, machineName, apiKeyId, eventData, severity)
      VALUES ?
    `;
    
    await connection.query(insertEventsSql, [realtimeEvents]);
    console.log(`✅ Inserted ${realtimeEvents.length} realtime events`);

    // 6. Seed inspection_remarks
    console.log('\n📝 Seeding inspection_remarks...');
    const inspectionRemarks = [];
    const remarkTypes = ['note', 'defect_detail', 'root_cause', 'corrective_action', 'observation'];
    
    for (let i = 0; i < 100; i++) {
      const remarkType = randomElement(remarkTypes);
      let remark;
      switch (remarkType) {
        case 'note':
          remark = `Ghi chú kiểm tra #${i + 1}: Sản phẩm đạt tiêu chuẩn`;
          break;
        case 'defect_detail':
          remark = `Chi tiết lỗi: ${randomElement(defectTypes)} tại vị trí Zone-${randomInt(1, 8)}`;
          break;
        case 'root_cause':
          remark = `Nguyên nhân gốc: ${randomElement(['Nhiệt độ hàn không đủ', 'Sai vị trí linh kiện', 'Chất lượng mối hàn kém', 'Lỗi máy'])}`;
          break;
        case 'corrective_action':
          remark = `Hành động khắc phục: ${randomElement(['Điều chỉnh nhiệt độ', 'Thay thế linh kiện', 'Hàn lại', 'Bảo trì máy'])}`;
          break;
        case 'observation':
          remark = `Quan sát: ${randomElement(['Cần theo dõi thêm', 'Xu hướng cải thiện', 'Cần kiểm tra kỹ hơn'])}`;
          break;
      }
      
      inspectionRemarks.push([
        randomInt(1, 100), // inspectionId
        remark, // remark
        remarkType, // remarkType
        randomElement(['info', 'warning', 'critical']), // severity
        remarkType === 'defect_detail' ? randomElement(defectTypes.slice(0, 5)) : null, // defectCategory
        null, // imageUrls
        null, // attachmentUrls
        randomInt(1, 5), // createdBy
        `Operator ${randomInt(1, 10)}`, // createdByName
      ]);
    }

    const insertRemarksSql = `
      INSERT INTO inspection_remarks 
      (inspection_id, remark, remark_type, severity, defect_category, image_urls, attachment_urls, 
       created_by, created_by_name)
      VALUES ?
    `;
    
    await connection.query(insertRemarksSql, [inspectionRemarks]);
    console.log(`✅ Inserted ${inspectionRemarks.length} inspection remarks`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEED DATA SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ machine_inspection_data: ${inspectionData.length} records`);
    console.log(`✅ spc_defect_records: ${defectRecords.length} records`);
    console.log(`✅ machine_realtime_events: ${realtimeEvents.length} records`);
    console.log(`✅ inspection_remarks: ${inspectionRemarks.length} records`);
    console.log('='.repeat(50));
    console.log('🎉 Seed completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run seed
seedData().catch(console.error);
