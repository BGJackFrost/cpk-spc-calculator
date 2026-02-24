/**
 * PostgreSQL Schema - Module 1: Core Authentication
 * 
 * Đây là schema Drizzle cho PostgreSQL, tương đương với MySQL schema hiện tại.
 * Sử dụng khi migration sang PostgreSQL.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enum cho role
export const userRoleEnum = pgEnum("user_role", ["user", "manager", "admin"]);
export const loginTypeEnum = pgEnum("login_type", ["oauth", "local"]);

// ==================== Users (Manus OAuth) ====================
export const pgUsers = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 512 }),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PgUser = typeof pgUsers.$inferSelect;
export type InsertPgUser = typeof pgUsers.$inferInsert;

// ==================== Local Users ====================
export const pgLocalUsers = pgTable("local_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  fullName: varchar("full_name", { length: 255 }),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PgLocalUser = typeof pgLocalUsers.$inferSelect;
export type InsertPgLocalUser = typeof pgLocalUsers.$inferInsert;

// ==================== Login History ====================
export const pgLoginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => pgUsers.id, { onDelete: "cascade" }),
  localUserId: integer("local_user_id").references(() => pgLocalUsers.id, { onDelete: "cascade" }),
  loginType: loginTypeEnum("login_type").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  loginAt: timestamp("login_at", { withTimezone: true }).defaultNow().notNull(),
  logoutAt: timestamp("logout_at", { withTimezone: true }),
  sessionDuration: integer("session_duration"), // in seconds
});

export type PgLoginHistory = typeof pgLoginHistory.$inferSelect;
export type InsertPgLoginHistory = typeof pgLoginHistory.$inferInsert;

// ==================== Migration Helper Types ====================

/**
 * Type mapping giữa MySQL và PostgreSQL
 */
export const mysqlToPgTypeMapping = {
  // MySQL INT -> PostgreSQL INTEGER/SERIAL
  "int": "integer",
  "int auto_increment": "serial",
  
  // MySQL VARCHAR -> PostgreSQL VARCHAR
  "varchar": "varchar",
  
  // MySQL TEXT -> PostgreSQL TEXT
  "text": "text",
  "longtext": "text",
  
  // MySQL TIMESTAMP -> PostgreSQL TIMESTAMP WITH TIME ZONE
  "timestamp": "timestamp with time zone",
  "datetime": "timestamp with time zone",
  
  // MySQL TINYINT(1) -> PostgreSQL BOOLEAN
  "tinyint(1)": "boolean",
  
  // MySQL DECIMAL -> PostgreSQL DECIMAL/NUMERIC
  "decimal": "numeric",
  
  // MySQL JSON -> PostgreSQL JSONB
  "json": "jsonb",
  
  // MySQL ENUM -> PostgreSQL ENUM (cần tạo type riêng)
  "enum": "enum",
};

/**
 * Hàm helper để convert MySQL boolean (0/1) sang PostgreSQL boolean
 */
export function convertMysqlBoolean(value: number | null): boolean | null {
  if (value === null) return null;
  return value === 1;
}

/**
 * Hàm helper để convert PostgreSQL boolean sang MySQL int
 */
export function convertPgBoolean(value: boolean | null): number | null {
  if (value === null) return null;
  return value ? 1 : 0;
}
