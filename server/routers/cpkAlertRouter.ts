/**
 * CPK Alert Router - API endpoints cho quản lý cảnh báo CPK
 */
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { spcAnalysisHistory } from '../../drizzle/schema';
import { desc, eq, and, gte, lte, like, sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';

export const cpkAlertRouter = router({
  // List all thresholds
  listThresholds: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      productCode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return {
        items: [],
        total: 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // Get single threshold
  getThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return null;
    }),

  // Create threshold
  createThreshold: adminProcedure
    .input(z.object({
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      warningThreshold: z.number().default(1.33),
      criticalThreshold: z.number().default(1.0),
      excellentThreshold: z.number().default(1.67),
      enableTelegram: z.boolean().default(false),
      enableEmail: z.boolean().default(false),
      enableWebhook: z.boolean().default(false),
      webhookUrl: z.string().optional(),
      emailRecipients: z.string().optional(),
      telegramChatId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return { id: 1, ...input };
    }),

  // Update threshold
  updateThreshold: adminProcedure
    .input(z.object({
      id: z.number(),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      warningThreshold: z.number().optional(),
      criticalThreshold: z.number().optional(),
      excellentThreshold: z.number().optional(),
      enableTelegram: z.boolean().optional(),
      enableEmail: z.boolean().optional(),
      enableWebhook: z.boolean().optional(),
      webhookUrl: z.string().optional(),
      emailRecipients: z.string().optional(),
      telegramChatId: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  // Delete threshold
  deleteThreshold: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  // List alert history with filters
  listAlertHistory: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      alertType: z.enum(['warning', 'critical', 'excellent']).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize };

      const conditions = [];
      if (input.productCode) {
        conditions.push(eq(spcAnalysisHistory.productCode, input.productCode));
      }
      if (input.stationName) {
        conditions.push(eq(spcAnalysisHistory.stationName, input.stationName));
      }
      if (input.startDate) {
        conditions.push(gte(spcAnalysisHistory.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(spcAnalysisHistory.createdAt, input.endDate));
      }
      if (input.search) {
        conditions.push(like(spcAnalysisHistory.productCode, `%${input.search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.select()
          .from(spcAnalysisHistory)
          .where(whereClause)
          .orderBy(desc(spcAnalysisHistory.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(spcAnalysisHistory)
          .where(whereClause),
      ]);

      const processedItems = items.map(item => {
        const cpkValue = (item.cpk || 0) / 1000;
        let alertType = 'normal';
        if (cpkValue < 1.0) alertType = 'critical';
        else if (cpkValue < 1.33) alertType = 'warning';
        else if (cpkValue >= 1.67) alertType = 'excellent';

        return {
          id: item.id,
          productCode: item.productCode,
          stationName: item.stationName,
          cpkValue,
          alertType,
          mean: (item.mean || 0) / 1000,
          stdDev: (item.stdDev || 0) / 1000,
          sampleCount: item.sampleCount || 0,
          createdAt: item.createdAt,
        };
      });

      // Filter by alertType if specified
      const filteredItems = input.alertType
        ? processedItems.filter(item => item.alertType === input.alertType)
        : processedItems;

      return {
        items: filteredItems,
        total: Number(countResult[0]?.count || 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // Get alert history stats
  getAlertHistoryStats: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalAlerts: 0, criticalCount: 0, warningCount: 0, excellentCount: 0, normalCount: 0, avgCpk: 0 };

      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(spcAnalysisHistory.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(spcAnalysisHistory.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select({
        cpk: spcAnalysisHistory.cpk,
      }).from(spcAnalysisHistory).where(whereClause);

      let criticalCount = 0;
      let warningCount = 0;
      let excellentCount = 0;
      let normalCount = 0;
      let totalCpk = 0;

      items.forEach(item => {
        const cpkValue = (item.cpk || 0) / 1000;
        totalCpk += cpkValue;
        if (cpkValue < 1.0) criticalCount++;
        else if (cpkValue < 1.33) warningCount++;
        else if (cpkValue >= 1.67) excellentCount++;
        else normalCount++;
      });

      return {
        totalAlerts: items.length,
        criticalCount,
        warningCount,
        excellentCount,
        normalCount,
        avgCpk: items.length > 0 ? totalCpk / items.length : 0,
      };
    }),

  // Export alert history to Excel
  exportAlertHistoryExcel: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      alertType: z.enum(['warning', 'critical', 'excellent']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [];
      if (input.productCode) {
        conditions.push(eq(spcAnalysisHistory.productCode, input.productCode));
      }
      if (input.stationName) {
        conditions.push(eq(spcAnalysisHistory.stationName, input.stationName));
      }
      if (input.startDate) {
        conditions.push(gte(spcAnalysisHistory.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(spcAnalysisHistory.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select()
        .from(spcAnalysisHistory)
        .where(whereClause)
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(10000);

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('CPK Alert History');

      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Thời gian', key: 'createdAt', width: 20 },
        { header: 'Mã sản phẩm', key: 'productCode', width: 15 },
        { header: 'Công trạm', key: 'stationName', width: 15 },
        { header: 'CPK', key: 'cpk', width: 12 },
        { header: 'Trạng thái', key: 'alertType', width: 15 },
        { header: 'Mean', key: 'mean', width: 12 },
        { header: 'Std Dev', key: 'stdDev', width: 12 },
        { header: 'Số mẫu', key: 'sampleCount', width: 10 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      // Add data rows
      let criticalCount = 0;
      let warningCount = 0;
      let excellentCount = 0;

      items.forEach(item => {
        const cpkValue = (item.cpk || 0) / 1000;
        let alertType = 'Bình thường';
        let alertColor = 'FF70AD47'; // Green

        if (cpkValue < 1.0) {
          alertType = 'Nghiêm trọng';
          alertColor = 'FFFF0000'; // Red
          criticalCount++;
        } else if (cpkValue < 1.33) {
          alertType = 'Cảnh báo';
          alertColor = 'FFFFC000'; // Yellow
          warningCount++;
        } else if (cpkValue >= 1.67) {
          alertType = 'Xuất sắc';
          alertColor = 'FF00B050'; // Green
          excellentCount++;
        }

        // Filter by alertType if specified
        if (input.alertType) {
          if (input.alertType === 'critical' && cpkValue >= 1.0) return;
          if (input.alertType === 'warning' && (cpkValue < 1.0 || cpkValue >= 1.33)) return;
          if (input.alertType === 'excellent' && cpkValue < 1.67) return;
        }

        const row = worksheet.addRow({
          id: item.id,
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
          productCode: item.productCode,
          stationName: item.stationName,
          cpk: cpkValue.toFixed(3),
          alertType,
          mean: ((item.mean || 0) / 1000).toFixed(3),
          stdDev: ((item.stdDev || 0) / 1000).toFixed(3),
          sampleCount: item.sampleCount || 0,
        });

        // Color the alert type cell
        row.getCell('alertType').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: alertColor },
        };
      });

      // Add summary row
      worksheet.addRow({});
      const summaryRow = worksheet.addRow({
        id: '',
        createdAt: 'TỔNG KẾT',
        productCode: `Tổng: ${items.length}`,
        stationName: `Critical: ${criticalCount}`,
        cpk: `Warning: ${warningCount}`,
        alertType: `Excellent: ${excellentCount}`,
      });
      summaryRow.font = { bold: true };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        buffer: Buffer.from(buffer).toString('base64'),
        filename: `cpk_alert_history_${Date.now()}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),
});

export default cpkAlertRouter;
