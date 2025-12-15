import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  spareParts, sparePartsInventory, sparePartsTransactions,
  suppliers, purchaseOrders, purchaseOrderItems
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";

export const sparePartsRouter = router({
  // Spare Parts
  listParts: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      lowStock: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(spareParts.isActive, 1)];
      if (input.category) {
        conditions.push(eq(spareParts.category, input.category));
      }

      const parts = await db
        .select({
          id: spareParts.id,
          partNumber: spareParts.partNumber,
          name: spareParts.name,
          description: spareParts.description,
          category: spareParts.category,
          unit: spareParts.unit,
          minStock: spareParts.minStock,
          maxStock: spareParts.maxStock,
          reorderPoint: spareParts.reorderPoint,
          reorderQuantity: spareParts.reorderQuantity,
          unitPrice: spareParts.unitPrice,

          supplierId: spareParts.supplierId,
          supplierName: suppliers.name,
          currentStock: sparePartsInventory.quantity,
        })
        .from(spareParts)
        .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
        .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
        .where(and(...conditions))
        .orderBy(spareParts.name);

      let result = parts;

      // Filter by search
      if (input.search) {
        const search = input.search.toLowerCase();
        result = result.filter(p => 
          p.name?.toLowerCase().includes(search) || 
          p.partNumber?.toLowerCase().includes(search)
        );
      }

      // Filter low stock
      if (input.lowStock) {
        result = result.filter(p => 
          (p.currentStock || 0) <= (p.reorderPoint || p.minStock || 0)
        );
      }

      return result;
    }),

  getPart: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [part] = await db
        .select()
        .from(spareParts)
        .where(eq(spareParts.id, input.id));
      return part || null;
    }),

  createPart: protectedProcedure
    .input(z.object({
      partNumber: z.string(),
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().default("pcs"),
      minStock: z.number().optional(),
      maxStock: z.number().optional(),
      reorderPoint: z.number().optional(),
      reorderQuantity: z.number().optional(),
      unitPrice: z.number().optional(),
      supplierId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(spareParts).values({
        ...input,
        unitPrice: input.unitPrice ? String(input.unitPrice) : undefined,
      }).$returningId();

      // Create initial inventory record
      await db.insert(sparePartsInventory).values({
        sparePartId: result.id,
        quantity: 0,
      });

      return { id: result.id };
    }),

  updatePart: protectedProcedure
    .input(z.object({
      id: z.number(),
      partNumber: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      minStock: z.number().optional(),
      maxStock: z.number().optional(),
      reorderPoint: z.number().optional(),
      reorderQuantity: z.number().optional(),
      unitPrice: z.number().optional(),
      supplierId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, unitPrice, ...data } = input;
      await db.update(spareParts).set({
        ...data,
        unitPrice: unitPrice ? String(unitPrice) : undefined,
      }).where(eq(spareParts.id, id));

      return { success: true };
    }),

  deletePart: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(spareParts).set({ isActive: 0 }).where(eq(spareParts.id, input.id));
      return { success: true };
    }),

  // Inventory
  getInventory: publicProcedure
    .input(z.object({ sparePartId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [inv] = await db
        .select()
        .from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      return inv || null;
    }),

  updateInventory: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantity: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(sparePartsInventory).set({
        quantity: input.quantity,
        updatedAt: new Date(),
      }).where(eq(sparePartsInventory.sparePartId, input.sparePartId));

      return { success: true };
    }),

  // Transactions
  listTransactions: publicProcedure
    .input(z.object({
      sparePartId: z.number().optional(),
      type: z.enum(["in", "out", "adjustment", "return"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.sparePartId) conditions.push(eq(sparePartsTransactions.sparePartId, input.sparePartId));
      if (input.type) conditions.push(eq(sparePartsTransactions.transactionType, input.type));
      if (input.startDate) conditions.push(gte(sparePartsTransactions.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(sparePartsTransactions.createdAt, new Date(input.endDate)));

      return db
        .select({
          id: sparePartsTransactions.id,
          sparePartId: sparePartsTransactions.sparePartId,
          partName: spareParts.name,
          partNumber: spareParts.partNumber,
          transactionType: sparePartsTransactions.transactionType,
          quantity: sparePartsTransactions.quantity,
          unitCost: sparePartsTransactions.unitCost,
          totalCost: sparePartsTransactions.totalCost,
          workOrderId: sparePartsTransactions.workOrderId,
          purchaseOrderId: sparePartsTransactions.purchaseOrderId,
          reason: sparePartsTransactions.reason,
          createdAt: sparePartsTransactions.createdAt,
        })
        .from(sparePartsTransactions)
        .leftJoin(spareParts, eq(sparePartsTransactions.sparePartId, spareParts.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sparePartsTransactions.createdAt))
        .limit(input.limit);
    }),

  createTransaction: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      transactionType: z.enum(["in", "out", "adjustment", "return"]),
      quantity: z.number(),
      unitCost: z.number().optional(),
      workOrderId: z.number().optional(),
      purchaseOrderId: z.number().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalCost = input.unitCost ? input.quantity * input.unitCost : undefined;

      // Create transaction
      const [result] = await db.insert(sparePartsTransactions).values({
        sparePartId: input.sparePartId,
        transactionType: input.transactionType,
        quantity: input.quantity,
        unitCost: input.unitCost ? String(input.unitCost) : undefined,
        totalCost: totalCost ? String(totalCost) : undefined,
        workOrderId: input.workOrderId,
        purchaseOrderId: input.purchaseOrderId,
        reason: input.reason,
        performedBy: ctx.user?.id,
      }).$returningId();

      // Update inventory
      const [inv] = await db.select().from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));

      if (inv) {
        let newQty = inv.quantity || 0;
        if (input.transactionType === "in" || input.transactionType === "return") {
          newQty += input.quantity;
        } else if (input.transactionType === "out") {
          newQty -= input.quantity;
        } else if (input.transactionType === "adjustment") {
          newQty = input.quantity;
        }

        await db.update(sparePartsInventory).set({
          quantity: Math.max(0, newQty),
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      }

      return { id: result.id };
    }),

  // Suppliers
  listSuppliers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(suppliers).where(eq(suppliers.isActive, 1)).orderBy(suppliers.name);
  }),

  createSupplier: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      paymentTerms: z.string().optional(),
      rating: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(suppliers).values(input).$returningId();
      return { id: result.id };
    }),

  updateSupplier: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      paymentTerms: z.string().optional(),
      rating: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;
      await db.update(suppliers).set(data).where(eq(suppliers.id, id));
      return { success: true };
    }),

  deleteSupplier: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(suppliers).set({ isActive: 0 }).where(eq(suppliers.id, input.id));
      return { success: true };
    }),

  // Purchase Orders
  listPurchaseOrders: publicProcedure
    .input(z.object({
      status: z.enum(["draft", "pending", "approved", "ordered", "partial_received", "received", "cancelled"]).optional(),
      supplierId: z.number().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.status) conditions.push(eq(purchaseOrders.status, input.status));
      if (input.supplierId) conditions.push(eq(purchaseOrders.supplierId, input.supplierId));

      return db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          supplierId: purchaseOrders.supplierId,
          supplierName: suppliers.name,
          status: purchaseOrders.status,
          total: purchaseOrders.total,
          orderDate: purchaseOrders.orderDate,
          expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
          actualDeliveryDate: purchaseOrders.actualDeliveryDate,
          notes: purchaseOrders.notes,
          createdAt: purchaseOrders.createdAt,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(input.limit);
    }),

  getPurchaseOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [order] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id));

      if (!order) return null;

      const items = await db
        .select({
          id: purchaseOrderItems.id,
          sparePartId: purchaseOrderItems.sparePartId,
          partName: spareParts.name,
          partNumber: spareParts.partNumber,
          quantity: purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
          totalPrice: purchaseOrderItems.totalPrice,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
        })
        .from(purchaseOrderItems)
        .leftJoin(spareParts, eq(purchaseOrderItems.sparePartId, spareParts.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

      return { ...order, items };
    }),

  createPurchaseOrder: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      expectedDeliveryDate: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        sparePartId: z.number(),
        quantity: z.number(),
        unitPrice: z.number(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate PO number
      const now = new Date();
      const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await db.select({ count: sql<number>`COUNT(*)` })
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.poNumber} LIKE ${prefix + '%'}`);
      const poNumber = `${prefix}-${String((count[0]?.count || 0) + 1).padStart(4, '0')}`;

      // Calculate total
      const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      // Create PO
      const [result] = await db.insert(purchaseOrders).values({
        poNumber,
        supplierId: input.supplierId,
        status: "draft",
        subtotal: String(total),
        total: String(total),
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        notes: input.notes,
        createdBy: ctx.user?.id,
      }).$returningId();

      // Create items
      for (const item of input.items) {
        await db.insert(purchaseOrderItems).values({
          purchaseOrderId: result.id,
          sparePartId: item.sparePartId,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.quantity * item.unitPrice),
          receivedQuantity: 0,
        });
      }

      return { id: result.id, poNumber };
    }),

  updatePurchaseOrderStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "pending", "approved", "ordered", "partial_received", "received", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { status: input.status };
      
      if (input.status === "approved") {
        updateData.approvedBy = ctx.user?.id;
        updateData.approvedAt = new Date();
      } else if (input.status === "ordered") {
        updateData.orderDate = new Date();
      } else if (input.status === "received") {
        updateData.actualDeliveryDate = new Date();
      }

      await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),

  receivePurchaseOrderItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      receivedQuantity: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get item details
      const [item] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, input.itemId));
      if (!item) throw new Error("Item not found");

      // Update received quantity
      const newReceivedQty = (item.receivedQuantity || 0) + input.receivedQuantity;
      await db.update(purchaseOrderItems).set({
        receivedQuantity: newReceivedQty,
      }).where(eq(purchaseOrderItems.id, input.itemId));

      // Create inventory transaction
      await db.insert(sparePartsTransactions).values({
        sparePartId: item.sparePartId,
        transactionType: "in",
        quantity: input.receivedQuantity,
        unitCost: item.unitPrice,
        totalCost: String(input.receivedQuantity * Number(item.unitPrice)),
        purchaseOrderId: item.purchaseOrderId,
        performedBy: ctx.user?.id,
      });

      // Update inventory
      const [inv] = await db.select().from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, item.sparePartId));
      if (inv) {
        await db.update(sparePartsInventory).set({
          quantity: (inv.quantity || 0) + input.receivedQuantity,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, item.sparePartId));
      }

      // Check if all items received
      const allItems = await db.select().from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, item.purchaseOrderId));
      const allReceived = allItems.every(i => (i.receivedQuantity || 0) >= i.quantity);
      const partialReceived = allItems.some(i => (i.receivedQuantity || 0) > 0);

      if (allReceived) {
        await db.update(purchaseOrders).set({
          status: "received",
          actualDeliveryDate: new Date(),
        }).where(eq(purchaseOrders.id, item.purchaseOrderId));
      } else if (partialReceived) {
        await db.update(purchaseOrders).set({ status: "partial_received" })
          .where(eq(purchaseOrders.id, item.purchaseOrderId));
      }

      return { success: true };
    }),

  // Statistics
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    // Total parts
    const totalParts = await db.select({ count: sql<number>`COUNT(*)` })
      .from(spareParts).where(eq(spareParts.isActive, 1));

    // Low stock count
    const lowStockParts = await db
      .select({
        id: spareParts.id,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        currentStock: sparePartsInventory.quantity,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .where(eq(spareParts.isActive, 1));

    const lowStockCount = lowStockParts.filter(p => 
      (p.currentStock || 0) <= (p.reorderPoint || p.minStock || 0)
    ).length;

    // Total inventory value
    const inventoryValue = await db
      .select({
        total: sql<number>`SUM(CAST(${spareParts.unitPrice} AS DECIMAL(12,2)) * ${sparePartsInventory.quantity})`,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .where(eq(spareParts.isActive, 1));

    // Pending POs
    const pendingPOs = await db.select({ count: sql<number>`COUNT(*)` })
      .from(purchaseOrders)
      .where(or(
        eq(purchaseOrders.status, "pending"),
        eq(purchaseOrders.status, "approved"),
        eq(purchaseOrders.status, "ordered")
      ));

    return {
      totalParts: totalParts[0]?.count || 0,
      lowStockCount,
      inventoryValue: inventoryValue[0]?.total || 0,
      pendingPOs: pendingPOs[0]?.count || 0,
    };
  }),

  // Get reorder suggestions
  getReorderSuggestions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const parts = await db
      .select({
        id: spareParts.id,
        partNumber: spareParts.partNumber,
        name: spareParts.name,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        reorderQuantity: spareParts.reorderQuantity,
        unitPrice: spareParts.unitPrice,
        supplierId: spareParts.supplierId,
        supplierName: suppliers.name,
        currentStock: sparePartsInventory.quantity,
      })
      .from(spareParts)
      .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .where(eq(spareParts.isActive, 1));

    return parts
      .filter(p => (p.currentStock || 0) <= (p.reorderPoint || p.minStock || 0))
      .map(p => ({
        ...p,
        suggestedQuantity: p.reorderQuantity || ((p.minStock || 0) * 2 - (p.currentStock || 0)),
        estimatedCost: (p.reorderQuantity || ((p.minStock || 0) * 2 - (p.currentStock || 0))) * Number(p.unitPrice || 0),
      }));
  }),
});
