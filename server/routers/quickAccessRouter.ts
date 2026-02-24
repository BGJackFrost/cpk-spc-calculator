import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userQuickAccess, userQuickAccessCategories, systemSettings } from "../../drizzle/schema";
import { eq, and, asc, isNull } from "drizzle-orm";

export const quickAccessRouter = router({
  // Lấy danh sách Quick Access của user hiện tại
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const items = await db
      .select()
      .from(userQuickAccess)
      .where(eq(userQuickAccess.userId, ctx.user.id))
      .orderBy(asc(userQuickAccess.sortOrder));
    
    return items;
  }),

  // Thêm menu vào Quick Access
  add: protectedProcedure
    .input(z.object({
      menuId: z.string().min(1),
      menuPath: z.string().min(1),
      menuLabel: z.string().min(1),
      menuIcon: z.string().optional(),
      systemId: z.string().optional(),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra đã tồn tại chưa
      const existing = await db
        .select()
        .from(userQuickAccess)
        .where(and(
          eq(userQuickAccess.userId, ctx.user.id),
          eq(userQuickAccess.menuId, input.menuId)
        ))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Menu đã có trong Quick Access" });
      }

      // Lấy sortOrder lớn nhất
      const maxOrder = await db
        .select({ maxOrder: userQuickAccess.sortOrder })
        .from(userQuickAccess)
        .where(eq(userQuickAccess.userId, ctx.user.id))
        .orderBy(asc(userQuickAccess.sortOrder));
      
      const newOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(m => m.maxOrder)) + 1 : 0;

      const result = await db.insert(userQuickAccess).values({
        userId: ctx.user.id,
        menuId: input.menuId,
        menuPath: input.menuPath,
        menuLabel: input.menuLabel,
        menuIcon: input.menuIcon || null,
        systemId: input.systemId || null,
        categoryId: input.categoryId || null,
        sortOrder: newOrder,
      });

      return { success: true, id: Number((result as any).insertId || 0) };
    }),

  // Xóa menu khỏi Quick Access
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra quyền sở hữu
      const item = await db
        .select()
        .from(userQuickAccess)
        .where(and(
          eq(userQuickAccess.id, input.id),
          eq(userQuickAccess.userId, ctx.user.id)
        ))
        .limit(1);

      if (item.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy menu" });
      }

      await db.delete(userQuickAccess).where(eq(userQuickAccess.id, input.id));

      return { success: true };
    }),

  // Sắp xếp lại thứ tự Quick Access
  reorder: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Cập nhật từng item
      for (const item of input.items) {
        await db
          .update(userQuickAccess)
          .set({ sortOrder: item.sortOrder })
          .where(and(
            eq(userQuickAccess.id, item.id),
            eq(userQuickAccess.userId, ctx.user.id)
          ));
      }

      return { success: true };
    }),

  // Xóa tất cả Quick Access của user
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    await db.delete(userQuickAccess).where(eq(userQuickAccess.userId, ctx.user.id));

    return { success: true };
  }),

  // Export Quick Access settings
  export: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { version: 1, items: [] };
    
    const items = await db
      .select({
        menuId: userQuickAccess.menuId,
        menuPath: userQuickAccess.menuPath,
        menuLabel: userQuickAccess.menuLabel,
        menuIcon: userQuickAccess.menuIcon,
        systemId: userQuickAccess.systemId,
        sortOrder: userQuickAccess.sortOrder,
      })
      .from(userQuickAccess)
      .where(eq(userQuickAccess.userId, ctx.user.id))
      .orderBy(asc(userQuickAccess.sortOrder));
    
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
  }),

  // Import Quick Access settings
  import: protectedProcedure
    .input(z.object({
      version: z.number(),
      items: z.array(z.object({
        menuId: z.string(),
        menuPath: z.string(),
        menuLabel: z.string(),
        menuIcon: z.string().nullable().optional(),
        systemId: z.string().nullable().optional(),
        sortOrder: z.number(),
      })),
      replaceExisting: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validate version
      if (input.version !== 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Phiên bản không được hỗ trợ" });
      }

      // Xóa cũ nếu replaceExisting = true
      if (input.replaceExisting) {
        await db.delete(userQuickAccess).where(eq(userQuickAccess.userId, ctx.user.id));
      }

      // Thêm mới
      let imported = 0;
      let skipped = 0;

      for (const item of input.items) {
        // Kiểm tra đã tồn tại chưa (nếu không replaceExisting)
        if (!input.replaceExisting) {
          const existing = await db
            .select()
            .from(userQuickAccess)
            .where(and(
              eq(userQuickAccess.userId, ctx.user.id),
              eq(userQuickAccess.menuId, item.menuId)
            ))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        await db.insert(userQuickAccess).values({
          userId: ctx.user.id,
          menuId: item.menuId,
          menuPath: item.menuPath,
          menuLabel: item.menuLabel,
          menuIcon: item.menuIcon || null,
          systemId: item.systemId || null,
          sortOrder: item.sortOrder,
        });
        imported++;
      }

      return { success: true, imported, skipped };
    }),

  // ==================== CATEGORY APIs ====================

  // Lấy danh sách categories của user
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const categories = await db
      .select()
      .from(userQuickAccessCategories)
      .where(eq(userQuickAccessCategories.userId, ctx.user.id))
      .orderBy(asc(userQuickAccessCategories.sortOrder));
    
    return categories;
  }),

  // Tạo category mới
  createCategory: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      icon: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Lấy sortOrder lớn nhất
      const maxOrder = await db
        .select({ maxOrder: userQuickAccessCategories.sortOrder })
        .from(userQuickAccessCategories)
        .where(eq(userQuickAccessCategories.userId, ctx.user.id))
        .orderBy(asc(userQuickAccessCategories.sortOrder));
      
      const newOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(m => m.maxOrder)) + 1 : 0;

      const result = await db.insert(userQuickAccessCategories).values({
        userId: ctx.user.id,
        name: input.name,
        icon: input.icon || "Folder",
        color: input.color || "blue",
        sortOrder: newOrder,
      });

      return { success: true, id: Number((result as any).insertId || 0) };
    }),

  // Cập nhật category
  updateCategory: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      isExpanded: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra quyền sở hữu
      const category = await db
        .select()
        .from(userQuickAccessCategories)
        .where(and(
          eq(userQuickAccessCategories.id, input.id),
          eq(userQuickAccessCategories.userId, ctx.user.id)
        ))
        .limit(1);

      if (category.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy category" });
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isExpanded !== undefined) updateData.isExpanded = input.isExpanded ? 1 : 0;

      await db
        .update(userQuickAccessCategories)
        .set(updateData)
        .where(eq(userQuickAccessCategories.id, input.id));

      return { success: true };
    }),

  // Xóa category
  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra quyền sở hữu
      const category = await db
        .select()
        .from(userQuickAccessCategories)
        .where(and(
          eq(userQuickAccessCategories.id, input.id),
          eq(userQuickAccessCategories.userId, ctx.user.id)
        ))
        .limit(1);

      if (category.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy category" });
      }

      // Chuyển các items trong category về uncategorized
      await db
        .update(userQuickAccess)
        .set({ categoryId: null })
        .where(and(
          eq(userQuickAccess.userId, ctx.user.id),
          eq(userQuickAccess.categoryId, input.id)
        ));

      // Xóa category
      await db.delete(userQuickAccessCategories).where(eq(userQuickAccessCategories.id, input.id));

      return { success: true };
    }),

  // Sắp xếp lại thứ tự categories
  reorderCategories: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (const item of input.items) {
        await db
          .update(userQuickAccessCategories)
          .set({ sortOrder: item.sortOrder })
          .where(and(
            eq(userQuickAccessCategories.id, item.id),
            eq(userQuickAccessCategories.userId, ctx.user.id)
          ));
      }

      return { success: true };
    }),

  // Chuyển item vào category
  moveToCategory: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      categoryId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra item thuộc về user
      const item = await db
        .select()
        .from(userQuickAccess)
        .where(and(
          eq(userQuickAccess.id, input.itemId),
          eq(userQuickAccess.userId, ctx.user.id)
        ))
        .limit(1);

      if (item.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy item" });
      }

      // Nếu categoryId không null, kiểm tra category thuộc về user
      if (input.categoryId !== null) {
        const category = await db
          .select()
          .from(userQuickAccessCategories)
          .where(and(
            eq(userQuickAccessCategories.id, input.categoryId),
            eq(userQuickAccessCategories.userId, ctx.user.id)
          ))
          .limit(1);

        if (category.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy category" });
        }
      }

      await db
        .update(userQuickAccess)
        .set({ categoryId: input.categoryId })
        .where(eq(userQuickAccess.id, input.itemId));

      return { success: true };
    }),

  // Lấy Quick Access items theo category
  listByCategory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { categories: [], uncategorized: [], pinned: [] };
    
    // Lấy tất cả categories
    const categories = await db
      .select()
      .from(userQuickAccessCategories)
      .where(eq(userQuickAccessCategories.userId, ctx.user.id))
      .orderBy(asc(userQuickAccessCategories.sortOrder));
    
    // Lấy tất cả items
    const items = await db
      .select()
      .from(userQuickAccess)
      .where(eq(userQuickAccess.userId, ctx.user.id))
      .orderBy(asc(userQuickAccess.sortOrder));
    
    // Lấy các items đã ghim
    const pinned = items.filter(item => item.isPinned === 1);
    
    // Nhóm items theo category (không bao gồm pinned items)
    const categorizedItems = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.categoryId === cat.id && item.isPinned !== 1),
    }));
    
    // Items không có category (không bao gồm pinned items)
    const uncategorized = items.filter(item => item.categoryId === null && item.isPinned !== 1);
    
    return {
      categories: categorizedItems,
      uncategorized,
      pinned,
    };
  }),

  // Lấy giới hạn số lượng pin
  getPinLimit: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { maxPinned: 5, currentPinned: 0 };

    // Lấy giới hạn từ system_settings
    let maxPinned = 5;
    try {
      const setting = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "quick_access_max_pinned"))
        .limit(1);
      
      if (setting.length > 0 && setting[0].value) {
        const value = parseInt(setting[0].value, 10);
        if (!isNaN(value) && value > 0) maxPinned = value;
      }
    } catch (e) {
      // Ignore errors, use default
    }

    const pinnedCount = await db
      .select()
      .from(userQuickAccess)
      .where(and(
        eq(userQuickAccess.userId, ctx.user.id),
        eq(userQuickAccess.isPinned, 1)
      ));

    return {
      maxPinned,
      currentPinned: pinnedCount.length,
    };
  }),

  // Cập nhật giới hạn pin (chỉ admin)
  updatePinLimit: protectedProcedure
    .input(z.object({ maxPinned: z.number().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Kiểm tra quyền admin
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có thể thay đổi cài đặt này" });
      }

      // Kiểm tra xem setting đã tồn tại chưa
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "quick_access_max_pinned"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ 
            value: input.maxPinned.toString(),
            updatedBy: ctx.user.id,
          })
          .where(eq(systemSettings.key, "quick_access_max_pinned"));
      } else {
        await db.insert(systemSettings).values({
          key: "quick_access_max_pinned",
          value: input.maxPinned.toString(),
          description: "Số lượng mục tối đa có thể ghim trong Quick Access",
          updatedBy: ctx.user.id,
        });
      }

      return { success: true, maxPinned: input.maxPinned };
    }),

  // Ghim/Bỏ ghim item
  togglePin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Lấy giới hạn từ system_settings
      let MAX_PINNED = 5;
      try {
        const setting = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, "quick_access_max_pinned"))
          .limit(1);
        
        if (setting.length > 0 && setting[0].value) {
          const value = parseInt(setting[0].value, 10);
          if (!isNaN(value) && value > 0) MAX_PINNED = value;
        }
      } catch (e) {
        // Ignore errors, use default
      }

      // Kiểm tra item thuộc về user
      const item = await db
        .select()
        .from(userQuickAccess)
        .where(and(
          eq(userQuickAccess.id, input.id),
          eq(userQuickAccess.userId, ctx.user.id)
        ))
        .limit(1);

      if (item.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy item" });
      }

      const currentPinned = item[0].isPinned;
      const newPinned = currentPinned === 1 ? 0 : 1;

      // Nếu đang muốn ghim, kiểm tra giới hạn
      if (newPinned === 1) {
        const pinnedCount = await db
          .select()
          .from(userQuickAccess)
          .where(and(
            eq(userQuickAccess.userId, ctx.user.id),
            eq(userQuickAccess.isPinned, 1)
          ));

        if (pinnedCount.length >= MAX_PINNED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Bạn chỉ có thể ghim tối đa ${MAX_PINNED} mục. Vui lòng bỏ ghim một mục khác trước.`,
          });
        }
      }

      await db
        .update(userQuickAccess)
        .set({ isPinned: newPinned })
        .where(eq(userQuickAccess.id, input.id));

      return { success: true, isPinned: newPinned === 1 };
    }),
});
