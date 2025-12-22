import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userQuickAccess } from "../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

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
});
