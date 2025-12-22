import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDbWithPool } from "../db";
import { userThemePreferences, customThemes } from "../../drizzle/schema";
import { eq, and, or } from "drizzle-orm";

// Schema for theme colors
const themeColorsSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  foregroundColor: z.string(),
  mutedColor: z.string().optional(),
  mutedForegroundColor: z.string().optional(),
});

// Schema for CSS variables
const cssVariablesSchema = z.record(z.string());

export const themeRouter = router({
  // Get user's theme preference
  getPreference: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const db = await getDbWithPool();
    if (!db) {
      return {
        themeId: "default-blue",
        isDarkMode: false,
        customThemeId: null,
      };
    }
    
    const [preference] = await db
      .select()
      .from(userThemePreferences)
      .where(eq(userThemePreferences.userId, userId))
      .limit(1);
    
    if (!preference) {
      return {
        themeId: "default-blue",
        isDarkMode: false,
        customThemeId: null,
      };
    }
    
    return {
      themeId: preference.themeId,
      isDarkMode: preference.isDarkMode === 1,
      customThemeId: preference.customThemeId,
    };
  }),

  // Save user's theme preference
  savePreference: protectedProcedure
    .input(z.object({
      themeId: z.string(),
      isDarkMode: z.boolean(),
      customThemeId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDbWithPool();
      if (!db) throw new Error("Database not available");
      
      // Check if preference exists
      const [existing] = await db
        .select()
        .from(userThemePreferences)
        .where(eq(userThemePreferences.userId, userId))
        .limit(1);
      
      if (existing) {
        // Update existing
        await db
          .update(userThemePreferences)
          .set({
            themeId: input.themeId,
            isDarkMode: input.isDarkMode ? 1 : 0,
            customThemeId: input.customThemeId ?? null,
          })
          .where(eq(userThemePreferences.userId, userId));
      } else {
        // Insert new
        await db.insert(userThemePreferences).values({
          userId,
          themeId: input.themeId,
          isDarkMode: input.isDarkMode ? 1 : 0,
          customThemeId: input.customThemeId ?? null,
        });
      }
      
      return { success: true };
    }),

  // Get user's custom themes
  getCustomThemes: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const db = await getDbWithPool();
    if (!db) return [];
    
    // Get user's own themes + public themes from others
    const themes = await db
      .select()
      .from(customThemes)
      .where(
        or(
          eq(customThemes.userId, userId),
          eq(customThemes.isPublic, 1)
        )
      );
    
    return themes.map(theme => ({
      id: theme.id,
      userId: theme.userId,
      name: theme.name,
      description: theme.description,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor,
      foregroundColor: theme.foregroundColor,
      mutedColor: theme.mutedColor,
      mutedForegroundColor: theme.mutedForegroundColor,
      lightVariables: theme.lightVariables ? JSON.parse(theme.lightVariables) : null,
      darkVariables: theme.darkVariables ? JSON.parse(theme.darkVariables) : null,
      isPublic: theme.isPublic === 1,
      isOwner: theme.userId === userId,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }));
  }),

  // Get a specific custom theme
  getCustomTheme: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDbWithPool();
      if (!db) return null;
      
      const [theme] = await db
        .select()
        .from(customThemes)
        .where(
          and(
            eq(customThemes.id, input.id),
            or(
              eq(customThemes.userId, userId),
              eq(customThemes.isPublic, 1)
            )
          )
        )
        .limit(1);
      
      if (!theme) {
        return null;
      }
      
      return {
        id: theme.id,
        userId: theme.userId,
        name: theme.name,
        description: theme.description,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        foregroundColor: theme.foregroundColor,
        mutedColor: theme.mutedColor,
        mutedForegroundColor: theme.mutedForegroundColor,
        lightVariables: theme.lightVariables ? JSON.parse(theme.lightVariables) : null,
        darkVariables: theme.darkVariables ? JSON.parse(theme.darkVariables) : null,
        isPublic: theme.isPublic === 1,
        isOwner: theme.userId === userId,
      };
    }),

  // Create a custom theme
  createCustomTheme: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(255).optional(),
      colors: themeColorsSchema,
      lightVariables: cssVariablesSchema.optional(),
      darkVariables: cssVariablesSchema.optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDbWithPool();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(customThemes).values({
        userId,
        name: input.name,
        description: input.description ?? null,
        primaryColor: input.colors.primaryColor,
        secondaryColor: input.colors.secondaryColor,
        accentColor: input.colors.accentColor,
        backgroundColor: input.colors.backgroundColor,
        foregroundColor: input.colors.foregroundColor,
        mutedColor: input.colors.mutedColor ?? null,
        mutedForegroundColor: input.colors.mutedForegroundColor ?? null,
        lightVariables: input.lightVariables ? JSON.stringify(input.lightVariables) : null,
        darkVariables: input.darkVariables ? JSON.stringify(input.darkVariables) : null,
        isPublic: input.isPublic ? 1 : 0,
      });
      
      return { 
        success: true, 
        id: result.insertId,
      };
    }),

  // Update a custom theme
  updateCustomTheme: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(255).optional(),
      colors: themeColorsSchema.optional(),
      lightVariables: cssVariablesSchema.optional(),
      darkVariables: cssVariablesSchema.optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDbWithPool();
      if (!db) throw new Error("Database not available");
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(customThemes)
        .where(
          and(
            eq(customThemes.id, input.id),
            eq(customThemes.userId, userId)
          )
        )
        .limit(1);
      
      if (!existing) {
        throw new Error("Theme not found or you don't have permission to edit it");
      }
      
      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic ? 1 : 0;
      
      if (input.colors) {
        updateData.primaryColor = input.colors.primaryColor;
        updateData.secondaryColor = input.colors.secondaryColor;
        updateData.accentColor = input.colors.accentColor;
        updateData.backgroundColor = input.colors.backgroundColor;
        updateData.foregroundColor = input.colors.foregroundColor;
        if (input.colors.mutedColor) updateData.mutedColor = input.colors.mutedColor;
        if (input.colors.mutedForegroundColor) updateData.mutedForegroundColor = input.colors.mutedForegroundColor;
      }
      
      if (input.lightVariables) updateData.lightVariables = JSON.stringify(input.lightVariables);
      if (input.darkVariables) updateData.darkVariables = JSON.stringify(input.darkVariables);
      
      await db
        .update(customThemes)
        .set(updateData)
        .where(eq(customThemes.id, input.id));
      
      return { success: true };
    }),

  // Delete a custom theme
  deleteCustomTheme: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const db = await getDbWithPool();
      if (!db) throw new Error("Database not available");
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(customThemes)
        .where(
          and(
            eq(customThemes.id, input.id),
            eq(customThemes.userId, userId)
          )
        )
        .limit(1);
      
      if (!existing) {
        throw new Error("Theme not found or you don't have permission to delete it");
      }
      
      // Remove from any user preferences first
      await db
        .update(userThemePreferences)
        .set({ 
          customThemeId: null,
          themeId: "default-blue" 
        })
        .where(eq(userThemePreferences.customThemeId, input.id));
      
      // Delete the theme
      await db
        .delete(customThemes)
        .where(eq(customThemes.id, input.id));
      
      return { success: true };
    }),
});
