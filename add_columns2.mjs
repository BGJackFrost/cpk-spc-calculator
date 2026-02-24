import mysql from "mysql2/promise";

async function addColumns() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const alterStatements = [
    // production_lines
    `ALTER TABLE production_lines ADD COLUMN imageUrl VARCHAR(500)`,
    // workstations
    `ALTER TABLE workstations ADD COLUMN imageUrl VARCHAR(500)`,
    // machines
    `ALTER TABLE machines ADD COLUMN imageUrl VARCHAR(500)`,
    // process_templates
    `ALTER TABLE process_templates ADD COLUMN imageUrl VARCHAR(500)`,
    // Create jigs table
    `CREATE TABLE IF NOT EXISTS jigs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      machineId INT NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      imageUrl VARCHAR(500),
      position INT NOT NULL DEFAULT 1,
      status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active' NOT NULL,
      installDate TIMESTAMP NULL,
      lastMaintenanceDate TIMESTAMP NULL,
      isActive INT NOT NULL DEFAULT 1,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )`,
    // Create product_station_machine_standards table
    `CREATE TABLE IF NOT EXISTS product_station_machine_standards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      productId INT NOT NULL,
      workstationId INT NOT NULL,
      machineId INT,
      measurementName VARCHAR(255) NOT NULL,
      usl INT,
      lsl INT,
      target INT,
      unit VARCHAR(50) DEFAULT 'mm',
      sampleSize INT NOT NULL DEFAULT 5,
      sampleFrequency INT NOT NULL DEFAULT 60,
      samplingMethod VARCHAR(100) DEFAULT 'random',
      appliedSpcRules TEXT,
      cpkWarningThreshold INT DEFAULT 133,
      cpkCriticalThreshold INT DEFAULT 100,
      notes TEXT,
      isActive INT NOT NULL DEFAULT 1,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )`
  ];
  
  for (const stmt of alterStatements) {
    try {
      await conn.execute(stmt);
      console.log("OK:", stmt.substring(0, 60) + "...");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log("SKIP (exists):", stmt.substring(0, 60) + "...");
      } else {
        console.log("ERROR:", e.code, e.message.substring(0, 80));
      }
    }
  }
  
  await conn.end();
  console.log("Done!");
}

addColumns();
