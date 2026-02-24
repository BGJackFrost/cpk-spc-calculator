/**
 * Script cấu hình SMTP Gmail và tạo dữ liệu mẫu mô phỏng thực tế
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function main() {
  console.log('🔧 Connecting to database...');
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // ==========================================
    // 1. CẤU HÌNH SMTP GMAIL
    // ==========================================
    console.log('\n📧 Configuring SMTP Gmail...');
    
    const smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: 0, // false for TLS
      username: 'st4ijsc@gmail.com',
      password: 'cwzyotudilmchjuz', // App Password (no spaces)
      fromEmail: 'st4ijsc@gmail.com',
      fromName: 'SPC/CPK Calculator System'
    };
    
    // Check if SMTP config exists
    const [existingSmtp] = await connection.execute('SELECT id FROM smtp_config LIMIT 1');
    
    if (existingSmtp.length > 0) {
      // Update existing
      await connection.execute(`
        UPDATE smtp_config SET 
          host = ?, port = ?, secure = ?, username = ?, password = ?, fromEmail = ?, fromName = ?, updatedAt = NOW()
        WHERE id = ?
      `, [smtpConfig.host, smtpConfig.port, smtpConfig.secure, smtpConfig.username, smtpConfig.password, smtpConfig.fromEmail, smtpConfig.fromName, existingSmtp[0].id]);
      console.log('✅ SMTP config updated');
    } else {
      // Insert new
      await connection.execute(`
        INSERT INTO smtp_config (host, port, secure, username, password, fromEmail, fromName, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [smtpConfig.host, smtpConfig.port, smtpConfig.secure, smtpConfig.username, smtpConfig.password, smtpConfig.fromEmail, smtpConfig.fromName]);
      console.log('✅ SMTP config created');
    }
    
    // ==========================================
    // 2. TẠO DỮ LIỆU MẪU MÔ PHỎNG THỰC TẾ
    // ==========================================
    console.log('\n📊 Creating sample data...');
    
    // 2.1 Tạo sản phẩm mẫu (nếu chưa có)
    const products = [
      { code: 'PCB-001', name: 'PCB Main Board v2.0', category: 'PCB', description: 'Bo mạch chính cho thiết bị điện tử' },
      { code: 'IC-001', name: 'IC Controller ATmega328', category: 'IC', description: 'Vi điều khiển 8-bit' },
      { code: 'CAP-001', name: 'Capacitor 100uF/25V', category: 'Capacitor', description: 'Tụ điện nhôm' },
      { code: 'RES-001', name: 'Resistor 10K Ohm', category: 'Resistor', description: 'Điện trở carbon film' },
      { code: 'LED-001', name: 'LED SMD 0805 White', category: 'LED', description: 'LED SMD trắng' }
    ];
    
    // Get first user as creator
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const createdBy = users.length > 0 ? users[0].id : 1;
    
    for (const product of products) {
      const [existing] = await connection.execute('SELECT id FROM products WHERE code = ?', [product.code]);
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO products (code, name, category, description, unit, isActive, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 'pcs', 1, ?, NOW(), NOW())
        `, [product.code, product.name, product.category, product.description, createdBy]);
        console.log(`  ✅ Created product: ${product.code}`);
      }
    }
    
    // 2.2 Tạo dây chuyền sản xuất (nếu chưa có)
    const productionLines = [
      { code: 'LINE-01', name: 'SMT Line 1', location: 'Building A - Floor 1', description: 'Dây chuyền SMT tự động' },
      { code: 'LINE-02', name: 'SMT Line 2', location: 'Building A - Floor 1', description: 'Dây chuyền SMT bán tự động' },
      { code: 'LINE-03', name: 'Assembly Line 1', location: 'Building B - Floor 1', description: 'Dây chuyền lắp ráp' }
    ];
    
    for (const line of productionLines) {
      const [existing] = await connection.execute('SELECT id FROM production_lines WHERE code = ?', [line.code]);
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO production_lines (code, name, location, description, isActive, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())
        `, [line.code, line.name, line.location, line.description, createdBy]);
        console.log(`  ✅ Created production line: ${line.code}`);
      }
    }
    
    // Get production line IDs
    const [lines] = await connection.execute('SELECT id, code FROM production_lines');
    const lineMap = {};
    lines.forEach(l => lineMap[l.code] = l.id);
    
    // 2.3 Tạo công trạm (workstations)
    const workstations = [
      { lineCode: 'LINE-01', code: 'WS-SPP-01', name: 'Solder Paste Printing', sequenceOrder: 1 },
      { lineCode: 'LINE-01', code: 'WS-PNP-01', name: 'Pick and Place', sequenceOrder: 2 },
      { lineCode: 'LINE-01', code: 'WS-RFW-01', name: 'Reflow Oven', sequenceOrder: 3 },
      { lineCode: 'LINE-01', code: 'WS-AOI-01', name: 'AOI Inspection', sequenceOrder: 4 },
      { lineCode: 'LINE-02', code: 'WS-SPP-02', name: 'Solder Paste Printing', sequenceOrder: 1 },
      { lineCode: 'LINE-02', code: 'WS-PNP-02', name: 'Pick and Place', sequenceOrder: 2 },
      { lineCode: 'LINE-02', code: 'WS-RFW-02', name: 'Reflow Oven', sequenceOrder: 3 }
    ];
    
    for (const ws of workstations) {
      const lineId = lineMap[ws.lineCode];
      if (!lineId) continue;
      
      const [existing] = await connection.execute('SELECT id FROM workstations WHERE code = ?', [ws.code]);
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO workstations (productionLineId, code, name, sequenceOrder, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 1, NOW(), NOW())
        `, [lineId, ws.code, ws.name, ws.sequenceOrder]);
        console.log(`  ✅ Created workstation: ${ws.code}`);
      }
    }
    
    // 2.4 Tạo Product Specifications (USL/LSL)
    const [productList] = await connection.execute('SELECT id, code FROM products');
    const productMap = {};
    productList.forEach(p => productMap[p.code] = p.id);
    
    const [workstationList] = await connection.execute('SELECT id, code FROM workstations');
    const wsMap = {};
    workstationList.forEach(w => wsMap[w.code] = w.id);
    
    const specifications = [
      // PCB-001 specifications
      { productCode: 'PCB-001', wsCode: 'WS-SPP-01', paramName: 'Solder Paste Height', usl: 150, lsl: 100, target: 125, unit: 'um' },
      { productCode: 'PCB-001', wsCode: 'WS-PNP-01', paramName: 'Placement Accuracy X', usl: 50, lsl: -50, target: 0, unit: 'um' },
      { productCode: 'PCB-001', wsCode: 'WS-PNP-01', paramName: 'Placement Accuracy Y', usl: 50, lsl: -50, target: 0, unit: 'um' },
      { productCode: 'PCB-001', wsCode: 'WS-RFW-01', paramName: 'Peak Temperature', usl: 250, lsl: 230, target: 240, unit: '°C' },
      // IC-001 specifications
      { productCode: 'IC-001', wsCode: 'WS-PNP-01', paramName: 'Placement Accuracy', usl: 30, lsl: -30, target: 0, unit: 'um' },
      { productCode: 'IC-001', wsCode: 'WS-RFW-01', paramName: 'Solder Joint Quality', usl: 100, lsl: 80, target: 90, unit: '%' },
      // CAP-001 specifications
      { productCode: 'CAP-001', wsCode: 'WS-PNP-01', paramName: 'Capacitance', usl: 110, lsl: 90, target: 100, unit: 'uF' },
    ];
    
    for (const spec of specifications) {
      const productId = productMap[spec.productCode];
      const workstationId = wsMap[spec.wsCode];
      if (!productId || !workstationId) continue;
      
      const [existing] = await connection.execute(
        'SELECT id FROM product_specifications WHERE productId = ? AND workstationId = ? AND parameterName = ?',
        [productId, workstationId, spec.paramName]
      );
      
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO product_specifications (productId, workstationId, parameterName, usl, lsl, target, unit, isActive, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
        `, [productId, workstationId, spec.paramName, spec.usl * 100, spec.lsl * 100, spec.target * 100, spec.unit, createdBy]);
        console.log(`  ✅ Created specification: ${spec.productCode} - ${spec.paramName}`);
      }
    }
    
    // ==========================================
    // 3. TẠO DỮ LIỆU PHÂN TÍCH SPC MẪU
    // ==========================================
    console.log('\n📈 Creating sample SPC analysis data...');
    
    // Tạo dữ liệu phân tích SPC mô phỏng 30 ngày
    const now = new Date();
    const spcData = [];
    
    // Generate realistic SPC data
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      
      // Morning shift (6:00-14:00)
      const morningStart = new Date(date);
      morningStart.setHours(6, 0, 0, 0);
      const morningEnd = new Date(date);
      morningEnd.setHours(14, 0, 0, 0);
      
      // Afternoon shift (14:00-22:00)
      const afternoonStart = new Date(date);
      afternoonStart.setHours(14, 0, 0, 0);
      const afternoonEnd = new Date(date);
      afternoonEnd.setHours(22, 0, 0, 0);
      
      // Night shift (22:00-6:00 next day)
      const nightStart = new Date(date);
      nightStart.setHours(22, 0, 0, 0);
      const nightEnd = new Date(date);
      nightEnd.setDate(nightEnd.getDate() + 1);
      nightEnd.setHours(6, 0, 0, 0);
      
      // Generate data for each product/station combination
      const combinations = [
        { productCode: 'PCB-001', stationName: 'Solder Paste Printing', baseCpk: 1.45, variance: 0.15 },
        { productCode: 'PCB-001', stationName: 'Pick and Place', baseCpk: 1.52, variance: 0.12 },
        { productCode: 'PCB-001', stationName: 'Reflow Oven', baseCpk: 1.38, variance: 0.18 },
        { productCode: 'IC-001', stationName: 'Pick and Place', baseCpk: 1.42, variance: 0.14 },
        { productCode: 'CAP-001', stationName: 'Pick and Place', baseCpk: 1.35, variance: 0.20 },
      ];
      
      for (const combo of combinations) {
        // Morning shift data
        const morningCpk = Math.max(0.8, combo.baseCpk + (Math.random() - 0.5) * combo.variance);
        spcData.push({
          productCode: combo.productCode,
          stationName: combo.stationName,
          startDate: morningStart,
          endDate: morningEnd,
          sampleCount: 50 + Math.floor(Math.random() * 30),
          mean: 12500 + Math.floor(Math.random() * 500),
          stdDev: 200 + Math.floor(Math.random() * 100),
          cpk: Math.round(morningCpk * 100),
          cp: Math.round((morningCpk + 0.1) * 100),
          alertTriggered: morningCpk < 1.33 ? 1 : 0
        });
        
        // Afternoon shift data
        const afternoonCpk = Math.max(0.8, combo.baseCpk + (Math.random() - 0.5) * combo.variance);
        spcData.push({
          productCode: combo.productCode,
          stationName: combo.stationName,
          startDate: afternoonStart,
          endDate: afternoonEnd,
          sampleCount: 45 + Math.floor(Math.random() * 25),
          mean: 12500 + Math.floor(Math.random() * 500),
          stdDev: 200 + Math.floor(Math.random() * 100),
          cpk: Math.round(afternoonCpk * 100),
          cp: Math.round((afternoonCpk + 0.1) * 100),
          alertTriggered: afternoonCpk < 1.33 ? 1 : 0
        });
        
        // Night shift data (slightly lower CPK due to fatigue)
        const nightCpk = Math.max(0.8, combo.baseCpk - 0.05 + (Math.random() - 0.5) * combo.variance);
        spcData.push({
          productCode: combo.productCode,
          stationName: combo.stationName,
          startDate: nightStart,
          endDate: nightEnd,
          sampleCount: 40 + Math.floor(Math.random() * 20),
          mean: 12500 + Math.floor(Math.random() * 500),
          stdDev: 220 + Math.floor(Math.random() * 120),
          cpk: Math.round(nightCpk * 100),
          cp: Math.round((nightCpk + 0.1) * 100),
          alertTriggered: nightCpk < 1.33 ? 1 : 0
        });
      }
    }
    
    // Insert SPC data
    let insertedCount = 0;
    for (const data of spcData) {
      try {
        await connection.execute(`
          INSERT INTO spc_analysis_history 
          (mappingId, productCode, stationName, startDate, endDate, sampleCount, mean, stdDev, cp, cpk, ucl, lcl, usl, lsl, alertTriggered, analyzedBy, createdAt)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          data.productCode, 
          data.stationName, 
          data.startDate, 
          data.endDate, 
          data.sampleCount,
          data.mean,
          data.stdDev,
          data.cp,
          data.cpk,
          data.mean + 3 * data.stdDev, // UCL
          data.mean - 3 * data.stdDev, // LCL
          15000, // USL
          10000, // LSL
          data.alertTriggered,
          createdBy
        ]);
        insertedCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`  ✅ Created ${insertedCount} SPC analysis records`);
    
    // ==========================================
    // 4. TẠO ALERT SETTINGS
    // ==========================================
    console.log('\n⚠️ Creating alert settings...');
    
    const [existingAlert] = await connection.execute('SELECT id FROM alert_settings LIMIT 1');
    if (existingAlert.length === 0) {
      await connection.execute(`
        INSERT INTO alert_settings (mappingId, cpkWarningThreshold, cpkCriticalThreshold, notifyOwner, isActive, createdAt, updatedAt)
        VALUES (NULL, 133, 100, 1, 1, NOW(), NOW())
      `);
      console.log('  ✅ Created default alert settings (CPK Warning: 1.33, Critical: 1.0)');
    }
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - SMTP Gmail configured: st4ijsc@gmail.com');
    console.log('  - Products created: 5');
    console.log('  - Production lines created: 3');
    console.log('  - Workstations created: 7');
    console.log('  - Product specifications created: 7');
    console.log(`  - SPC analysis records created: ${insertedCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
