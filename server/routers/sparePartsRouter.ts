import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { checkPermission, MODULE_CODES, ActionType } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { 
  spareParts, sparePartsInventory, sparePartsTransactions,
  suppliers, purchaseOrders, purchaseOrderItems, poReceivingHistory,
  sparePartsInventoryChecks, sparePartsInventoryCheckItems, sparePartsStockMovements,
  approvalWorkflows, approvalSteps, approvalRequests, approvalHistories,
  employeeProfiles, positions
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
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "create", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền tạo phụ tùng");
      }
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
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "edit", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền sửa phụ tùng");
      }
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
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "delete", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền xóa phụ tùng");
      }
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
        .select({
          id: sparePartsInventory.id,
          sparePartId: sparePartsInventory.sparePartId,
          quantity: sparePartsInventory.quantity,
          reservedQuantity: sparePartsInventory.reservedQuantity,
          availableQuantity: sparePartsInventory.availableQuantity,
          lastStockCheck: sparePartsInventory.lastStockCheck,
          updatedAt: sparePartsInventory.updatedAt,
        })
        .from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      return inv || null;
    }),

  updateInventory: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantity: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current inventory
      const [currentInv] = await db.select({
        quantity: sparePartsInventory.quantity,
      }).from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));

      const oldQty = currentInv?.quantity || 0;
      const newQty = input.quantity;
      const diff = newQty - oldQty;

      // Validation: prevent negative inventory
      if (newQty < 0) {
        throw new Error("Số lượng tồn kho không thể âm");
      }

      // Update inventory
      if (currentInv) {
        await db.update(sparePartsInventory).set({
          quantity: newQty,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      } else {
        await db.insert(sparePartsInventory).values({
          sparePartId: input.sparePartId,
          quantity: newQty,
        });
      }

      // Create transaction record for history
      if (diff !== 0) {
        const transactionData: any = {
          sparePartId: input.sparePartId,
          transactionType: diff > 0 ? "in" as const : "out" as const,
          quantity: Math.abs(diff),
          performedBy: ctx.user?.id || 0,
        };
        if (input.reason) {
          transactionData.reason = input.reason;
        } else {
          transactionData.reason = diff > 0 ? "Điều chỉnh tăng nhanh" : "Điều chỉnh giảm nhanh";
        }
        await db.insert(sparePartsTransactions).values(transactionData);
      }

      return { success: true, oldQuantity: oldQty, newQuantity: newQty };
    }),

  // Transactions
  listTransactions: publicProcedure
    .input(z.object({
      sparePartId: z.number().optional(),
      type: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.sparePartId) conditions.push(eq(sparePartsTransactions.sparePartId, input.sparePartId));
      if (input.type && input.type !== "all") conditions.push(eq(sparePartsTransactions.transactionType, input.type as any));
      
      // Support both old (startDate/endDate) and new (dateFrom/dateTo) params
      const fromDate = input.dateFrom || input.startDate;
      const toDate = input.dateTo || input.endDate;
      if (fromDate) conditions.push(gte(sparePartsTransactions.createdAt, new Date(fromDate)));
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(sparePartsTransactions.createdAt, endOfDay));
      }

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
      const [inv] = await db.select({
        id: sparePartsInventory.id,
        sparePartId: sparePartsInventory.sparePartId,
        quantity: sparePartsInventory.quantity,
      }).from(sparePartsInventory)
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
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "create", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền tạo đơn đặt hàng");
      }
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
        notes: input.notes || null,
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
      notes: z.string().optional(),
      batchNumber: z.string().optional(),
      qualityStatus: z.enum(["good", "damaged", "rejected"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get item details
      const [item] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, input.itemId));
      if (!item) throw new Error("Item not found");

      // Validate: cannot receive more than ordered
      const remainingQty = item.quantity - (item.receivedQuantity || 0);
      if (input.receivedQuantity > remainingQty) {
        throw new Error(`Số lượng nhận không thể vượt quá số lượng còn lại (${remainingQty})`);
      }

      // Update received quantity
      const newReceivedQty = (item.receivedQuantity || 0) + input.receivedQuantity;
      await db.update(purchaseOrderItems).set({
        receivedQuantity: newReceivedQty,
      }).where(eq(purchaseOrderItems.id, input.itemId));

      // Record receiving history
      await db.insert(poReceivingHistory).values({
        purchaseOrderId: item.purchaseOrderId,
        purchaseOrderItemId: item.id,
        sparePartId: item.sparePartId,
        quantityReceived: input.receivedQuantity,
        receivedBy: ctx.user?.id,
        notes: input.notes || null,
        batchNumber: input.batchNumber || null,
        qualityStatus: input.qualityStatus || "good",
      });

      // Only add to inventory if quality is good
      if (!input.qualityStatus || input.qualityStatus === "good") {
        // Create inventory transaction
        await db.insert(sparePartsTransactions).values({
          sparePartId: item.sparePartId,
          transactionType: "in",
          quantity: input.receivedQuantity,
          unitCost: item.unitPrice,
          totalCost: String(input.receivedQuantity * Number(item.unitPrice)),
          purchaseOrderId: item.purchaseOrderId,
          performedBy: ctx.user?.id,
          reason: input.notes || null,
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

      return { 
        success: true,
        newReceivedQty,
        remainingQty: item.quantity - newReceivedQty,
      };
    }),

  // Receive entire purchase order (mark all items as received)
  receivePurchaseOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get PO details
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) throw new Error("Purchase order not found");
      if (po.status !== "ordered" && po.status !== "partial_received") {
        throw new Error("Chỉ có thể nhận hàng cho đơn ở trạng thái 'Đã đặt' hoặc 'Đã nhận một phần'");
      }

      // Get all items
      const items = await db.select().from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

      // Process each item
      for (const item of items) {
        const remainingQty = item.quantity - (item.receivedQuantity || 0);
        if (remainingQty <= 0) continue;

        // Update received quantity
        await db.update(purchaseOrderItems).set({
          receivedQuantity: item.quantity,
        }).where(eq(purchaseOrderItems.id, item.id));

        // Record receiving history
        await db.insert(poReceivingHistory).values({
          purchaseOrderId: input.id,
          purchaseOrderItemId: item.id,
          sparePartId: item.sparePartId,
          quantityReceived: remainingQty,
          receivedBy: ctx.user?.id,
          notes: input.notes || "Nhận toàn bộ đơn hàng",
          qualityStatus: "good",
        });

        // Create inventory transaction
        await db.insert(sparePartsTransactions).values({
          sparePartId: item.sparePartId,
          transactionType: "in",
          quantity: remainingQty,
          unitCost: item.unitPrice,
          totalCost: String(remainingQty * Number(item.unitPrice)),
          purchaseOrderId: input.id,
          performedBy: ctx.user?.id,
          reason: input.notes || null,
        });

        // Update inventory
        const [inv] = await db.select().from(sparePartsInventory)
          .where(eq(sparePartsInventory.sparePartId, item.sparePartId));
        if (inv) {
          await db.update(sparePartsInventory).set({
            quantity: (inv.quantity || 0) + remainingQty,
            updatedAt: new Date(),
          }).where(eq(sparePartsInventory.sparePartId, item.sparePartId));
        }
      }

      // Update PO status to received
      await db.update(purchaseOrders).set({
        status: "received",
        actualDeliveryDate: new Date(),
      }).where(eq(purchaseOrders.id, input.id));

      return { success: true };
    }),

  // Get receiving history for a PO
  getReceivingHistory: publicProcedure
    .input(z.object({ purchaseOrderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db.select({
        id: poReceivingHistory.id,
        purchaseOrderId: poReceivingHistory.purchaseOrderId,
        purchaseOrderItemId: poReceivingHistory.purchaseOrderItemId,
        sparePartId: poReceivingHistory.sparePartId,
        sparePartName: spareParts.name,
        sparePartCode: spareParts.partNumber,
        quantityReceived: poReceivingHistory.quantityReceived,
        receivedBy: poReceivingHistory.receivedBy,
        receivedAt: poReceivingHistory.receivedAt,
        notes: poReceivingHistory.notes,
        batchNumber: poReceivingHistory.batchNumber,
        qualityStatus: poReceivingHistory.qualityStatus,
      })
        .from(poReceivingHistory)
        .leftJoin(spareParts, eq(poReceivingHistory.sparePartId, spareParts.id))
        .where(eq(poReceivingHistory.purchaseOrderId, input.purchaseOrderId))
        .orderBy(desc(poReceivingHistory.receivedAt));
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

  // ============ XUẤT NHẬP TỒN ============

  // Nhập kho
  importStock: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantity: z.number().min(1),
      unitCost: z.number().optional(),
      purchaseOrderId: z.number().optional(),
      referenceNumber: z.string().optional(),
      toLocation: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current inventory - only select required columns
      const [inv] = await db.select({
        id: sparePartsInventory.id,
        sparePartId: sparePartsInventory.sparePartId,
        quantity: sparePartsInventory.quantity,
      }).from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      
      const beforeQty = inv?.quantity || 0;
      const afterQty = beforeQty + input.quantity;
      const totalCost = input.unitCost ? input.quantity * input.unitCost : undefined;

      // Create stock movement
      await db.insert(sparePartsStockMovements).values({
        sparePartId: input.sparePartId,
        movementType: input.purchaseOrderId ? "purchase_in" : "adjustment_in",
        quantity: input.quantity,
        beforeQuantity: beforeQty,
        afterQuantity: afterQty,
        unitCost: input.unitCost ? String(input.unitCost) : undefined,
        totalCost: totalCost ? String(totalCost) : undefined,
        referenceType: input.purchaseOrderId ? "purchase_order" : undefined,
        referenceId: input.purchaseOrderId,
        referenceNumber: input.referenceNumber,
        toLocation: input.toLocation,
        reason: input.reason,
        performedBy: ctx.user?.id || 0,
      });

      // Create transaction - only include defined fields
      const transactionData: any = {
        sparePartId: input.sparePartId,
        transactionType: "in" as const,
        quantity: input.quantity,
        performedBy: ctx.user?.id || 0,
      };
      if (input.unitCost) transactionData.unitCost = String(input.unitCost);
      if (totalCost) transactionData.totalCost = String(totalCost);
      if (input.purchaseOrderId) transactionData.purchaseOrderId = input.purchaseOrderId;
      if (input.reason) transactionData.reason = input.reason;
      
      await db.insert(sparePartsTransactions).values(transactionData);

      // Update inventory
      if (inv) {
        await db.update(sparePartsInventory).set({
          quantity: afterQty,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      } else {
        await db.insert(sparePartsInventory).values({
          sparePartId: input.sparePartId,
          quantity: afterQty,
        });
      }

      return { success: true, newQuantity: afterQty };
    }),

  // Xuất kho
  exportStock: protectedProcedure
    .input(z.object({
      sparePartId: z.number(),
      quantity: z.number().min(1),
      workOrderId: z.number().optional(),
      referenceNumber: z.string().optional(),
      fromLocation: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "export", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền xuất kho");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current inventory - only select required columns
      const [inv] = await db.select({
        id: sparePartsInventory.id,
        sparePartId: sparePartsInventory.sparePartId,
        quantity: sparePartsInventory.quantity,
      }).from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, input.sparePartId));
      
      const beforeQty = inv?.quantity || 0;
      if (beforeQty < input.quantity) {
        throw new Error(`Không đủ tồn kho. Hiện có: ${beforeQty}, yêu cầu: ${input.quantity}`);
      }
      const afterQty = beforeQty - input.quantity;

      // Get unit price for cost calculation
      const [part] = await db.select().from(spareParts)
        .where(eq(spareParts.id, input.sparePartId));
      const unitCost = part?.unitPrice ? Number(part.unitPrice) : undefined;
      const totalCost = unitCost ? input.quantity * unitCost : undefined;

      // Create stock movement
      await db.insert(sparePartsStockMovements).values({
        sparePartId: input.sparePartId,
        movementType: input.workOrderId ? "work_order_out" : "adjustment_out",
        quantity: input.quantity,
        beforeQuantity: beforeQty,
        afterQuantity: afterQty,
        unitCost: unitCost ? String(unitCost) : undefined,
        totalCost: totalCost ? String(totalCost) : undefined,
        referenceType: input.workOrderId ? "work_order" : undefined,
        referenceId: input.workOrderId,
        referenceNumber: input.referenceNumber,
        fromLocation: input.fromLocation,
        reason: input.reason,
        performedBy: ctx.user?.id || 0,
      });

      // Create transaction
      await db.insert(sparePartsTransactions).values({
        sparePartId: input.sparePartId,
        transactionType: "out",
        quantity: input.quantity,
        unitCost: unitCost ? String(unitCost) : undefined,
        totalCost: totalCost ? String(totalCost) : undefined,
        workOrderId: input.workOrderId,
        reason: input.reason,
        performedBy: ctx.user?.id,
      });

      // Update inventory
      await db.update(sparePartsInventory).set({
        quantity: afterQty,
        updatedAt: new Date(),
      }).where(eq(sparePartsInventory.sparePartId, input.sparePartId));

      return { success: true, newQuantity: afterQty };
    }),

  // Lịch sử xuất nhập tồn
  listStockMovements: publicProcedure
    .input(z.object({
      sparePartId: z.number().optional(),
      movementType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.sparePartId) conditions.push(eq(sparePartsStockMovements.sparePartId, input.sparePartId));
      if (input.movementType) conditions.push(eq(sparePartsStockMovements.movementType, input.movementType as any));
      if (input.startDate) conditions.push(gte(sparePartsStockMovements.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(sparePartsStockMovements.createdAt, new Date(input.endDate)));

      return db
        .select({
          id: sparePartsStockMovements.id,
          sparePartId: sparePartsStockMovements.sparePartId,
          partName: spareParts.name,
          partNumber: spareParts.partNumber,
          movementType: sparePartsStockMovements.movementType,
          quantity: sparePartsStockMovements.quantity,
          beforeQuantity: sparePartsStockMovements.beforeQuantity,
          afterQuantity: sparePartsStockMovements.afterQuantity,
          unitCost: sparePartsStockMovements.unitCost,
          totalCost: sparePartsStockMovements.totalCost,
          referenceType: sparePartsStockMovements.referenceType,
          referenceId: sparePartsStockMovements.referenceId,
          referenceNumber: sparePartsStockMovements.referenceNumber,
          fromLocation: sparePartsStockMovements.fromLocation,
          toLocation: sparePartsStockMovements.toLocation,
          reason: sparePartsStockMovements.reason,
          createdAt: sparePartsStockMovements.createdAt,
        })
        .from(sparePartsStockMovements)
        .leftJoin(spareParts, eq(sparePartsStockMovements.sparePartId, spareParts.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sparePartsStockMovements.createdAt))
        .limit(input.limit);
    }),

  // Báo cáo xuất nhập tồn
  getStockReport: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      sparePartId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = [
        gte(sparePartsStockMovements.createdAt, new Date(input.startDate)),
        lte(sparePartsStockMovements.createdAt, new Date(input.endDate)),
      ];
      if (input.sparePartId) conditions.push(eq(sparePartsStockMovements.sparePartId, input.sparePartId));

      const movements = await db
        .select()
        .from(sparePartsStockMovements)
        .where(and(...conditions));

      // Calculate summary
      let totalIn = 0, totalOut = 0, totalInValue = 0, totalOutValue = 0;
      movements.forEach(m => {
        if (m.movementType.includes("_in")) {
          totalIn += m.quantity;
          totalInValue += Number(m.totalCost || 0);
        } else if (m.movementType.includes("_out")) {
          totalOut += m.quantity;
          totalOutValue += Number(m.totalCost || 0);
        }
      });

      return {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        totalInValue,
        totalOutValue,
        netValueChange: totalInValue - totalOutValue,
        movementCount: movements.length,
      };
    }),

  // ============ KIỂM KÊ ============

  // Tạo phiếu kiểm kê
  createInventoryCheck: protectedProcedure
    .input(z.object({
      checkType: z.enum(["full", "partial", "cycle", "spot"]).default("full"),
      warehouseLocation: z.string().optional(),
      category: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate check number
      const checkNumber = `IC-${Date.now()}`;

      // Create inventory check
      const [result] = await db.insert(sparePartsInventoryChecks).values({
        checkNumber,
        checkDate: new Date(),
        checkType: input.checkType,
        status: "draft",
        warehouseLocation: input.warehouseLocation,
        category: input.category,
        notes: input.notes,
        createdBy: ctx.user?.id || 0,
      }).$returningId();

      // Get parts to check based on filters
      const partsConditions = [eq(spareParts.isActive, 1)];
      if (input.warehouseLocation) partsConditions.push(eq(spareParts.warehouseLocation, input.warehouseLocation));
      if (input.category) partsConditions.push(eq(spareParts.category, input.category));

      const parts = await db
        .select({
          id: spareParts.id,
          unitPrice: spareParts.unitPrice,
          quantity: sparePartsInventory.quantity,
        })
        .from(spareParts)
        .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
        .where(and(...partsConditions));

      // Create check items
      for (const part of parts) {
        const qty = part.quantity || 0;
        const price = Number(part.unitPrice || 0);
        await db.insert(sparePartsInventoryCheckItems).values({
          checkId: result.id,
          sparePartId: part.id,
          systemQuantity: qty,
          unitPrice: part.unitPrice,
          systemValue: String(qty * price),
          status: "pending",
        });
      }

      // Update check totals
      await db.update(sparePartsInventoryChecks).set({
        totalItems: parts.length,
      }).where(eq(sparePartsInventoryChecks.id, result.id));

      return { id: result.id, checkNumber };
    }),

  // Danh sách phiếu kiểm kê
  listInventoryChecks: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.status) conditions.push(eq(sparePartsInventoryChecks.status, input.status as any));

      return db
        .select()
        .from(sparePartsInventoryChecks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sparePartsInventoryChecks.createdAt))
        .limit(input.limit);
    }),

  // Chi tiết phiếu kiểm kê
  getInventoryCheck: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [check] = await db
        .select()
        .from(sparePartsInventoryChecks)
        .where(eq(sparePartsInventoryChecks.id, input.id));

      if (!check) return null;

      const items = await db
        .select({
          id: sparePartsInventoryCheckItems.id,
          sparePartId: sparePartsInventoryCheckItems.sparePartId,
          partName: spareParts.name,
          partNumber: spareParts.partNumber,
          systemQuantity: sparePartsInventoryCheckItems.systemQuantity,
          actualQuantity: sparePartsInventoryCheckItems.actualQuantity,
          discrepancy: sparePartsInventoryCheckItems.discrepancy,
          unitPrice: sparePartsInventoryCheckItems.unitPrice,
          systemValue: sparePartsInventoryCheckItems.systemValue,
          actualValue: sparePartsInventoryCheckItems.actualValue,
          status: sparePartsInventoryCheckItems.status,
          notes: sparePartsInventoryCheckItems.notes,
          countedAt: sparePartsInventoryCheckItems.countedAt,
        })
        .from(sparePartsInventoryCheckItems)
        .leftJoin(spareParts, eq(sparePartsInventoryCheckItems.sparePartId, spareParts.id))
        .where(eq(sparePartsInventoryCheckItems.checkId, input.id));

      return { ...check, items };
    }),

  // Cập nhật số lượng thực tế
  updateCheckItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      actualQuantity: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get item
      const [item] = await db
        .select()
        .from(sparePartsInventoryCheckItems)
        .where(eq(sparePartsInventoryCheckItems.id, input.itemId));

      if (!item) throw new Error("Item not found");

      const discrepancy = input.actualQuantity - item.systemQuantity;
      const unitPrice = Number(item.unitPrice || 0);
      const actualValue = input.actualQuantity * unitPrice;

      await db.update(sparePartsInventoryCheckItems).set({
        actualQuantity: input.actualQuantity,
        discrepancy,
        actualValue: String(actualValue),
        status: "counted",
        notes: input.notes,
        countedBy: ctx.user?.id,
        countedAt: new Date(),
      }).where(eq(sparePartsInventoryCheckItems.id, input.itemId));

      // Update check progress
      const [check] = await db
        .select()
        .from(sparePartsInventoryChecks)
        .where(eq(sparePartsInventoryChecks.id, item.checkId));

      if (check) {
        const items = await db
          .select()
          .from(sparePartsInventoryCheckItems)
          .where(eq(sparePartsInventoryCheckItems.checkId, item.checkId));

        const checkedItems = items.filter(i => i.status !== "pending").length;
        const matchedItems = items.filter(i => i.discrepancy === 0).length;
        const discrepancyItems = items.filter(i => i.discrepancy !== null && i.discrepancy !== 0).length;

        await db.update(sparePartsInventoryChecks).set({
          checkedItems,
          matchedItems,
          discrepancyItems,
          status: checkedItems === items.length ? "completed" : "in_progress",
        }).where(eq(sparePartsInventoryChecks.id, item.checkId));
      }

      return { success: true };
    }),

  // Hoàn thành kiểm kê và điều chỉnh tồn kho
  completeInventoryCheck: protectedProcedure
    .input(z.object({
      checkId: z.number(),
      adjustInventory: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get check and items
      const [check] = await db
        .select()
        .from(sparePartsInventoryChecks)
        .where(eq(sparePartsInventoryChecks.id, input.checkId));

      if (!check) throw new Error("Inventory check not found");

      const items = await db
        .select()
        .from(sparePartsInventoryCheckItems)
        .where(eq(sparePartsInventoryCheckItems.checkId, input.checkId));

      // Calculate totals
      let totalSystemValue = 0, totalActualValue = 0;
      items.forEach(item => {
        totalSystemValue += Number(item.systemValue || 0);
        totalActualValue += Number(item.actualValue || 0);
      });

      // Adjust inventory if requested
      if (input.adjustInventory) {
        for (const item of items) {
          if (item.discrepancy && item.discrepancy !== 0 && item.actualQuantity !== null) {
            // Create adjustment movement
            const movementType = item.discrepancy > 0 ? "adjustment_in" : "adjustment_out";
            await db.insert(sparePartsStockMovements).values({
              sparePartId: item.sparePartId,
              movementType,
              quantity: Math.abs(item.discrepancy),
              beforeQuantity: item.systemQuantity,
              afterQuantity: item.actualQuantity,
              referenceType: "inventory_check",
              referenceId: input.checkId,
              referenceNumber: check.checkNumber,
              reason: `Điều chỉnh sau kiểm kê: ${item.notes || ""}`,
              performedBy: ctx.user?.id || 0,
            });

            // Update inventory
            await db.update(sparePartsInventory).set({
              quantity: item.actualQuantity,
              lastStockCheck: new Date(),
              updatedAt: new Date(),
            }).where(eq(sparePartsInventory.sparePartId, item.sparePartId));

            // Mark item as adjusted
            await db.update(sparePartsInventoryCheckItems).set({
              status: "adjusted",
            }).where(eq(sparePartsInventoryCheckItems.id, item.id));
          }
        }
      }

      // Complete check
      await db.update(sparePartsInventoryChecks).set({
        status: "completed",
        totalSystemValue: String(totalSystemValue),
        totalActualValue: String(totalActualValue),
        discrepancyValue: String(totalActualValue - totalSystemValue),
        completedAt: new Date(),
        completedBy: ctx.user?.id,
      }).where(eq(sparePartsInventoryChecks.id, input.checkId));

      return { success: true };
    }),

  // Export stock report to Excel
  exportStockReportExcel: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      reportType: z.enum(["monthly", "quarterly", "custom"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      // Get stock movements in date range
      const movements = await db
        .select({
          id: sparePartsStockMovements.id,
          partNumber: spareParts.partNumber,
          partName: spareParts.name,
          movementType: sparePartsStockMovements.movementType,
          quantity: sparePartsStockMovements.quantity,
          unitCost: sparePartsStockMovements.unitCost,
          totalCost: sparePartsStockMovements.totalCost,
          referenceNumber: sparePartsStockMovements.referenceNumber,
          reason: sparePartsStockMovements.reason,
          createdAt: sparePartsStockMovements.createdAt,
        })
        .from(sparePartsStockMovements)
        .leftJoin(spareParts, eq(sparePartsStockMovements.sparePartId, spareParts.id))
        .where(and(
          gte(sparePartsStockMovements.createdAt, start),
          lte(sparePartsStockMovements.createdAt, end)
        ))
        .orderBy(desc(sparePartsStockMovements.createdAt));

      // Calculate summary
      let totalIn = 0;
      let totalOut = 0;
      let totalInValue = 0;
      let totalOutValue = 0;

      movements.forEach(m => {
        const qty = Number(m.quantity) || 0;
        const val = Number(m.totalCost) || 0;
        if (m.movementType?.includes("in")) {
          totalIn += qty;
          totalInValue += val;
        } else {
          totalOut += qty;
          totalOutValue += val;
        }
      });

      return {
        reportType: input.reportType,
        startDate: input.startDate,
        endDate: input.endDate,
        movements,
        summary: {
          totalIn,
          totalOut,
          totalInValue,
          totalOutValue,
          netChange: totalIn - totalOut,
          netValue: totalInValue - totalOutValue,
        },
      };
    }),

  // Get low stock alerts
  getLowStockAlerts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const alerts = await db
      .select({
        id: spareParts.id,
        partNumber: spareParts.partNumber,
        name: spareParts.name,
        category: spareParts.category,
        unit: spareParts.unit,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        currentStock: sparePartsInventory.quantity,
        supplierName: suppliers.name,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
      .where(eq(spareParts.isActive, 1));

    // Filter items where current stock is below minStock or reorderPoint
    return alerts.filter(item => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      const reorder = Number(item.reorderPoint) || 0;
      return current <= min || current <= reorder;
    }).map(item => ({
      ...item,
      currentStock: Number(item.currentStock) || 0,
      minStock: Number(item.minStock) || 0,
      reorderPoint: Number(item.reorderPoint) || 0,
      alertLevel: Number(item.currentStock || 0) <= Number(item.minStock || 0) ? "critical" : "warning",
    }));
  }),

  // Auto export stock for work order completion
  autoExportForWorkOrder: protectedProcedure
    .input(z.object({
      workOrderId: z.number(),
      items: z.array(z.object({
        sparePartId: z.number(),
        quantity: z.number().positive(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = [];

      for (const item of input.items) {
        // Get current inventory
        const [inventory] = await db
          .select()
          .from(sparePartsInventory)
          .where(eq(sparePartsInventory.sparePartId, item.sparePartId))
          .limit(1);

        if (!inventory) {
          results.push({ sparePartId: item.sparePartId, success: false, error: "No inventory record" });
          continue;
        }

        const currentQty = Number(inventory.quantity) || 0;
        if (currentQty < item.quantity) {
          results.push({ sparePartId: item.sparePartId, success: false, error: "Insufficient stock" });
          continue;
        }

        // Get part info for price
        const [part] = await db
          .select()
          .from(spareParts)
          .where(eq(spareParts.id, item.sparePartId))
          .limit(1);

        const unitPrice = Number(part?.unitPrice) || 0;

        // Update inventory
        await db.update(sparePartsInventory).set({
          quantity: currentQty - item.quantity,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.id, inventory.id));

        // Record movement
        await db.insert(sparePartsStockMovements).values({
          sparePartId: item.sparePartId,
          movementType: "work_order_out",
          quantity: item.quantity,
          beforeQuantity: currentQty,
          afterQuantity: currentQty - item.quantity,
          unitCost: String(unitPrice),
          totalCost: String(item.quantity * unitPrice),
          referenceType: "work_order",
          referenceId: input.workOrderId,
          referenceNumber: `WO-${input.workOrderId}`,
          reason: `Auto export for work order #${input.workOrderId}`,
          performedBy: ctx.user?.id || 0,
        });

        results.push({ sparePartId: item.sparePartId, success: true });
      }

      return { results };
    }),

  // Send low stock email alert
  sendLowStockEmailAlert: protectedProcedure
    .input(z.object({
      recipientEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get low stock items
      const alerts = await db
        .select({
          id: spareParts.id,
          partNumber: spareParts.partNumber,
          name: spareParts.name,
          category: spareParts.category,
          unit: spareParts.unit,
          minStock: spareParts.minStock,
          reorderPoint: spareParts.reorderPoint,
          currentStock: sparePartsInventory.quantity,
          supplierName: suppliers.name,
        })
        .from(spareParts)
        .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
        .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
        .where(eq(spareParts.isActive, 1));

      // Filter low stock items
      const lowStockItems = alerts.filter(item => {
        const current = Number(item.currentStock) || 0;
        const min = Number(item.minStock) || 0;
        const reorder = Number(item.reorderPoint) || 0;
        return current <= min || current <= reorder;
      });

      if (lowStockItems.length === 0) {
        return { success: true, message: "Không có phụ tùng nào cần cảnh báo" };
      }

      // Build email content
      const itemsList = lowStockItems.map(item => {
        const current = Number(item.currentStock) || 0;
        const min = Number(item.minStock) || 0;
        const level = current <= min ? "🔴 NGUY HIỂM" : "🟡 CẢNH BÁO";
        return `${level} - ${item.partNumber}: ${item.name} | Tồn: ${current} ${item.unit || 'pcs'} (Min: ${min})`;
      }).join("\n");

      const title = `⚠️ Cảnh báo tồn kho thấp - ${lowStockItems.length} phụ tùng`;
      const content = `Có ${lowStockItems.length} phụ tùng cần đặt hàng bổ sung:\n\n${itemsList}\n\nVui lòng kiểm tra và tạo đơn đặt hàng.`;

      // Send notification to owner
      const sent = await notifyOwner({ title, content });

      return { 
        success: sent, 
        message: sent ? `Đã gửi cảnh báo cho ${lowStockItems.length} phụ tùng` : "Không thể gửi thông báo",
        itemCount: lowStockItems.length,
      };
    }),

  // ============ QUY TRÌNH ĐƠN HÀNG VỚI PHÂN QUYỀN ============

  // Gửi đơn chờ duyệt (Nhân viên)
  submitPurchaseOrderForApproval: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) throw new Error("Đơn hàng không tồn tại");
      if (po.status !== "draft") throw new Error("Đơn hàng không ở trạng thái nháp");

      await db.update(purchaseOrders).set({ status: "pending" }).where(eq(purchaseOrders.id, input.id));
      return { success: true, message: "Đã gửi đơn chờ duyệt" };
    }),

  // Duyệt đơn hàng (Quản lý) - Tích hợp Approval Workflow
  approvePurchaseOrder: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.APPROVAL, "approve", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền phê duyệt đơn hàng");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) throw new Error("Đơn hàng không tồn tại");
      if (po.status !== "pending") throw new Error("Đơn hàng không ở trạng thái chờ duyệt");

      // Kiểm tra xem có approval request không
      const [approvalRequest] = await db.select().from(approvalRequests)
        .where(and(
          eq(approvalRequests.entityType, "purchase_order"),
          eq(approvalRequests.entityId, input.id)
        ));

      if (approvalRequest && approvalRequest.status === "pending" && approvalRequest.currentStepId) {
        // Có workflow - kiểm tra quyền phê duyệt
        const [currentStep] = await db.select().from(approvalSteps)
          .where(eq(approvalSteps.id, approvalRequest.currentStepId));

        if (!currentStep) throw new Error("Không tìm thấy bước phê duyệt");

        // Kiểm tra quyền
        let canApprove = false;
        if (ctx.user?.role === "admin") {
          canApprove = true;
        } else if (currentStep.approverType === "user" && currentStep.approverId === ctx.user?.id) {
          canApprove = true;
        } else if (currentStep.approverType === "position") {
          const [profile] = await db.select().from(employeeProfiles)
            .where(eq(employeeProfiles.userId, ctx.user?.id || 0));
          if (profile && profile.positionId === currentStep.approverId) {
            canApprove = true;
          }
        } else if (currentStep.approverType === "manager") {
          const [requesterProfile] = await db.select().from(employeeProfiles)
            .where(eq(employeeProfiles.userId, approvalRequest.requesterId));
          if (requesterProfile && requesterProfile.managerId === ctx.user?.id) {
            canApprove = true;
          }
        } else if (currentStep.approverType === "department_head") {
          const [userProfile] = await db.select().from(employeeProfiles)
            .where(eq(employeeProfiles.userId, ctx.user?.id || 0));
          if (userProfile && userProfile.positionId) {
            const [position] = await db.select().from(positions)
              .where(eq(positions.id, userProfile.positionId));
            if (position && position.canApprove === 1) {
              canApprove = true;
            }
          }
        }

        if (!canApprove) throw new Error("Bạn không có quyền phê duyệt bước này");

        // Ghi lịch sử phê duyệt
        await db.insert(approvalHistories).values({
          requestId: approvalRequest.id,
          stepId: approvalRequest.currentStepId,
          approverId: ctx.user?.id || 0,
          action: "approved",
          comments: input.comments || null,
        });

        // Lấy các bước tiếp theo
        const steps = await db.select().from(approvalSteps)
          .where(eq(approvalSteps.workflowId, approvalRequest.workflowId))
          .orderBy(approvalSteps.stepOrder);

        const amount = approvalRequest.totalAmount ? Number(approvalRequest.totalAmount) : undefined;
        const applicableSteps = amount !== undefined
          ? steps.filter(step => {
              const minOk = !step.minAmount || Number(step.minAmount) <= amount;
              const maxOk = !step.maxAmount || Number(step.maxAmount) >= amount;
              return minOk && maxOk;
            })
          : steps;

        const currentIndex = applicableSteps.findIndex(s => s.id === approvalRequest.currentStepId);
        const nextStep = applicableSteps[currentIndex + 1];

        if (nextStep) {
          // Còn bước tiếp theo
          await db.update(approvalRequests)
            .set({ currentStepId: nextStep.id })
            .where(eq(approvalRequests.id, approvalRequest.id));
          return { success: true, message: `Đã duyệt bước ${currentIndex + 1}. Chờ duyệt bước tiếp theo.`, nextStep: nextStep.name };
        } else {
          // Hoàn thành tất cả các bước
          await db.update(approvalRequests)
            .set({ status: "approved", currentStepId: null })
            .where(eq(approvalRequests.id, approvalRequest.id));

          await db.update(purchaseOrders).set({
            status: "approved",
            approvedBy: ctx.user?.id,
            approvedAt: new Date(),
          }).where(eq(purchaseOrders.id, input.id));

          return { success: true, message: "Đã duyệt hoàn tất đơn hàng" };
        }
      } else {
        // Không có workflow - duyệt trực tiếp (chỉ admin)
        if (ctx.user?.role !== "admin") {
          throw new Error("Bạn không có quyền duyệt đơn hàng");
        }

        await db.update(purchaseOrders).set({
          status: "approved",
          approvedBy: ctx.user?.id,
          approvedAt: new Date(),
        }).where(eq(purchaseOrders.id, input.id));

        return { success: true, message: "Đã duyệt đơn hàng" };
      }
    }),

  // Từ chối đơn hàng (Quản lý)
  rejectPurchaseOrder: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      reason: z.string().min(1, "Vui lòng nhập lý do từ chối"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) throw new Error("Đơn hàng không tồn tại");
      if (po.status !== "pending") throw new Error("Đơn hàng không ở trạng thái chờ duyệt");

      await db.update(purchaseOrders).set({
        status: "cancelled",
        rejectedBy: ctx.user?.id,
        rejectedAt: new Date(),
        rejectionReason: input.reason,
      }).where(eq(purchaseOrders.id, input.id));

      return { success: true, message: "Đã từ chối đơn hàng" };
    }),

  // Gửi đơn đặt hàng (sau khi được duyệt)
  sendPurchaseOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!po) throw new Error("Đơn hàng không tồn tại");
      if (po.status !== "approved") throw new Error("Đơn hàng chưa được duyệt");

      await db.update(purchaseOrders).set({
        status: "ordered",
        orderDate: new Date(),
      }).where(eq(purchaseOrders.id, input.id));

      return { success: true, message: "Đã gửi đơn đặt hàng" };
    }),

  // ============ XUẤT KHO HÀNG LOẠT ============

  // Xuất kho nhiều phụ tùng cùng lúc với mục đích
  bulkExportStock: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        sparePartId: z.number(),
        quantity: z.number().min(1),
      })),
      exportPurpose: z.enum(["repair", "borrow", "destroy", "normal"]),
      reason: z.string().optional(),
      borrowerName: z.string().optional(),
      borrowerDepartment: z.string().optional(),
      expectedReturnDate: z.string().optional(),
      workOrderId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.SPARE_PARTS, "export", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền xuất kho");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = [];
      for (const item of input.items) {
        // Kiểm tra tồn kho
        const [inv] = await db.select().from(sparePartsInventory)
          .where(eq(sparePartsInventory.sparePartId, item.sparePartId));
        
        if (!inv || (inv.quantity || 0) < item.quantity) {
          const [part] = await db.select().from(spareParts).where(eq(spareParts.id, item.sparePartId));
          results.push({
            sparePartId: item.sparePartId,
            success: false,
            error: `Không đủ tồn kho cho ${part?.name || 'phụ tùng'} (có: ${inv?.quantity || 0}, cần: ${item.quantity})`,
          });
          continue;
        }

        // Lấy giá phụ tùng
        const [part] = await db.select().from(spareParts).where(eq(spareParts.id, item.sparePartId));
        const unitCost = Number(part?.unitPrice || 0);

        // Tạo giao dịch xuất kho
        const [tx] = await db.insert(sparePartsTransactions).values({
          sparePartId: item.sparePartId,
          transactionType: "out",
          quantity: item.quantity,
          unitCost: String(unitCost),
          totalCost: String(item.quantity * unitCost),
          reason: input.reason,
          performedBy: ctx.user?.id,
          workOrderId: input.workOrderId,
          exportPurpose: input.exportPurpose,
          borrowerName: input.borrowerName,
          borrowerDepartment: input.borrowerDepartment,
          expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
          returnStatus: input.exportPurpose === "borrow" ? "pending" : null,
        }).$returningId();

        // Cập nhật tồn kho
        await db.update(sparePartsInventory).set({
          quantity: (inv.quantity || 0) - item.quantity,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, item.sparePartId));

        results.push({
          sparePartId: item.sparePartId,
          success: true,
          transactionId: tx.id,
        });
      }

      const successCount = results.filter(r => r.success).length;
      return { 
        success: successCount > 0, 
        message: `Xuất kho thành công ${successCount}/${input.items.length} phụ tùng`,
        results,
      };
    }),

  // ============ NHẬP KHO LẠI (TRẢ HÀNG) ============

  // Lấy danh sách giao dịch cần trả
  getPendingReturns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const returns = await db
      .select({
        id: sparePartsTransactions.id,
        sparePartId: sparePartsTransactions.sparePartId,
        partNumber: spareParts.partNumber,
        partName: spareParts.name,
        quantity: sparePartsTransactions.quantity,
        returnedQuantity: sparePartsTransactions.returnedQuantity,
        exportPurpose: sparePartsTransactions.exportPurpose,
        borrowerName: sparePartsTransactions.borrowerName,
        borrowerDepartment: sparePartsTransactions.borrowerDepartment,
        expectedReturnDate: sparePartsTransactions.expectedReturnDate,
        returnStatus: sparePartsTransactions.returnStatus,
        createdAt: sparePartsTransactions.createdAt,
      })
      .from(sparePartsTransactions)
      .leftJoin(spareParts, eq(sparePartsTransactions.sparePartId, spareParts.id))
      .where(and(
        eq(sparePartsTransactions.transactionType, "out"),
        eq(sparePartsTransactions.exportPurpose, "borrow"),
        or(
          eq(sparePartsTransactions.returnStatus, "pending"),
          eq(sparePartsTransactions.returnStatus, "partial")
        )
      ))
      .orderBy(desc(sparePartsTransactions.createdAt));

    return returns;
  }),

  // Nhập kho lại (trả hàng)
  returnStock: protectedProcedure
    .input(z.object({
      originalTransactionId: z.number(),
      quantity: z.number().min(1),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Lấy giao dịch gốc
      const [originalTx] = await db.select().from(sparePartsTransactions)
        .where(eq(sparePartsTransactions.id, input.originalTransactionId));
      
      if (!originalTx) throw new Error("Giao dịch không tồn tại");
      if (originalTx.transactionType !== "out") throw new Error("Giao dịch không phải xuất kho");

      // Kiểm tra số lượng có thể trả
      const alreadyReturned = originalTx.returnedQuantity || 0;
      const maxReturn = originalTx.quantity - alreadyReturned;
      if (input.quantity > maxReturn) {
        throw new Error(`Chỉ có thể trả tối đa ${maxReturn} (\u0111ã trả ${alreadyReturned}/${originalTx.quantity})`);
      }

      // Tạo giao dịch nhập kho lại
      await db.insert(sparePartsTransactions).values({
        sparePartId: originalTx.sparePartId,
        transactionType: "return",
        quantity: input.quantity,
        unitCost: originalTx.unitCost,
        totalCost: String(input.quantity * Number(originalTx.unitCost || 0)),
        reason: input.reason || `Trả hàng từ giao dịch #${originalTx.id}`,
        performedBy: ctx.user?.id,
        relatedTransactionId: originalTx.id,
      });

      // Cập nhật giao dịch gốc
      const newReturnedQty = alreadyReturned + input.quantity;
      const newStatus = newReturnedQty >= originalTx.quantity ? "completed" : "partial";
      await db.update(sparePartsTransactions).set({
        returnedQuantity: newReturnedQty,
        returnStatus: newStatus,
        actualReturnDate: newStatus === "completed" ? new Date() : null,
      }).where(eq(sparePartsTransactions.id, input.originalTransactionId));

      // Cập nhật tồn kho
      const [inv] = await db.select().from(sparePartsInventory)
        .where(eq(sparePartsInventory.sparePartId, originalTx.sparePartId));
      if (inv) {
        await db.update(sparePartsInventory).set({
          quantity: (inv.quantity || 0) + input.quantity,
          updatedAt: new Date(),
        }).where(eq(sparePartsInventory.sparePartId, originalTx.sparePartId));
      }

      return { 
        success: true, 
        message: `\u0110ã nhập kho lại ${input.quantity} phụ tùng`,
        newReturnStatus: newStatus,
      };
    }),

  // Check and auto-send low stock alerts (for scheduled job)
  checkAndSendLowStockAlerts: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false, message: "Database not available" };

    // Get low stock items
    const alerts = await db
      .select({
        id: spareParts.id,
        partNumber: spareParts.partNumber,
        name: spareParts.name,
        category: spareParts.category,
        unit: spareParts.unit,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        currentStock: sparePartsInventory.quantity,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .where(eq(spareParts.isActive, 1));

    // Filter critical items (below minStock)
    const criticalItems = alerts.filter(item => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      return current <= min && min > 0;
    });

    if (criticalItems.length === 0) {
      return { success: true, message: "No critical items", itemCount: 0 };
    }

    // Build notification
    const itemsList = criticalItems.slice(0, 10).map(item => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      return `- ${item.partNumber}: ${item.name} (Tồn: ${current}/${min})`;
    }).join("\n");

    const title = `🚨 Cảnh báo tồn kho nguy hiểm - ${criticalItems.length} phụ tùng`;
    const content = `Có ${criticalItems.length} phụ tùng dưới mức tồn tối thiểu:\n\n${itemsList}${criticalItems.length > 10 ? `\n... và ${criticalItems.length - 10} phụ tùng khác` : ''}\n\nVui lòng đặt hàng ngay!`;

    const sent = await notifyOwner({ title, content });

    return { 
      success: sent, 
      message: sent ? "Alert sent" : "Failed to send alert",
      itemCount: criticalItems.length,
    };
  }),
});
