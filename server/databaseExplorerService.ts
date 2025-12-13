import { getDb } from "./db";
import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string | null;
  defaultValue: string | null;
}

export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConnectionInfo {
  host: string;
  database: string;
  user: string;
  status: "connected" | "disconnected" | "error";
  version: string;
  uptime: number;
  connectionCount: number;
}

/**
 * Get database connection info
 */
export async function getConnectionInfo(): Promise<ConnectionInfo> {
  const db = await getDb();
  
  // Parse connection string for host and database
  const dbUrl = process.env.DATABASE_URL || "";
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+)(?::(\d+))?\/([^?]+)/);
  
  if (!db) {
    return {
      host: urlMatch?.[3] || "Unknown",
      database: urlMatch?.[5] || "Unknown",
      user: urlMatch?.[1] || "Unknown",
      status: "disconnected",
      version: "Unknown",
      uptime: 0,
      connectionCount: 0,
    };
  }
  
  try {
    // Get MySQL version
    const versionResult = await db.execute(sql`SELECT VERSION() as version`);
    const versionRows = versionResult as unknown as { version: string }[];
    const version = versionRows[0]?.version || "Unknown";
    
    // Get uptime
    const uptimeResult = await db.execute(sql`SHOW STATUS LIKE 'Uptime'`);
    const uptimeRows = uptimeResult as unknown as { Variable_name: string; Value: string }[];
    const uptime = parseInt(uptimeRows[0]?.Value || "0", 10);
    
    // Get connection count
    const connResult = await db.execute(sql`SHOW STATUS LIKE 'Threads_connected'`);
    const connRows = connResult as unknown as { Variable_name: string; Value: string }[];
    const connectionCount = parseInt(connRows[0]?.Value || "0", 10);
    
    return {
      host: urlMatch?.[3] || "Unknown",
      database: urlMatch?.[5] || "Unknown",
      user: urlMatch?.[1] || "Unknown",
      status: "connected",
      version,
      uptime,
      connectionCount,
    };
  } catch (error) {
    console.error("Error getting connection info:", error);
    return {
      host: urlMatch?.[3] || "Unknown",
      database: urlMatch?.[5] || "Unknown",
      user: urlMatch?.[1] || "Unknown",
      status: "error",
      version: "Unknown",
      uptime: 0,
      connectionCount: 0,
    };
  }
}

/**
 * Get list of all tables in the database
 */
export async function getTables(): Promise<TableInfo[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }
  
  try {
    // Get all tables
    const tablesResult = await db.execute(sql`
      SELECT 
        TABLE_NAME as name,
        TABLE_ROWS as rowCount
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
    
    const tables: TableInfo[] = [];
    const tableRows = tablesResult as unknown as { name: string; rowCount: number }[];
    
    for (const row of tableRows) {
      // Get columns for each table
      const columnsResult = await db.execute(sql`
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type,
          IS_NULLABLE as nullable,
          COLUMN_KEY as \`key\`,
          COLUMN_DEFAULT as defaultValue
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${row.name}
        ORDER BY ORDINAL_POSITION
      `);
      
      const columnRows = columnsResult as unknown as {
        name: string;
        type: string;
        nullable: string;
        key: string | null;
        defaultValue: string | null;
      }[];
      
      const columns: ColumnInfo[] = columnRows.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === "YES",
        key: col.key || null,
        defaultValue: col.defaultValue,
      }));
      
      tables.push({
        name: row.name,
        rowCount: row.rowCount || 0,
        columns,
      });
    }
    
    return tables;
  } catch (error) {
    console.error("Error getting tables:", error);
    throw new Error("Failed to get table list");
  }
}

/**
 * Get data from a specific table with pagination and sorting
 */
export async function getTableData(
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<TableData> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }
  
  const { page = 1, pageSize = 50, sortColumn, sortDirection = "asc" } = options;
  
  // Validate table name to prevent SQL injection
  const tables = await getTables();
  const tableExists = tables.some(t => t.name === tableName);
  if (!tableExists) {
    throw new Error(`Table '${tableName}' not found`);
  }
  
  try {
    // Get total count
    const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as total FROM \`${tableName}\``));
    const countRows = countResult as unknown as { total: string }[];
    const total = parseInt(countRows[0]?.total || "0", 10);
    
    // Get columns
    const table = tables.find(t => t.name === tableName);
    const columns = table?.columns.map(c => c.name) || [];
    
    // Validate sort column
    let orderClause = "";
    if (sortColumn && columns.includes(sortColumn)) {
      orderClause = ` ORDER BY \`${sortColumn}\` ${sortDirection.toUpperCase()}`;
    }
    
    // Get data with pagination
    const offset = (page - 1) * pageSize;
    const dataResult = await db.execute(
      sql.raw(`SELECT * FROM \`${tableName}\`${orderClause} LIMIT ${pageSize} OFFSET ${offset}`)
    );
    
    const dataRows = dataResult as unknown as Record<string, unknown>[];
    
    return {
      columns,
      rows: dataRows,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error(`Error getting data from table ${tableName}:`, error);
    throw new Error(`Failed to get data from table '${tableName}'`);
  }
}

/**
 * Get table schema/structure
 */
export async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  const tables = await getTables();
  const table = tables.find(t => t.name === tableName);
  
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  
  return table.columns;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  tableCount: number;
  totalRows: number;
  databaseSize: string;
  indexSize: string;
}> {
  const db = await getDb();
  if (!db) {
    return {
      tableCount: 0,
      totalRows: 0,
      databaseSize: "Unknown",
      indexSize: "Unknown",
    };
  }
  
  try {
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as tableCount,
        SUM(TABLE_ROWS) as totalRows,
        ROUND(SUM(DATA_LENGTH) / 1024 / 1024, 2) as dataSizeMB,
        ROUND(SUM(INDEX_LENGTH) / 1024 / 1024, 2) as indexSizeMB
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    const rows = statsResult as unknown as { tableCount: number; totalRows: number; dataSizeMB: number; indexSizeMB: number }[];
    const stats = rows[0];
    
    return {
      tableCount: stats?.tableCount || 0,
      totalRows: stats?.totalRows || 0,
      databaseSize: `${stats?.dataSizeMB || 0} MB`,
      indexSize: `${stats?.indexSizeMB || 0} MB`,
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    return {
      tableCount: 0,
      totalRows: 0,
      databaseSize: "Unknown",
      indexSize: "Unknown",
    };
  }
}
