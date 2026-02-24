/**
 * CPK History Router
 * API lấy dữ liệu lịch sử CPK để so sánh theo thời gian
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { shiftReports, productionLines } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, isNotNull } from "drizzle-orm";
import { subDays, subMonths, subYears, format } from "date-fns";

export const cpkHistoryRouter = router({
  // Get historical CPK trend data
  getHistoricalTrend: protectedProcedure
    .input(z.object({
      planId: z.number().optional(),
      productionLineId: z.number().optional(),
      timeRange: z.enum(["7days", "30days", "90days", "1year"]).default("30days"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (input.timeRange) {
        case "7days":
          startDate = subDays(now, 7);
          break;
        case "30days":
          startDate = subDays(now, 30);
          break;
        case "90days":
          startDate = subDays(now, 90);
          break;
        case "1year":
          startDate = subYears(now, 1);
          break;
        default:
          startDate = subDays(now, 30);
      }

      try {
        // Build query conditions
        const conditions = [];
        conditions.push(gte(shiftReports.shiftDate, format(startDate, "yyyy-MM-dd HH:mm:ss")));
        conditions.push(lte(shiftReports.shiftDate, format(now, "yyyy-MM-dd HH:mm:ss")));
        conditions.push(isNotNull(shiftReports.cpk));
        
        if (input.productionLineId) {
          conditions.push(eq(shiftReports.productionLineId, input.productionLineId));
        }

        // Get CPK data grouped by date - use raw SQL to avoid GROUP BY issues
        const dateExpr = sql`DATE(${shiftReports.shiftDate})`;
        const results = await db
          .select({
            date: dateExpr.as("date"),
            avgCpk: sql<number>`AVG(${shiftReports.cpk})`.as("avgCpk"),
            avgOee: sql<number>`AVG(${shiftReports.oee})`.as("avgOee"),
            avgQuality: sql<number>`AVG(${shiftReports.quality})`.as("avgQuality"),
            minCpk: sql<number>`MIN(${shiftReports.cpk})`.as("minCpk"),
            maxCpk: sql<number>`MAX(${shiftReports.cpk})`.as("maxCpk"),
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(shiftReports)
          .where(and(...conditions))
          .groupBy(dateExpr)
          .orderBy(dateExpr);

        return results.map(r => ({
          date: r.date,
          cpk: Number(r.avgCpk) || 0,
          cp: Number(r.avgCpk) * 1.05 || 0, // Estimate CP from CPK
          pp: Number(r.avgCpk) * 1.02 || 0, // Estimate PP
          ppk: Number(r.avgCpk) * 0.98 || 0, // Estimate PPK
          minCpk: Number(r.minCpk) || 0,
          maxCpk: Number(r.maxCpk) || 0,
          count: Number(r.count) || 0,
          // Calculate CA and CR from quality metrics
          ca: Number(r.avgQuality) / 100 || 0.95,
          cr: 1 - (Number(r.avgOee) / 100) || 0.35,
        }));
      } catch (error) {
        console.error("[CPKHistory] Error fetching historical trend:", error);
        return [];
      }
    }),

  // Get comparison data for specific dates
  getComparisonByDates: protectedProcedure
    .input(z.object({
      planId: z.number().optional(),
      productionLineId: z.number().optional(),
      dates: z.array(z.string()), // Array of date strings "yyyy-MM-dd"
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const results = [];

        for (const dateStr of input.dates) {
          const conditions = [];
          conditions.push(sql`DATE(${shiftReports.shiftDate}) = ${dateStr}`);
          conditions.push(isNotNull(shiftReports.cpk));
          
          if (input.productionLineId) {
            conditions.push(eq(shiftReports.productionLineId, input.productionLineId));
          }

          const [dayData] = await db
            .select({
              avgCpk: sql<number>`AVG(${shiftReports.cpk})`.as("avgCpk"),
              avgOee: sql<number>`AVG(${shiftReports.oee})`.as("avgOee"),
              avgQuality: sql<number>`AVG(${shiftReports.quality})`.as("avgQuality"),
              count: sql<number>`COUNT(*)`.as("count"),
            })
            .from(shiftReports)
            .where(and(...conditions));

          if (dayData && Number(dayData.count) > 0) {
            const cpk = Number(dayData.avgCpk) || 0;
            results.push({
              date: dateStr,
              cpk,
              cp: cpk * 1.05,
              pp: cpk * 1.02,
              ppk: cpk * 0.98,
              count: Number(dayData.count) || 0,
              ca: Number(dayData.avgQuality) / 100 || 0.95,
              cr: 1 - (Number(dayData.avgOee) / 100) || 0.35,
            });
          }
        }

        return results;
      } catch (error) {
        console.error("[CPKHistory] Error fetching comparison data:", error);
        return [];
      }
    }),

  // Get improvement summary
  getImprovementSummary: protectedProcedure
    .input(z.object({
      planId: z.number().optional(),
      productionLineId: z.number().optional(),
      timeRange: z.enum(["7days", "30days", "90days", "1year"]).default("30days"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      let startDate: Date;
      let midDate: Date;
      
      switch (input.timeRange) {
        case "7days":
          startDate = subDays(now, 7);
          midDate = subDays(now, 3);
          break;
        case "30days":
          startDate = subDays(now, 30);
          midDate = subDays(now, 15);
          break;
        case "90days":
          startDate = subDays(now, 90);
          midDate = subDays(now, 45);
          break;
        case "1year":
          startDate = subYears(now, 1);
          midDate = subMonths(now, 6);
          break;
        default:
          startDate = subDays(now, 30);
          midDate = subDays(now, 15);
      }

      try {
        // Get average CPK for first half of period
        const firstHalfConditions = [];
        firstHalfConditions.push(gte(shiftReports.shiftDate, format(startDate, "yyyy-MM-dd HH:mm:ss")));
        firstHalfConditions.push(lte(shiftReports.shiftDate, format(midDate, "yyyy-MM-dd HH:mm:ss")));
        firstHalfConditions.push(isNotNull(shiftReports.cpk));
        if (input.productionLineId) firstHalfConditions.push(eq(shiftReports.productionLineId, input.productionLineId));

        const [firstHalf] = await db
          .select({
            avgCpk: sql<number>`AVG(${shiftReports.cpk})`.as("avgCpk"),
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(shiftReports)
          .where(and(...firstHalfConditions));

        // Get average CPK for second half of period
        const secondHalfConditions = [];
        secondHalfConditions.push(gte(shiftReports.shiftDate, format(midDate, "yyyy-MM-dd HH:mm:ss")));
        secondHalfConditions.push(lte(shiftReports.shiftDate, format(now, "yyyy-MM-dd HH:mm:ss")));
        secondHalfConditions.push(isNotNull(shiftReports.cpk));
        if (input.productionLineId) secondHalfConditions.push(eq(shiftReports.productionLineId, input.productionLineId));

        const [secondHalf] = await db
          .select({
            avgCpk: sql<number>`AVG(${shiftReports.cpk})`.as("avgCpk"),
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(shiftReports)
          .where(and(...secondHalfConditions));

        const firstCpk = Number(firstHalf?.avgCpk) || 0;
        const secondCpk = Number(secondHalf?.avgCpk) || 0;
        const change = secondCpk - firstCpk;
        const changePercent = firstCpk > 0 ? (change / firstCpk) * 100 : 0;

        return {
          firstPeriodCpk: firstCpk,
          secondPeriodCpk: secondCpk,
          change,
          changePercent,
          improved: change > 0,
          firstPeriodCount: Number(firstHalf?.count) || 0,
          secondPeriodCount: Number(secondHalf?.count) || 0,
          startDate: format(startDate, "yyyy-MM-dd"),
          midDate: format(midDate, "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      } catch (error) {
        console.error("[CPKHistory] Error fetching improvement summary:", error);
        return null;
      }
    }),
});
