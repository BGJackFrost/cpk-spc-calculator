/**
 * Phase 42 Tests - External Database Connection Management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external database service
vi.mock("./externalDatabaseService", () => ({
  getConnections: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Test MySQL",
      databaseType: "mysql",
      host: "localhost",
      port: 3306,
      database: "testdb",
      username: "root",
      password: "••••••••",
      isActive: 1,
    },
  ]),
  getConnectionById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test MySQL",
    databaseType: "mysql",
    host: "localhost",
    port: 3306,
    database: "testdb",
    username: "root",
    password: "decrypted_password",
    isActive: 1,
  }),
  createConnection: vi.fn().mockResolvedValue({ id: 2 }),
  updateConnection: vi.fn().mockResolvedValue({ success: true }),
  deleteConnection: vi.fn().mockResolvedValue({ success: true }),
  testConnection: vi.fn().mockResolvedValue({
    success: true,
    message: "Connection successful",
    version: "MySQL 8.0",
    latency: 50,
  }),
  getSupportedDatabaseTypes: vi.fn().mockReturnValue([
    { value: "mysql", label: "MySQL / MariaDB", icon: "database", defaultPort: 3306 },
    { value: "postgres", label: "PostgreSQL", icon: "database", defaultPort: 5432 },
    { value: "sqlserver", label: "SQL Server", icon: "database", defaultPort: 1433 },
    { value: "oracle", label: "Oracle", icon: "database", defaultPort: 1521 },
    { value: "access", label: "Microsoft Access", icon: "file", defaultPort: 0 },
    { value: "excel", label: "Excel (.xlsx/.xls)", icon: "file", defaultPort: 0 },
  ]),
  getTables: vi.fn().mockResolvedValue([
    { name: "users", type: "table", rowCount: 100 },
    { name: "products", type: "table", rowCount: 500 },
    { name: "orders", type: "table", rowCount: 1000 },
  ]),
  getTableSchema: vi.fn().mockResolvedValue([
    { name: "id", type: "int", nullable: false, isPrimaryKey: true },
    { name: "name", type: "varchar(255)", nullable: false, isPrimaryKey: false },
    { name: "created_at", type: "datetime", nullable: true, isPrimaryKey: false },
  ]),
  getTableData: vi.fn().mockResolvedValue({
    columns: ["id", "name", "created_at"],
    rows: [
      { id: 1, name: "Test 1", created_at: "2024-01-01" },
      { id: 2, name: "Test 2", created_at: "2024-01-02" },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  }),
}));

describe("Phase 42 - External Database Connection Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Types Support", () => {
    it("should support MySQL database type", async () => {
      const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
      const types = getSupportedDatabaseTypes();
      const mysql = types.find((t: { value: string }) => t.value === "mysql");
      expect(mysql).toBeDefined();
      expect(mysql?.defaultPort).toBe(3306);
    });

    it("should support PostgreSQL database type", async () => {
      const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
      const types = getSupportedDatabaseTypes();
      const postgres = types.find((t: { value: string }) => t.value === "postgres");
      expect(postgres).toBeDefined();
      expect(postgres?.defaultPort).toBe(5432);
    });

    it("should support SQL Server database type", async () => {
      const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
      const types = getSupportedDatabaseTypes();
      const sqlserver = types.find((t: { value: string }) => t.value === "sqlserver");
      expect(sqlserver).toBeDefined();
      expect(sqlserver?.defaultPort).toBe(1433);
    });

    it("should support Oracle database type", async () => {
      const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
      const types = getSupportedDatabaseTypes();
      const oracle = types.find((t: { value: string }) => t.value === "oracle");
      expect(oracle).toBeDefined();
      expect(oracle?.defaultPort).toBe(1521);
    });

    it("should support file-based databases (Access, Excel)", async () => {
      const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
      const types = getSupportedDatabaseTypes();
      const access = types.find((t: { value: string }) => t.value === "access");
      const excel = types.find((t: { value: string }) => t.value === "excel");
      expect(access).toBeDefined();
      expect(excel).toBeDefined();
      expect(access?.defaultPort).toBe(0);
      expect(excel?.defaultPort).toBe(0);
    });
  });

  describe("Connection Management", () => {
    it("should list all connections", async () => {
      const { getConnections } = await import("./externalDatabaseService");
      const connections = await getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].name).toBe("Test MySQL");
    });

    it("should get connection by ID", async () => {
      const { getConnectionById } = await import("./externalDatabaseService");
      const connection = await getConnectionById(1);
      expect(connection).toBeDefined();
      expect(connection?.name).toBe("Test MySQL");
    });

    it("should create new connection", async () => {
      const { createConnection } = await import("./externalDatabaseService");
      const result = await createConnection({
        name: "New Connection",
        databaseType: "mysql",
        host: "localhost",
        port: 3306,
        database: "newdb",
        username: "user",
        password: "pass",
      }, 1);
      expect(result.id).toBe(2);
    });

    it("should update connection", async () => {
      const { updateConnection } = await import("./externalDatabaseService");
      const result = await updateConnection(1, { name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("should delete connection", async () => {
      const { deleteConnection } = await import("./externalDatabaseService");
      const result = await deleteConnection(1);
      expect(result.success).toBe(true);
    });
  });

  describe("Connection Testing", () => {
    it("should test connection successfully", async () => {
      const { testConnection } = await import("./externalDatabaseService");
      const result = await testConnection({
        databaseType: "mysql",
        host: "localhost",
        port: 3306,
        database: "testdb",
        username: "root",
        password: "password",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Connection successful");
      expect(result.version).toBe("MySQL 8.0");
    });
  });

  describe("Table Operations", () => {
    it("should get tables from connection", async () => {
      const { getTables } = await import("./externalDatabaseService");
      const tables = await getTables(1);
      expect(tables).toHaveLength(3);
      expect(tables[0].name).toBe("users");
    });

    it("should get table schema", async () => {
      const { getTableSchema } = await import("./externalDatabaseService");
      const schema = await getTableSchema(1, "users");
      expect(schema).toHaveLength(3);
      expect(schema[0].name).toBe("id");
      expect(schema[0].isPrimaryKey).toBe(true);
    });

    it("should get table data with pagination", async () => {
      const { getTableData } = await import("./externalDatabaseService");
      const result = await getTableData(1, "users", { page: 1, pageSize: 50 });
      expect(result.columns).toHaveLength(3);
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});

describe("Encryption Service", () => {
  it("should encrypt and decrypt data correctly", async () => {
    const { encrypt, decrypt, isEncrypted } = await import("./encryptionService");
    
    const originalData = "sensitive_password_123";
    const encrypted = encrypt(originalData);
    
    expect(encrypted).not.toBe(originalData);
    expect(isEncrypted(encrypted)).toBe(true);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalData);
  });

  it("should detect non-encrypted data", async () => {
    const { isEncrypted } = await import("./encryptionService");
    
    expect(isEncrypted("plain_text")).toBe(false);
    expect(isEncrypted("not_encrypted")).toBe(false);
  });

  it("should hash data consistently", async () => {
    const { hashData } = await import("./encryptionService");
    
    const data = "test_data";
    const hash1 = hashData(data);
    const hash2 = hashData(data);
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(data);
  });

  it("should mask sensitive data", async () => {
    const { maskSensitiveData } = await import("./encryptionService");
    
    const password = "my_secret_password";
    const masked = maskSensitiveData(password);
    
    expect(masked).not.toBe(password);
    expect(masked).toContain("*");
  });
});
