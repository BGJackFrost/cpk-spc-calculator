import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { companies, departments, teams, positions, employeeProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const organizationRouter = router({
  // ===== COMPANIES =====
  listCompanies: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(companies).orderBy(companies.name);
  }),

  createCompany: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      taxCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(companies).values({
        code: input.code,
        name: input.name,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        taxCode: input.taxCode || null,
      });
      return { id: result.insertId };
    }),

  updateCompany: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      taxCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(companies)
        .set({
          code: input.code,
          name: input.name,
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          taxCode: input.taxCode || null,
        })
        .where(eq(companies.id, input.id));
      return { success: true };
    }),

  // ===== DEPARTMENTS =====
  listDepartments: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(departments).orderBy(departments.name);
  }),

  createDepartment: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(departments).values({
        companyId: input.companyId,
        code: input.code,
        name: input.name,
        description: input.description || null,
        parentId: input.parentId || null,
      });
      return { id: result.insertId };
    }),

  updateDepartment: protectedProcedure
    .input(z.object({
      id: z.number(),
      companyId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(departments)
        .set({
          companyId: input.companyId,
          code: input.code,
          name: input.name,
          description: input.description || null,
          parentId: input.parentId || null,
        })
        .where(eq(departments.id, input.id));
      return { success: true };
    }),

  // ===== TEAMS =====
  listTeams: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(teams).orderBy(teams.name);
  }),

  createTeam: protectedProcedure
    .input(z.object({
      departmentId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(teams).values({
        departmentId: input.departmentId,
        code: input.code,
        name: input.name,
        description: input.description || null,
      });
      return { id: result.insertId };
    }),

  updateTeam: protectedProcedure
    .input(z.object({
      id: z.number(),
      departmentId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(teams)
        .set({
          departmentId: input.departmentId,
          code: input.code,
          name: input.name,
          description: input.description || null,
        })
        .where(eq(teams.id, input.id));
      return { success: true };
    }),

  // ===== POSITIONS =====
  listPositions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(positions).orderBy(positions.level, positions.name);
  }),

  createPosition: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      level: z.number().min(1).max(10),
      canApprove: z.boolean(),
      approvalLimit: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(positions).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        level: input.level,
        canApprove: input.canApprove ? 1 : 0,
        approvalLimit: input.approvalLimit ? String(input.approvalLimit) : null,
      });
      return { id: result.insertId };
    }),

  updatePosition: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      level: z.number().min(1).max(10),
      canApprove: z.boolean(),
      approvalLimit: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(positions)
        .set({
          code: input.code,
          name: input.name,
          description: input.description || null,
          level: input.level,
          canApprove: input.canApprove ? 1 : 0,
          approvalLimit: input.approvalLimit ? String(input.approvalLimit) : null,
        })
        .where(eq(positions.id, input.id));
      return { success: true };
    }),

  // ===== EMPLOYEE PROFILES =====
  listEmployeeProfiles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(employeeProfiles);
  }),

  getEmployeeProfile: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [profile] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, input.userId));
      return profile || null;
    }),

  upsertEmployeeProfile: protectedProcedure
    .input(z.object({
      userId: z.number(),
      userType: z.enum(["manus", "local"]),
      employeeCode: z.string().optional(),
      companyId: z.number().optional(),
      departmentId: z.number().optional(),
      teamId: z.number().optional(),
      positionId: z.number().optional(),
      managerId: z.number().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Check if profile exists
      const [existing] = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, input.userId));
      
      if (existing) {
        await db.update(employeeProfiles)
          .set({
            userType: input.userType,
            employeeCode: input.employeeCode || null,
            companyId: input.companyId || null,
            departmentId: input.departmentId || null,
            teamId: input.teamId || null,
            positionId: input.positionId || null,
            managerId: input.managerId || null,
            phone: input.phone || null,
            address: input.address || null,
          })
          .where(eq(employeeProfiles.id, existing.id));
        return { id: existing.id };
      } else {
        const [result] = await db.insert(employeeProfiles).values({
          userId: input.userId,
          userType: input.userType,
          employeeCode: input.employeeCode || null,
          companyId: input.companyId || null,
          departmentId: input.departmentId || null,
          teamId: input.teamId || null,
          positionId: input.positionId || null,
          managerId: input.managerId || null,
          phone: input.phone || null,
          address: input.address || null,
        });
        return { id: result.insertId };
      }
    }),
});
