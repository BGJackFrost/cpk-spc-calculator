import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { videoTutorials } from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Video categories
export const VIDEO_CATEGORIES = [
  { value: "getting_started", label: "Bắt đầu sử dụng" },
  { value: "spc_analysis", label: "Phân tích SPC/CPK" },
  { value: "production_setup", label: "Thiết lập Sản xuất" },
  { value: "spc_plan", label: "Kế hoạch SPC" },
  { value: "realtime_monitoring", label: "Giám sát Realtime" },
  { value: "alerts_notifications", label: "Cảnh báo & Thông báo" },
  { value: "reports", label: "Báo cáo & Xuất dữ liệu" },
  { value: "admin", label: "Quản trị hệ thống" },
  { value: "mms", label: "Quản lý Thiết bị (MMS)" },
  { value: "knowledge", label: "Kiến thức SPC/CPK" },
] as const;

// Video levels
export const VIDEO_LEVELS = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
] as const;

export const videoTutorialRouter = router({
  // List all videos (public - for User Guide page)
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      search: z.string().optional(),
      activeOnly: z.boolean().optional().default(true),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const conditions = [];
      
      if (input?.activeOnly !== false) {
        conditions.push(eq(videoTutorials.isActive, 1));
      }
      
      if (input?.category) {
        conditions.push(eq(videoTutorials.category, input.category));
      }
      
      if (input?.level) {
        conditions.push(eq(videoTutorials.level, input.level));
      }
      
      if (input?.search) {
        conditions.push(
          sql`(${videoTutorials.title} LIKE ${`%${input.search}%`} OR ${videoTutorials.description} LIKE ${`%${input.search}%`})`
        );
      }
      
      const videos = await db
        .select()
        .from(videoTutorials)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(videoTutorials.sortOrder, videoTutorials.createdAt);
      
      return videos;
    }),

  // Get video by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [video] = await db
        .select()
        .from(videoTutorials)
        .where(eq(videoTutorials.id, input.id));
      
      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video không tồn tại" });
      }
      
      return video;
    }),

  // Create new video (admin only)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1, "Tiêu đề không được để trống"),
      description: z.string().optional(),
      youtubeUrl: z.string().url("URL không hợp lệ"),
      duration: z.string().optional(),
      category: z.string().min(1, "Danh mục không được để trống"),
      level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
      sortOrder: z.number().optional().default(0),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check admin permission
      const user = ctx.user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền thêm video" });
      }
      
      // Extract YouTube ID from URL
      const youtubeId = extractYouTubeId(input.youtubeUrl);
      if (!youtubeId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL YouTube không hợp lệ" });
      }
      
      // Generate thumbnail URL from YouTube
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [result] = await db.insert(videoTutorials).values({
        title: input.title,
        description: input.description || null,
        youtubeUrl: input.youtubeUrl,
        youtubeId: youtubeId,
        thumbnailUrl: thumbnailUrl,
        duration: input.duration || null,
        category: input.category,
        level: input.level,
        sortOrder: input.sortOrder,
        isActive: input.isActive ? 1 : 0,
        createdBy: user.id,
      });
      
      return { success: true, id: result.insertId };
    }),

  // Update video (admin only)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      youtubeUrl: z.string().url().optional(),
      duration: z.string().optional(),
      category: z.string().optional(),
      level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check admin permission
      const user = ctx.user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền sửa video" });
      }
      
      const { id, ...updateData } = input;
      
      // If YouTube URL is updated, extract new ID and thumbnail
      let youtubeId: string | undefined;
      let thumbnailUrl: string | undefined;
      
      if (updateData.youtubeUrl) {
        youtubeId = extractYouTubeId(updateData.youtubeUrl) || undefined;
        if (!youtubeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "URL YouTube không hợp lệ" });
        }
        thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db
        .update(videoTutorials)
        .set({
          ...updateData,
          ...(youtubeId && { youtubeId }),
          ...(thumbnailUrl && { thumbnailUrl }),
          isActive: updateData.isActive !== undefined ? (updateData.isActive ? 1 : 0) : undefined,
        })
        .where(eq(videoTutorials.id, id));
      
      return { success: true };
    }),

  // Delete video (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Check admin permission
      const user = ctx.user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền xóa video" });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      await db.delete(videoTutorials).where(eq(videoTutorials.id, input.id));
      
      return { success: true };
    }),

  // Increment view count
  incrementViewCount: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db
        .update(videoTutorials)
        .set({
          viewCount: sql`${videoTutorials.viewCount} + 1`,
        })
        .where(eq(videoTutorials.id, input.id));
      
      return { success: true };
    }),

  // Get categories list
  getCategories: publicProcedure.query(() => {
    return VIDEO_CATEGORIES;
  }),

  // Get levels list
  getLevels: publicProcedure.query(() => {
    return VIDEO_LEVELS;
  }),

  // Reorder videos (admin only)
  reorder: protectedProcedure
    .input(z.object({
      videos: z.array(z.object({
        id: z.number(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check admin permission
      const user = ctx.user;
      if (!user || (user.role !== "admin" && user.role !== "manager")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền sắp xếp video" });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      for (const video of input.videos) {
        await db
          .update(videoTutorials)
          .set({ sortOrder: video.sortOrder })
          .where(eq(videoTutorials.id, video.id));
      }
      
      return { success: true };
    }),
});
