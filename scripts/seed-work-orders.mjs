/**
 * Script thêm dữ liệu mẫu Work Orders cho máy MC02 (Máy Gắn Chip SMT)
 * để MTBF/MTTR hiển thị giá trị thực tế trong Equipment QR Lookup
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seedWorkOrders() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Machine MC02 has id = 30001
    const machineId = 30001;
    
    // Kiểm tra maintenance_types
    const [types] = await conn.execute('SELECT id, code, name FROM maintenance_types');
    console.log('Maintenance types:', types.map(t => `${t.id}: ${t.name}`).join(', '));
    
    // Tạo work orders mẫu với thời gian thực tế để tính MTBF/MTTR
    const workOrders = [
      {
        workOrderNumber: 'WO-MC02-001',
        machineId: machineId,
        maintenanceTypeId: 1, // Sửa chữa khẩn cấp
        title: 'Sửa lỗi feeder kẹt linh kiện',
        description: 'Feeder 1 bị kẹt linh kiện, cần vệ sinh và điều chỉnh',
        priority: 'high',
        status: 'completed',
        reportedAt: '2024-11-01 08:30:00',
        actualStartAt: '2024-11-01 09:00:00',
        completedAt: '2024-11-01 11:30:00', // 2.5 giờ sửa chữa
      },
      {
        workOrderNumber: 'WO-MC02-002',
        machineId: machineId,
        maintenanceTypeId: 3, // Bảo trì định kỳ
        title: 'Bảo trì định kỳ tháng 11',
        description: 'Kiểm tra và vệ sinh toàn bộ máy, thay dầu bôi trơn',
        priority: 'medium',
        status: 'completed',
        reportedAt: '2024-11-15 06:00:00',
        actualStartAt: '2024-11-15 06:30:00',
        completedAt: '2024-11-15 10:30:00', // 4 giờ bảo trì
      },
      {
        workOrderNumber: 'WO-MC02-003',
        machineId: machineId,
        maintenanceTypeId: 2, // Sửa chữa thông thường
        title: 'Thay thế nozzle bị mòn',
        description: 'Nozzle số 3 và 5 bị mòn, cần thay thế',
        priority: 'medium',
        status: 'completed',
        reportedAt: '2024-11-25 14:00:00',
        actualStartAt: '2024-11-25 14:30:00',
        completedAt: '2024-11-25 16:00:00', // 1.5 giờ sửa chữa
      },
      {
        workOrderNumber: 'WO-MC02-004',
        machineId: machineId,
        maintenanceTypeId: 1, // Sửa chữa khẩn cấp
        title: 'Lỗi camera vision',
        description: 'Camera vision không nhận diện được linh kiện, cần hiệu chỉnh',
        priority: 'critical',
        status: 'completed',
        reportedAt: '2024-12-05 10:00:00',
        actualStartAt: '2024-12-05 10:15:00',
        completedAt: '2024-12-05 12:45:00', // 2.5 giờ sửa chữa
      },
      {
        workOrderNumber: 'WO-MC02-005',
        machineId: machineId,
        maintenanceTypeId: 3, // Bảo trì định kỳ
        title: 'Bảo trì định kỳ tháng 12',
        description: 'Kiểm tra định kỳ, vệ sinh và calibration',
        priority: 'medium',
        status: 'completed',
        reportedAt: '2024-12-15 06:00:00',
        actualStartAt: '2024-12-15 06:30:00',
        completedAt: '2024-12-15 09:30:00', // 3 giờ bảo trì
      },
      {
        workOrderNumber: 'WO-MC02-006',
        machineId: machineId,
        maintenanceTypeId: 2, // Sửa chữa thông thường
        title: 'Điều chỉnh độ chính xác gắp linh kiện',
        description: 'Độ chính xác gắp linh kiện giảm, cần calibration lại',
        priority: 'low',
        status: 'completed',
        reportedAt: '2024-12-20 08:00:00',
        actualStartAt: '2024-12-20 09:00:00',
        completedAt: '2024-12-20 10:30:00', // 1.5 giờ
      },
    ];
    
    console.log('\nInserting work orders for machine MC02 (id:', machineId, ')...');
    
    for (const wo of workOrders) {
      // Check if work order already exists
      const [existing] = await conn.execute(
        'SELECT id FROM work_orders WHERE workOrderNumber = ?',
        [wo.workOrderNumber]
      );
      
      if (existing.length > 0) {
        console.log(`  - ${wo.workOrderNumber} already exists, skipping...`);
        continue;
      }
      
      await conn.execute(`
        INSERT INTO work_orders 
        (workOrderNumber, machineId, maintenanceTypeId, title, description, priority, status, reportedAt, actualStartAt, completedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        wo.workOrderNumber,
        wo.machineId,
        wo.maintenanceTypeId,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        wo.reportedAt,
        wo.actualStartAt,
        wo.completedAt
      ]);
      
      console.log(`  + Added: ${wo.workOrderNumber} - ${wo.title}`);
    }
    
    // Verify inserted data
    const [result] = await conn.execute(`
      SELECT 
        COUNT(*) as totalWorkOrders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
        SUM(TIMESTAMPDIFF(MINUTE, actualStartAt, completedAt)) as totalRepairTime
      FROM work_orders 
      WHERE machineId = ?
    `, [machineId]);
    
    console.log('\n=== Summary for MC02 ===');
    console.log('Total work orders:', result[0].totalWorkOrders);
    console.log('Completed orders:', result[0].completedOrders);
    console.log('Total repair time (minutes):', result[0].totalRepairTime);
    
    // Calculate MTBF and MTTR
    // MTBF = Total Operating Time / Number of Failures
    // MTTR = Total Repair Time / Number of Repairs
    
    const [mttrData] = await conn.execute(`
      SELECT 
        COUNT(*) as repairCount,
        AVG(TIMESTAMPDIFF(MINUTE, actualStartAt, completedAt)) as avgRepairTime
      FROM work_orders 
      WHERE machineId = ? 
        AND status = 'completed' 
        AND actualStartAt IS NOT NULL 
        AND completedAt IS NOT NULL
    `, [machineId]);
    
    console.log('\n=== MTBF/MTTR Calculation ===');
    console.log('Number of repairs:', mttrData[0].repairCount);
    console.log('Average repair time (MTTR):', Math.round(mttrData[0].avgRepairTime || 0), 'minutes');
    
    // MTBF calculation (assuming 24/7 operation from first to last work order)
    const [timeRange] = await conn.execute(`
      SELECT 
        MIN(reportedAt) as firstFailure,
        MAX(reportedAt) as lastFailure,
        COUNT(*) as failureCount
      FROM work_orders 
      WHERE machineId = ? AND maintenanceTypeId IN (1, 2) AND status = 'completed'
    `, [machineId]);
    
    if (timeRange[0].failureCount > 1) {
      const firstFailure = new Date(timeRange[0].firstFailure);
      const lastFailure = new Date(timeRange[0].lastFailure);
      const totalHours = (lastFailure - firstFailure) / (1000 * 60 * 60);
      const mtbf = totalHours / (timeRange[0].failureCount - 1);
      console.log('MTBF (estimated):', Math.round(mtbf), 'hours');
    }
    
    console.log('\nDone! Work orders seeded successfully.');
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

seedWorkOrders();
