import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === SUPPLY-CHAIN Domain Tables ===

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
	id: int().autoincrement().notNull(),
	purchaseOrderId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().notNull(),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	totalPrice: decimal({ precision: 12, scale: 2 }),
	receivedQuantity: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_items_purchaseOrderId").on(table.purchaseOrderId),
	index("idx_po_items_sparePartId").on(table.sparePartId),
]);


export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int().autoincrement().notNull(),
	poNumber: varchar({ length: 50 }).notNull(),
	supplierId: int().notNull(),
	status: mysqlEnum(['draft','pending','approved','ordered','partial','received','cancelled']).default('draft').notNull(),
	total: decimal({ precision: 15, scale: 2 }),
	orderDate: timestamp({ mode: 'string' }),
	expectedDeliveryDate: timestamp({ mode: 'string' }),
	actualDeliveryDate: timestamp({ mode: 'string' }),
	notes: text(),
	createdBy: int(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	subtotal: decimal({ precision: 14, scale: 2 }),
	tax: decimal({ precision: 14, scale: 2 }),
	shipping: decimal({ precision: 14, scale: 2 }),
	rejectedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
},
(table) => [
	index("idx_purchase_orders_supplierId").on(table.supplierId),
]);


export const suppliers = mysqlTable("suppliers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	contactPerson: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	address: text(),
	website: varchar({ length: 255 }),
	paymentTerms: varchar({ length: 100 }),
	leadTimeDays: int(),
	rating: int().default(3),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

