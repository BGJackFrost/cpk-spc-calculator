/**
 * External Database Service
 * Supports multiple database types: MySQL, SQL Server, Oracle, PostgreSQL, Access, Excel
 */

import { getDb } from "./db";
import { databaseConnections } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { encrypt, decrypt, isEncrypted } from "./encryptionService";

// Database type enum
export type DatabaseType = "mysql" | "sqlserver" | "oracle" | "postgres" | "access" | "excel" | "internal";

// Connection configuration
export interface ConnectionConfig {
  id?: number;
  name: string;
  databaseType: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  filePath?: string;
  connectionOptions?: Record<string, unknown>;
  description?: string;
}

// Table info
export interface TableInfo {
  name: string;
  schema?: string;
  type: "table" | "view";
  rowCount?: number;
}

// Column info
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

// Query result
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

// Test result
export interface TestResult {
  success: boolean;
  message: string;
  version?: string;
  latency?: number;
}

// Default ports for each database type
const DEFAULT_PORTS: Record<DatabaseType, number> = {
  mysql: 3306,
  sqlserver: 1433,
  oracle: 1521,
  postgres: 5432,
  access: 0,
  excel: 0,
  internal: 0,
};

/**
 * Get all saved connections
 */
export async function getConnections() {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  const connections = await db.select().from(databaseConnections).where(eq(databaseConnections.isActive, 1));
  
  // Decrypt passwords and mask them for display
  return connections.map(conn => ({
    ...conn,
    password: conn.password ? "••••••••" : null,
    connectionString: conn.connectionString ? "••••••••" : null,
  }));
}

/**
 * Get connection by ID (with decrypted password for internal use)
 */
export async function getConnectionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  const [connection] = await db.select().from(databaseConnections).where(eq(databaseConnections.id, id));
  if (!connection) return null;
  
  // Decrypt password if encrypted - with error handling
  if (connection.password && isEncrypted(connection.password)) {
    try {
      connection.password = decrypt(connection.password);
    } catch (error) {
      console.warn(`Failed to decrypt password for connection ${id}, keeping original value`);
      // Keep original value if decryption fails (might be plain text or corrupted)
    }
  }
  if (connection.connectionString && isEncrypted(connection.connectionString)) {
    try {
      connection.connectionString = decrypt(connection.connectionString);
    } catch (error) {
      console.warn(`Failed to decrypt connectionString for connection ${id}, keeping original value`);
      // Keep original value if decryption fails
    }
  }
  
  return connection;
}

/**
 * Create a new connection
 */
export async function createConnection(config: ConnectionConfig, userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  // Encrypt sensitive data
  const encryptedPassword = config.password ? encrypt(config.password) : null;
  
  const [result] = await db.insert(databaseConnections).values({
    name: config.name,
    databaseType: config.databaseType,
    host: config.host || null,
    port: config.port || DEFAULT_PORTS[config.databaseType] || null,
    database: config.database || null,
    username: config.username || null,
    password: encryptedPassword,
    filePath: config.filePath || null,
    connectionOptions: config.connectionOptions ? JSON.stringify(config.connectionOptions) : null,
    connectionString: null,
    description: config.description || null,
    createdBy: userId,
    isActive: 1,
  });
  
  return { id: result.insertId };
}

/**
 * Update a connection
 */
export async function updateConnection(id: number, config: Partial<ConnectionConfig>) {
  const updateData: Record<string, unknown> = {};
  
  if (config.name !== undefined) updateData.name = config.name;
  if (config.databaseType !== undefined) updateData.databaseType = config.databaseType;
  if (config.host !== undefined) updateData.host = config.host;
  if (config.port !== undefined) updateData.port = config.port;
  if (config.database !== undefined) updateData.database = config.database;
  if (config.username !== undefined) updateData.username = config.username;
  if (config.password !== undefined) updateData.password = encrypt(config.password);
  if (config.filePath !== undefined) updateData.filePath = config.filePath;
  if (config.connectionOptions !== undefined) {
    updateData.connectionOptions = JSON.stringify(config.connectionOptions);
  }
  if (config.description !== undefined) updateData.description = config.description;
  
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  await db.update(databaseConnections).set(updateData).where(eq(databaseConnections.id, id));
  return { success: true };
}

/**
 * Delete a connection (soft delete)
 */
export async function deleteConnection(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  await db.update(databaseConnections).set({ isActive: 0 }).where(eq(databaseConnections.id, id));
  return { success: true };
}

/**
 * Build connection string from config
 */
function buildConnectionString(config: ConnectionConfig): string {
  switch (config.databaseType) {
    case "mysql":
      return `mysql://${config.username}:${config.password}@${config.host}:${config.port || 3306}/${config.database}`;
    case "postgres":
      return `postgresql://${config.username}:${config.password}@${config.host}:${config.port || 5432}/${config.database}`;
    case "sqlserver":
      return `Server=${config.host},${config.port || 1433};Database=${config.database};User Id=${config.username};Password=${config.password};`;
    case "oracle":
      return `${config.username}/${config.password}@${config.host}:${config.port || 1521}/${config.database}`;
    case "access":
    case "excel":
      return config.filePath || "";
    default:
      return "";
  }
}

/**
 * Test database connection
 */
export async function testConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    switch (config.databaseType) {
      case "mysql":
        return await testMySQLConnection(config, startTime);
      case "postgres":
        return await testPostgresConnection(config, startTime);
      case "sqlserver":
        return await testSQLServerConnection(config, startTime);
      case "oracle":
        return await testOracleConnection(config, startTime);
      case "access":
      case "excel":
        return await testFileConnection(config, startTime);
      default:
        return { success: false, message: `Unsupported database type: ${config.databaseType}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Test MySQL connection
 */
async function testMySQLConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }, startTime: number): Promise<TestResult> {
  try {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });
    
    const [rows] = await connection.query("SELECT VERSION() as version");
    const version = (rows as Array<{ version: string }>)[0]?.version || "Unknown";
    
    await connection.end();
    
    return {
      success: true,
      message: "Kết nối thành công",
      version: `MySQL ${version}`,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Test PostgreSQL connection
 */
async function testPostgresConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }, startTime: number): Promise<TestResult> {
  // PostgreSQL requires pg package
  return {
    success: false,
    message: "PostgreSQL connection requires pg package. Please install: pnpm add pg",
    latency: Date.now() - startTime,
  };
}

/**
 * Test SQL Server connection
 */
async function testSQLServerConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }, startTime: number): Promise<TestResult> {
  // SQL Server requires mssql package
  return {
    success: false,
    message: "SQL Server connection requires mssql package. Please install: pnpm add mssql",
    latency: Date.now() - startTime,
  };
}

/**
 * Test Oracle connection
 */
async function testOracleConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }, startTime: number): Promise<TestResult> {
  // Oracle requires oracledb package
  return {
    success: false,
    message: "Oracle connection requires oracledb package. Please install: pnpm add oracledb",
    latency: Date.now() - startTime,
  };
}

/**
 * Test file-based connection (Access, Excel)
 */
async function testFileConnection(config: Omit<ConnectionConfig, 'name'> & { name?: string }, startTime: number): Promise<TestResult> {
  if (!config.filePath) {
    return { success: false, message: "File path is required", latency: Date.now() - startTime };
  }
  
  // Check if file exists
  const fs = await import("fs/promises");
  try {
    await fs.access(config.filePath);
    return {
      success: true,
      message: "File exists and is accessible",
      version: config.databaseType === "excel" ? "Excel" : "Access",
      latency: Date.now() - startTime,
    };
  } catch {
    return {
      success: false,
      message: `File not found: ${config.filePath}`,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Get tables from external database
 */
export async function getTables(connectionId: number): Promise<TableInfo[]> {
  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error("Connection not found");
  
  switch (connection.databaseType) {
    case "mysql":
      return await getMySQLTables(connection);
    case "postgres":
      return await getPostgresTables(connection);
    case "sqlserver":
      return await getSQLServerTables(connection);
    case "oracle":
      return await getOracleTables(connection);
    case "excel":
      return await getExcelTables(connection);
    case "access":
      return await getAccessTables(connection);
    case "internal":
      return await getInternalTables();
    default:
      throw new Error(`Unsupported database type: ${connection.databaseType}`);
  }
}

/**
 * Get MySQL tables
 */
async function getMySQLTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: connection.host || undefined,
    port: connection.port || 3306,
    user: connection.username || undefined,
    password: connection.password || undefined,
    database: connection.database || undefined,
    connectTimeout: 10000,
  });
  
  try {
    const [rows] = await conn.query(`
      SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type,
        TABLE_ROWS as rowCount
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [connection.database]);
    
    return (rows as Array<{ name: string; type: string; rowCount: number }>).map(row => ({
      name: row.name,
      type: row.type === "VIEW" ? "view" : "table",
      rowCount: row.rowCount || 0,
    }));
  } finally {
    await conn.end();
  }
}

/**
 * Get PostgreSQL tables (placeholder)
 */
async function getPostgresTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  throw new Error("PostgreSQL support requires pg package");
}

/**
 * Get SQL Server tables (placeholder)
 */
async function getSQLServerTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  throw new Error("SQL Server support requires mssql package");
}

/**
 * Get Oracle tables (placeholder)
 */
async function getOracleTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  throw new Error("Oracle support requires oracledb package");
}

/**
 * Get Excel sheets as tables
 */
async function getExcelTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  if (!connection.filePath) throw new Error("File path is required");
  
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.readFile(connection.filePath);
    
    return workbook.SheetNames.map(name => ({
      name,
      type: "table" as const,
      rowCount: 0,
    }));
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get Access tables (placeholder)
 */
async function getAccessTables(connection: typeof databaseConnections.$inferSelect): Promise<TableInfo[]> {
  throw new Error("Access support requires additional ODBC driver");
}

/**
 * Get Internal database tables (current app database)
 * Only shows sample/demo tables for user testing
 */
async function getInternalTables(): Promise<TableInfo[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  
  // Whitelist of sample tables to show (for demo purposes)
  const SAMPLE_TABLES = [
    'sample_products',
    'sample_measurements',
  ];
  
  // Get all tables from current database
  const [rows] = await db.execute(`
    SELECT 
      TABLE_NAME as name,
      TABLE_TYPE as type,
      TABLE_ROWS as rowCount
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `) as unknown as [Array<{ name: string; type: string; rowCount: number }>, unknown];
  
  // Only show sample tables (whitelist approach)
  return rows
    .filter(row => SAMPLE_TABLES.includes(row.name.toLowerCase()))
    .map(row => ({
      name: row.name,
      type: row.type === "VIEW" ? "view" as const : "table" as const,
      rowCount: row.rowCount || 0,
    }));
}

/**
 * Get table schema
 */
export async function getTableSchema(connectionId: number, tableName: string): Promise<ColumnInfo[]> {
  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error("Connection not found");
  
  switch (connection.databaseType) {
    case "mysql":
      return await getMySQLTableSchema(connection, tableName);
    case "excel":
      return await getExcelTableSchema(connection, tableName);
    case "internal":
      return await getInternalTableSchema(tableName);
    default:
      throw new Error(`Schema retrieval not supported for ${connection.databaseType}`);
  }
}

/**
 * Get MySQL table schema
 */
async function getMySQLTableSchema(connection: typeof databaseConnections.$inferSelect, tableName: string): Promise<ColumnInfo[]> {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: connection.host || undefined,
    port: connection.port || 3306,
    user: connection.username || undefined,
    password: connection.password || undefined,
    database: connection.database || undefined,
    connectTimeout: 10000,
  });
  
  try {
    const [rows] = await conn.query(`
      SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as columnKey,
        COLUMN_DEFAULT as defaultValue
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [connection.database, tableName]);
    
    return (rows as Array<{ name: string; type: string; nullable: string; columnKey: string; defaultValue: string | null }>).map(row => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === "YES",
      isPrimaryKey: row.columnKey === "PRI",
      defaultValue: row.defaultValue || undefined,
    }));
  } finally {
    await conn.end();
  }
}

/**
 * Get Excel table schema
 */
async function getExcelTableSchema(connection: typeof databaseConnections.$inferSelect, sheetName: string): Promise<ColumnInfo[]> {
  if (!connection.filePath) throw new Error("File path is required");
  
  const XLSX = await import("xlsx");
  const workbook = XLSX.readFile(connection.filePath);
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  if (data.length === 0) return [];
  
  const headers = data[0] as string[];
  return headers.map(name => ({
    name: String(name),
    type: "text",
    nullable: true,
    isPrimaryKey: false,
  }));
}

/**
 * Get table data with pagination and sorting
 */
export async function getTableData(
  connectionId: number,
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<QueryResult> {
  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error("Connection not found");
  
  const { page = 1, pageSize = 50, sortColumn, sortDirection = "asc" } = options;
  
  switch (connection.databaseType) {
    case "mysql":
      return await getMySQLTableData(connection, tableName, page, pageSize, sortColumn, sortDirection);
    case "excel":
      return await getExcelTableData(connection, tableName, page, pageSize, sortColumn, sortDirection);
    case "internal":
      return await getInternalTableData(tableName, page, pageSize, sortColumn, sortDirection);
    default:
      throw new Error(`Data retrieval not supported for ${connection.databaseType}`);
  }
}

/**
 * Get MySQL table data
 */
async function getMySQLTableData(
  connection: typeof databaseConnections.$inferSelect,
  tableName: string,
  page: number,
  pageSize: number,
  sortColumn?: string,
  sortDirection: "asc" | "desc" = "asc"
): Promise<QueryResult> {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: connection.host || undefined,
    port: connection.port || 3306,
    user: connection.username || undefined,
    password: connection.password || undefined,
    database: connection.database || undefined,
    connectTimeout: 10000,
  });
  
  try {
    // Get total count
    const [countResult] = await conn.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = (countResult as Array<{ total: number }>)[0]?.total || 0;
    
    // Build query with pagination and sorting
    let query = `SELECT * FROM \`${tableName}\``;
    if (sortColumn) {
      query += ` ORDER BY \`${sortColumn}\` ${sortDirection.toUpperCase()}`;
    }
    query += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    
    const [rows] = await conn.query(query);
    const data = rows as Record<string, unknown>[];
    
    // Get column names
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    return {
      columns,
      rows: data,
      total,
      page,
      pageSize,
    };
  } finally {
    await conn.end();
  }
}

/**
 * Get Excel table data
 */
async function getExcelTableData(
  connection: typeof databaseConnections.$inferSelect,
  sheetName: string,
  page: number,
  pageSize: number,
  sortColumn?: string,
  sortDirection: "asc" | "desc" = "asc"
): Promise<QueryResult> {
  if (!connection.filePath) throw new Error("File path is required");
  
  const XLSX = await import("xlsx");
  const workbook = XLSX.readFile(connection.filePath);
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  
  let data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  const total = data.length;
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Sort if needed
  if (sortColumn && columns.includes(sortColumn)) {
    data.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }
  
  // Paginate
  const startIndex = (page - 1) * pageSize;
  const rows = data.slice(startIndex, startIndex + pageSize);
  
  return {
    columns,
    rows,
    total,
    page,
    pageSize,
  };
}

/**
 * Update connection test status
 */
export async function updateConnectionTestStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  await db.update(databaseConnections)
    .set({
      lastTestedAt: new Date(),
      lastTestStatus: status,
    })
    .where(eq(databaseConnections.id, id));
}

/**
 * Get Internal table schema
 */
async function getInternalTableSchema(tableName: string): Promise<ColumnInfo[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  
  const [rows] = await db.execute(sql.raw(`
    SELECT 
      COLUMN_NAME as name,
      COLUMN_TYPE as type,
      IS_NULLABLE as nullable,
      COLUMN_KEY as columnKey,
      COLUMN_DEFAULT as defaultValue
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName.replace(/'/g, "''")}'
    ORDER BY ORDINAL_POSITION
  `)) as unknown as [Array<{ name: string; type: string; nullable: string; columnKey: string; defaultValue: string | null }>, unknown];
  
  return rows.map(row => ({
    name: row.name,
    type: row.type,
    nullable: row.nullable === "YES",
    isPrimaryKey: row.columnKey === "PRI",
    defaultValue: row.defaultValue || undefined,
  }));
}

/**
 * Get Internal table data
 */
async function getInternalTableData(
  tableName: string,
  page: number,
  pageSize: number,
  sortColumn?: string,
  sortDirection: "asc" | "desc" = "asc"
): Promise<QueryResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not connected');
  
  const offset = (page - 1) * pageSize;
  
  // Get total count
  const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM \`${tableName}\``) as unknown as [Array<{ total: number }>, unknown];
  const total = countResult[0]?.total || 0;
  
  // Build query with optional sorting
  let query = `SELECT * FROM \`${tableName}\``;
  if (sortColumn) {
    query += ` ORDER BY \`${sortColumn}\` ${sortDirection.toUpperCase()}`;
  }
  query += ` LIMIT ${pageSize} OFFSET ${offset}`;
  
  const [rows] = await db.execute(query) as unknown as [Array<Record<string, unknown>>, unknown];
  
  // Get column names from first row or schema
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  
  return {
    columns,
    rows,
    total,
    page,
    pageSize,
  };
}

/**
 * Get supported database types
 */
export function getSupportedDatabaseTypes() {
  return [
    { value: "mysql", label: "MySQL / MariaDB", icon: "database", defaultPort: 3306 },
    { value: "postgres", label: "PostgreSQL", icon: "database", defaultPort: 5432 },
    { value: "sqlserver", label: "SQL Server", icon: "database", defaultPort: 1433 },
    { value: "oracle", label: "Oracle", icon: "database", defaultPort: 1521 },
    { value: "access", label: "Microsoft Access", icon: "file", defaultPort: 0 },
    { value: "excel", label: "Excel (.xlsx/.xls)", icon: "file", defaultPort: 0 },
    { value: "internal", label: "Internal Database (Demo)", icon: "database", defaultPort: 0 },
  ];
}
