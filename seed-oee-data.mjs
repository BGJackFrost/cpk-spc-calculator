// Script to seed OEE sample data
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seedOEEData() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Starting OEE data seeding...');
    
    // Get existing machines
    const [machines] = await connection.execute('SELECT id, name FROM machines');
    console.log(`Found ${machines.length} machines`);
    
    if (machines.length === 0) {
      console.log('No machines found, skipping...');
      return;
    }
    
    // Create OEE loss categories if not exists
    const [existingCategories] = await connection.execute('SELECT COUNT(*) as count FROM oee_loss_categories');
    if (existingCategories[0].count === 0) {
      console.log('Creating OEE loss categories...');
      await connection.execute(`
        INSERT INTO oee_loss_categories (name, code, type, description) VALUES
        ('Hỏng máy', 'BREAKDOWN', 'availability', 'Máy hỏng đột xuất'),
        ('Chờ nguyên liệu', 'MATERIAL_WAIT', 'availability', 'Chờ nguyên vật liệu'),
        ('Cài đặt máy', 'SETUP', 'availability', 'Thời gian cài đặt, điều chỉnh'),
        ('Chạy chậm', 'SLOW_RUN', 'performance', 'Máy chạy chậm hơn tốc độ chuẩn'),
        ('Dừng ngắn', 'MINOR_STOP', 'performance', 'Dừng máy ngắn < 5 phút'),
        ('Phế phẩm', 'SCRAP', 'quality', 'Sản phẩm lỗi phải bỏ'),
        ('Tái chế', 'REWORK', 'quality', 'Sản phẩm cần sửa lại')
      `);
    }
    
    // Create OEE targets if not exists
    const [existingTargets] = await connection.execute('SELECT COUNT(*) as count FROM oee_targets');
    if (existingTargets[0].count === 0) {
      console.log('Creating OEE targets...');
      for (const machine of machines) {
        await connection.execute(`
          INSERT INTO oee_targets (machineId, targetOee, targetAvailability, targetPerformance, targetQuality, effectiveFrom)
          VALUES (?, 85.00, 90.00, 95.00, 99.00, NOW())
        `, [machine.id]);
      }
    }
    
    // Check existing OEE records
    const [existingRecords] = await connection.execute('SELECT COUNT(*) as count FROM oee_records');
    if (existingRecords[0].count > 0) {
      console.log(`Already have ${existingRecords[0].count} OEE records, skipping generation...`);
    } else {
      // Generate OEE records for last 90 days
      console.log('Generating OEE records for last 90 days...');
      const today = new Date();
      
      for (const machine of machines) {
        for (let i = 0; i < 90; i++) {
          const recordDate = new Date(today);
          recordDate.setDate(recordDate.getDate() - i);
          
          // Random but realistic OEE values
          const plannedTime = 480; // 8 hours
          const breakdowns = Math.floor(Math.random() * 60); // 0-60 min
          const setup = Math.floor(Math.random() * 30); // 0-30 min
          const runTime = plannedTime - breakdowns - setup;
          
          const cycleTime = 1; // 1 min per unit
          const totalParts = Math.floor(runTime / cycleTime * (0.85 + Math.random() * 0.15));
          const rejectParts = Math.floor(totalParts * (Math.random() * 0.05)); // 0-5% defects
          const goodParts = totalParts - rejectParts;
          
          const availability = runTime / plannedTime * 100;
          const performance = (totalParts * cycleTime) / runTime * 100;
          const quality = goodParts / totalParts * 100;
          const oee = (availability * performance * quality) / 10000;
          
          await connection.execute(`
            INSERT INTO oee_records (
              machineId, recordDate, plannedTime, runTime,
              cycleTime, totalParts, goodParts, rejectParts,
              availability, performance, quality, oee, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            machine.id,
            recordDate.toISOString().split('T')[0] + ' 08:00:00',
            plannedTime,
            runTime,
            cycleTime,
            totalParts,
            goodParts,
            rejectParts,
            availability.toFixed(2),
            performance.toFixed(2),
            quality.toFixed(2),
            oee.toFixed(2),
            `Auto-generated OEE record for ${machine.name}`
          ]);
        }
        console.log(`Generated 90 OEE records for ${machine.name}`);
      }
    }
    
    // Generate OEE loss records
    const [existingLosses] = await connection.execute('SELECT COUNT(*) as count FROM oee_loss_records');
    if (existingLosses[0].count === 0) {
      console.log('Generating OEE loss records...');
      const [oeeRecords] = await connection.execute('SELECT id FROM oee_records LIMIT 100');
      const [lossCategories] = await connection.execute('SELECT id, type FROM oee_loss_categories');
      
      for (const record of oeeRecords) {
        // Add 1-3 random losses per record
        const numLosses = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numLosses; j++) {
          const category = lossCategories[Math.floor(Math.random() * lossCategories.length)];
          const duration = Math.floor(Math.random() * 30) + 5; // 5-35 minutes
          const quantity = category.type === 'quality' ? Math.floor(Math.random() * 10) + 1 : 0;
          
          await connection.execute(`
            INSERT INTO oee_loss_records (oeeRecordId, lossCategoryId, durationMinutes, quantity, description)
            VALUES (?, ?, ?, ?, ?)
          `, [record.id, category.id, duration, quantity, 'Auto-generated loss record']);
        }
      }
    }
    
    console.log('OEE data seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding OEE data:', error);
  } finally {
    await connection.end();
  }
}

seedOEEData();
