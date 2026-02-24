/**
 * Data Migration Service
 * Handles data migration operations between database connections
 */

import { getDb } from "./db";
import { databaseConnections } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";

// Types
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transformation?: {
    type: "none" | "trim" | "uppercase" | "lowercase" | "date_format" | "number_format" | "custom";
    params?: Record<string, string | number>;
  };
}

export interface TableMapping {
  sourceTable: string;
  targetTable: string;
  columnMappings: ColumnMapping[];
}

export interface MigrationOptions {
  truncateTarget: boolean;
  skipErrors: boolean;
  batchSize: number;
  validateData: boolean;
  incrementalMode: boolean;
  timestampColumn?: string;
  lastSyncTimestamp?: Date;
}

export interface MigrationResult {
  tableName: string;
  status: "success" | "error" | "partial";
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  errors: string[];
  duration: number;
}

export interface ValidationRule {
  column: string;
  type: "required" | "format" | "range" | "length" | "unique" | "enum" | "reference";
  params?: Record<string, unknown>;
  severity: "error" | "warning" | "info";
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  warnings: number;
  errors: Array<{
    row: number;
    column: string;
    rule: string;
    message: string;
    severity: string;
  }>;
}

/**
 * Get database connection config by ID
 */
async function getConnectionConfig(connectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [connection] = await db
    .select()
    .from(databaseConnections)
    .where(eq(databaseConnections.id, connectionId))
    .limit(1);
  
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`);
  }
  
  return connection;
}

/**
 * Create MySQL connection from config
 */
async function createMySqlConnection(config: {
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  password?: string | null;
  connectionString?: string | null;
}) {
  if (config.connectionString) {
    return mysql.createConnection(config.connectionString);
  }
  
  return mysql.createConnection({
    host: config.host || "localhost",
    port: config.port || 3306,
    database: config.database || undefined,
    user: config.username || undefined,
    password: config.password || undefined,
    connectTimeout: 30000,
  });
}

/**
 * Get table schema from MySQL database
 */
export async function getTableSchema(connectionId: number, tableName: string) {
  const config = await getConnectionConfig(connectionId);
  
  if (config.databaseType !== "mysql") {
    throw new Error("Only MySQL is currently supported for schema operations");
  }
  
  const connection = await createMySqlConnection(config);
  
  try {
    // Get columns
    const [columns] = await connection.query(
      `SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        COLUMN_TYPE as fullType,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as keyType,
        EXTRA as extra,
        COLUMN_COMMENT as comment
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database, tableName]
    ) as [Array<{
      name: string;
      type: string;
      fullType: string;
      nullable: string;
      defaultValue: string | null;
      keyType: string;
      extra: string;
      comment: string;
    }>, unknown];
    
    // Get indexes
    const [indexes] = await connection.query(
      `SELECT 
        INDEX_NAME as name,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        NON_UNIQUE as nonUnique
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       GROUP BY INDEX_NAME, NON_UNIQUE`,
      [config.database, tableName]
    ) as [Array<{
      name: string;
      columns: string;
      nonUnique: number;
    }>, unknown];
    
    // Get foreign keys
    const [foreignKeys] = await connection.query(
      `SELECT 
        COLUMN_NAME as columnName,
        REFERENCED_TABLE_NAME as refTable,
        REFERENCED_COLUMN_NAME as refColumn
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [config.database, tableName]
    ) as [Array<{
      columnName: string;
      refTable: string;
      refColumn: string;
    }>, unknown];
    
    const fkMap = new Map(foreignKeys.map(fk => [fk.columnName, `${fk.refTable}.${fk.refColumn}`]));
    
    return {
      name: tableName,
      columns: columns.map(col => ({
        name: col.name,
        type: col.fullType.toUpperCase(),
        nullable: col.nullable === "YES",
        defaultValue: col.defaultValue,
        isPrimaryKey: col.keyType === "PRI",
        isForeignKey: fkMap.has(col.name),
        foreignKeyRef: fkMap.get(col.name),
        autoIncrement: col.extra.includes("auto_increment"),
        comment: col.comment || undefined,
      })),
      indexes: indexes.map(idx => ({
        name: idx.name,
        columns: idx.columns.split(","),
        unique: idx.nonUnique === 0,
      })),
    };
  } finally {
    await connection.end();
  }
}

/**
 * Compare schemas between two databases
 */
export async function compareSchemas(
  sourceConnectionId: number,
  targetConnectionId: number
): Promise<{
  tables: Array<{
    name: string;
    status: "match" | "added" | "removed" | "modified";
    sourceRowCount?: number;
    targetRowCount?: number;
    columnDiffs?: Array<{
      name: string;
      status: "match" | "added" | "removed" | "modified";
      sourceType?: string;
      targetType?: string;
      differences?: string[];
    }>;
  }>;
  summary: {
    matched: number;
    added: number;
    removed: number;
    modified: number;
  };
}> {
  const sourceConfig = await getConnectionConfig(sourceConnectionId);
  const targetConfig = await getConnectionConfig(targetConnectionId);
  
  if (sourceConfig.databaseType !== "mysql" || targetConfig.databaseType !== "mysql") {
    throw new Error("Only MySQL is currently supported for schema comparison");
  }
  
  const sourceConn = await createMySqlConnection(sourceConfig);
  const targetConn = await createMySqlConnection(targetConfig);
  
  try {
    // Get tables from source
    const [sourceTables] = await sourceConn.query(
      `SELECT TABLE_NAME as name, TABLE_ROWS as rowCount 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [sourceConfig.database]
    ) as [Array<{ name: string; rowCount: number }>, unknown];
    
    // Get tables from target
    const [targetTables] = await targetConn.query(
      `SELECT TABLE_NAME as name, TABLE_ROWS as rowCount 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [targetConfig.database]
    ) as [Array<{ name: string; rowCount: number }>, unknown];
    
    const sourceTableMap = new Map(sourceTables.map(t => [t.name, t]));
    const targetTableMap = new Map(targetTables.map(t => [t.name, t]));
    
    const allTableNames = new Set([
      ...sourceTables.map(t => t.name),
      ...targetTables.map(t => t.name),
    ]);
    
    const results: Array<{
      name: string;
      status: "match" | "added" | "removed" | "modified";
      sourceRowCount?: number;
      targetRowCount?: number;
      columnDiffs?: Array<{
        name: string;
        status: "match" | "added" | "removed" | "modified";
        sourceType?: string;
        targetType?: string;
        differences?: string[];
      }>;
    }> = [];
    
    const summary = { matched: 0, added: 0, removed: 0, modified: 0 };
    
    for (const tableName of Array.from(allTableNames)) {
      const sourceTable = sourceTableMap.get(tableName);
      const targetTable = targetTableMap.get(tableName);
      
      if (!sourceTable) {
        // Table only in target (added)
        results.push({
          name: tableName,
          status: "added",
          targetRowCount: targetTable?.rowCount,
        });
        summary.added++;
      } else if (!targetTable) {
        // Table only in source (removed)
        results.push({
          name: tableName,
          status: "removed",
          sourceRowCount: sourceTable.rowCount,
        });
        summary.removed++;
      } else {
        // Table in both - compare columns
        const [sourceColumns] = await sourceConn.query(
          `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [sourceConfig.database, tableName]
        ) as [Array<{ name: string; type: string; nullable: string }>, unknown];
        
        const [targetColumns] = await targetConn.query(
          `SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [targetConfig.database, tableName]
        ) as [Array<{ name: string; type: string; nullable: string }>, unknown];
        
        const sourceColMap = new Map(sourceColumns.map(c => [c.name, c]));
        const targetColMap = new Map(targetColumns.map(c => [c.name, c]));
        
        const allColumnNames = new Set([
          ...sourceColumns.map(c => c.name),
          ...targetColumns.map(c => c.name),
        ]);
        
        const columnDiffs: Array<{
          name: string;
          status: "match" | "added" | "removed" | "modified";
          sourceType?: string;
          targetType?: string;
          differences?: string[];
        }> = [];
        
        let hasModifications = false;
        
        for (const colName of Array.from(allColumnNames)) {
          const sourceCol = sourceColMap.get(colName);
          const targetCol = targetColMap.get(colName);
          
          if (!sourceCol) {
            columnDiffs.push({
              name: colName,
              status: "added",
              targetType: targetCol?.type,
            });
            hasModifications = true;
          } else if (!targetCol) {
            columnDiffs.push({
              name: colName,
              status: "removed",
              sourceType: sourceCol.type,
            });
            hasModifications = true;
          } else {
            const differences: string[] = [];
            if (sourceCol.type !== targetCol.type) {
              differences.push(`Type: ${sourceCol.type} → ${targetCol.type}`);
            }
            if (sourceCol.nullable !== targetCol.nullable) {
              differences.push(`Nullable: ${sourceCol.nullable} → ${targetCol.nullable}`);
            }
            
            if (differences.length > 0) {
              columnDiffs.push({
                name: colName,
                status: "modified",
                sourceType: sourceCol.type,
                targetType: targetCol.type,
                differences,
              });
              hasModifications = true;
            } else {
              columnDiffs.push({
                name: colName,
                status: "match",
                sourceType: sourceCol.type,
                targetType: targetCol.type,
              });
            }
          }
        }
        
        if (hasModifications) {
          results.push({
            name: tableName,
            status: "modified",
            sourceRowCount: sourceTable.rowCount,
            targetRowCount: targetTable.rowCount,
            columnDiffs,
          });
          summary.modified++;
        } else {
          results.push({
            name: tableName,
            status: "match",
            sourceRowCount: sourceTable.rowCount,
            targetRowCount: targetTable.rowCount,
            columnDiffs,
          });
          summary.matched++;
        }
      }
    }
    
    return { tables: results, summary };
  } finally {
    await sourceConn.end();
    await targetConn.end();
  }
}

/**
 * Validate data before migration
 */
export async function validateData(
  connectionId: number,
  tableName: string,
  rules: ValidationRule[],
  limit: number = 1000
): Promise<ValidationResult> {
  const config = await getConnectionConfig(connectionId);
  
  if (config.databaseType !== "mysql") {
    throw new Error("Only MySQL is currently supported for data validation");
  }
  
  const connection = await createMySqlConnection(config);
  
  try {
    const [rows] = await connection.query(
      `SELECT * FROM \`${tableName}\` LIMIT ?`,
      [limit]
    ) as [Array<Record<string, unknown>>, unknown];
    
    const errors: ValidationResult["errors"] = [];
    let passedRows = 0;
    let failedRows = 0;
    let warnings = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let rowValid = true;
      
      for (const rule of rules) {
        const value = row[rule.column];
        let isValid = true;
        let message = "";
        
        switch (rule.type) {
          case "required":
            isValid = value !== null && value !== undefined && value !== "";
            message = `Value is required`;
            break;
            
          case "format":
            if (value && rule.params?.pattern) {
              const regex = new RegExp(rule.params.pattern as string);
              isValid = regex.test(String(value));
              message = `Value does not match pattern ${rule.params.pattern}`;
            }
            break;
            
          case "range":
            if (value !== null && value !== undefined) {
              const numValue = Number(value);
              const min = rule.params?.min as number | undefined;
              const max = rule.params?.max as number | undefined;
              if (min !== undefined && numValue < min) {
                isValid = false;
                message = `Value ${numValue} is below minimum ${min}`;
              }
              if (max !== undefined && numValue > max) {
                isValid = false;
                message = `Value ${numValue} is above maximum ${max}`;
              }
            }
            break;
            
          case "length":
            if (value !== null && value !== undefined) {
              const strValue = String(value);
              const minLen = rule.params?.min as number | undefined;
              const maxLen = rule.params?.max as number | undefined;
              if (minLen !== undefined && strValue.length < minLen) {
                isValid = false;
                message = `Length ${strValue.length} is below minimum ${minLen}`;
              }
              if (maxLen !== undefined && strValue.length > maxLen) {
                isValid = false;
                message = `Length ${strValue.length} is above maximum ${maxLen}`;
              }
            }
            break;
            
          case "enum":
            if (value !== null && value !== undefined && rule.params?.values) {
              const allowedValues = rule.params.values as unknown[];
              isValid = allowedValues.includes(value);
              message = `Value must be one of: ${allowedValues.join(", ")}`;
            }
            break;
        }
        
        if (!isValid) {
          errors.push({
            row: i + 1,
            column: rule.column,
            rule: rule.type,
            message,
            severity: rule.severity,
          });
          
          if (rule.severity === "error") {
            rowValid = false;
          } else if (rule.severity === "warning") {
            warnings++;
          }
        }
      }
      
      if (rowValid) {
        passedRows++;
      } else {
        failedRows++;
      }
    }
    
    return {
      valid: failedRows === 0,
      totalRows: rows.length,
      passedRows,
      failedRows,
      warnings,
      errors: errors.slice(0, 100), // Limit errors returned
    };
  } finally {
    await connection.end();
  }
}

/**
 * Apply transformation to a value
 */
function applyTransformation(
  value: unknown,
  transformation?: ColumnMapping["transformation"]
): unknown {
  if (!transformation || transformation.type === "none" || value === null || value === undefined) {
    return value;
  }
  
  switch (transformation.type) {
    case "trim":
      return String(value).trim();
      
    case "uppercase":
      return String(value).toUpperCase();
      
    case "lowercase":
      return String(value).toLowerCase();
      
    case "date_format":
      // Convert date to specified format
      const date = new Date(value as string);
      if (isNaN(date.getTime())) return value;
      return date.toISOString().split("T")[0]; // Default to YYYY-MM-DD
      
    case "number_format":
      const num = Number(value);
      if (isNaN(num)) return value;
      const decimals = (transformation.params?.decimals as number) || 2;
      return num.toFixed(decimals);
      
    default:
      return value;
  }
}

/**
 * Migrate data between two database connections
 */
export async function migrateData(
  sourceConnectionId: number,
  targetConnectionId: number,
  tableMappings: TableMapping[],
  options: MigrationOptions
): Promise<{
  success: boolean;
  results: MigrationResult[];
  totalDuration: number;
}> {
  const sourceConfig = await getConnectionConfig(sourceConnectionId);
  const targetConfig = await getConnectionConfig(targetConnectionId);
  
  if (sourceConfig.databaseType !== "mysql" || targetConfig.databaseType !== "mysql") {
    throw new Error("Only MySQL to MySQL migration is currently supported");
  }
  
  const sourceConn = await createMySqlConnection(sourceConfig);
  const targetConn = await createMySqlConnection(targetConfig);
  
  const results: MigrationResult[] = [];
  const startTime = Date.now();
  
  try {
    for (const mapping of tableMappings) {
      const tableStartTime = Date.now();
      const result: MigrationResult = {
        tableName: mapping.sourceTable,
        status: "success",
        rowsRead: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsFailed: 0,
        errors: [],
        duration: 0,
      };
      
      try {
        // Truncate target if requested
        if (options.truncateTarget) {
          await targetConn.query(`TRUNCATE TABLE \`${mapping.targetTable}\``);
        }
        
        // Build query with incremental filter if needed
        let query = `SELECT * FROM \`${mapping.sourceTable}\``;
        const queryParams: unknown[] = [];
        
        if (options.incrementalMode && options.timestampColumn && options.lastSyncTimestamp) {
          query += ` WHERE \`${options.timestampColumn}\` > ?`;
          queryParams.push(options.lastSyncTimestamp);
        }
        
        // Read data in batches
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const batchQuery = `${query} LIMIT ${options.batchSize} OFFSET ${offset}`;
          const [rows] = await sourceConn.query(batchQuery, queryParams) as [Array<Record<string, unknown>>, unknown];
          
          if (rows.length === 0) {
            hasMore = false;
            break;
          }
          
          result.rowsRead += rows.length;
          
          // Transform and insert each row
          for (const row of rows) {
            try {
              // Apply column mappings and transformations
              const targetRow: Record<string, unknown> = {};
              
              for (const colMapping of mapping.columnMappings) {
                const sourceValue = row[colMapping.sourceColumn];
                const transformedValue = applyTransformation(sourceValue, colMapping.transformation);
                targetRow[colMapping.targetColumn] = transformedValue;
              }
              
              // Build INSERT query
              const columns = Object.keys(targetRow);
              const values = Object.values(targetRow);
              const placeholders = columns.map(() => "?").join(", ");
              
              const insertQuery = `INSERT INTO \`${mapping.targetTable}\` (\`${columns.join("`, `")}\`) VALUES (${placeholders})`;
              
              await targetConn.query(insertQuery, values);
              result.rowsInserted++;
            } catch (rowError: unknown) {
              const errorMessage = rowError instanceof Error ? rowError.message : "Unknown error";
              
              if (options.skipErrors) {
                result.rowsFailed++;
                result.errors.push(errorMessage);
              } else {
                throw rowError;
              }
            }
          }
          
          offset += options.batchSize;
          
          if (rows.length < options.batchSize) {
            hasMore = false;
          }
        }
        
        result.status = result.rowsFailed > 0 ? "partial" : "success";
      } catch (tableError: unknown) {
        const errorMessage = tableError instanceof Error ? tableError.message : "Unknown error";
        result.status = "error";
        result.errors.push(errorMessage);
      }
      
      result.duration = Date.now() - tableStartTime;
      results.push(result);
    }
    
    const allSuccess = results.every(r => r.status === "success");
    
    return {
      success: allSuccess,
      results,
      totalDuration: Date.now() - startTime,
    };
  } finally {
    await sourceConn.end();
    await targetConn.end();
  }
}

/**
 * Generate SQL migration script from schema diff
 */
export function generateMigrationScript(
  schemaDiff: Awaited<ReturnType<typeof compareSchemas>>,
  targetDatabase: string
): string {
  const statements: string[] = [];
  
  statements.push(`-- Migration script for ${targetDatabase}`);
  statements.push(`-- Generated at ${new Date().toISOString()}`);
  statements.push("");
  statements.push(`USE \`${targetDatabase}\`;`);
  statements.push("");
  
  for (const table of schemaDiff.tables) {
    if (table.status === "removed") {
      // Table needs to be created in target
      statements.push(`-- TODO: Create table ${table.name}`);
      statements.push(`-- CREATE TABLE \`${table.name}\` (...);`);
      statements.push("");
    } else if (table.status === "added") {
      // Table exists only in target, might need to be dropped
      statements.push(`-- Table ${table.name} exists only in target`);
      statements.push(`-- DROP TABLE IF EXISTS \`${table.name}\`;`);
      statements.push("");
    } else if (table.status === "modified" && table.columnDiffs) {
      statements.push(`-- Modify table ${table.name}`);
      
      for (const col of table.columnDiffs) {
        if (col.status === "added") {
          statements.push(`-- Column ${col.name} exists only in target`);
          statements.push(`-- ALTER TABLE \`${table.name}\` DROP COLUMN \`${col.name}\`;`);
        } else if (col.status === "removed") {
          statements.push(`-- Column ${col.name} needs to be added`);
          statements.push(`-- ALTER TABLE \`${table.name}\` ADD COLUMN \`${col.name}\` ${col.sourceType};`);
        } else if (col.status === "modified") {
          statements.push(`-- Column ${col.name} needs modification`);
          statements.push(`-- ALTER TABLE \`${table.name}\` MODIFY COLUMN \`${col.name}\` ${col.sourceType};`);
        }
      }
      
      statements.push("");
    }
  }
  
  return statements.join("\n");
}
