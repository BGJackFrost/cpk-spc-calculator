import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import {
  getAiReportData,
  generateAiReportHtml,
  generateAiReportExcel,
  generateCpkForecastReport,
  generateCpkForecastExcel,
  getAccuracyMetricsData,
  generateAccuracyMetricsHtml,
  generateAccuracyMetricsExcel,
} from "../../services/aiExportService";
import {
  predictCpkTrend,
  predictOeeTrend,
} from "../../services/aiPredictiveService";
import { storagePut } from "../../storage";
import { nanoid } from "nanoid";

/**
 * AI Export Router - Export AI reports to PDF/Excel
 */
export const aiExportRouter = router({
  // Export AI models report as HTML (for PDF conversion)
  exportModelsReportHtml: protectedProcedure
    .mutation(async () => {
      const data = await getAiReportData();
      const html = await generateAiReportHtml(data);
      
      // Upload to S3
      const fileKey = `ai-reports/models-report-${nanoid(8)}.html`;
      const result = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");
      
      return {
        success: true,
        url: result.url,
        filename: `ai-models-report-${new Date().toISOString().split("T")[0]}.html`,
      };
    }),

  // Export AI models report as Excel
  exportModelsReportExcel: protectedProcedure
    .mutation(async () => {
      const data = await getAiReportData();
      const buffer = await generateAiReportExcel(data);
      
      // Upload to S3
      const fileKey = `ai-reports/models-report-${nanoid(8)}.xlsx`;
      const result = await storagePut(
        fileKey,
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      return {
        success: true,
        url: result.url,
        filename: `ai-models-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  // Export CPK forecast report as HTML
  exportCpkForecastHtml: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const prediction = await predictCpkTrend(input.productCode, input.stationName, input.forecastDays);
      
      const data = {
        productCode: prediction.productCode,
        stationName: prediction.stationName,
        currentCpk: prediction.currentCpk,
        forecastDays: input.forecastDays,
        predictions: prediction.predictions,
        trend: prediction.trend.trend,
        recommendations: prediction.recommendations,
      };
      
      const html = await generateCpkForecastReport(data);
      
      // Upload to S3
      const fileKey = `ai-reports/cpk-forecast-${input.productCode}-${nanoid(8)}.html`;
      const result = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");
      
      return {
        success: true,
        url: result.url,
        filename: `cpk-forecast-${input.productCode}-${new Date().toISOString().split("T")[0]}.html`,
      };
    }),

  // Export CPK forecast report as Excel
  exportCpkForecastExcel: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const prediction = await predictCpkTrend(input.productCode, input.stationName, input.forecastDays);
      
      const data = {
        productCode: prediction.productCode,
        stationName: prediction.stationName,
        currentCpk: prediction.currentCpk,
        forecastDays: input.forecastDays,
        predictions: prediction.predictions,
        trend: prediction.trend.trend,
        recommendations: prediction.recommendations,
      };
      
      const buffer = await generateCpkForecastExcel(data);
      
      // Upload to S3
      const fileKey = `ai-reports/cpk-forecast-${input.productCode}-${nanoid(8)}.xlsx`;
      const result = await storagePut(
        fileKey,
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      return {
        success: true,
        url: result.url,
        filename: `cpk-forecast-${input.productCode}-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  // Export OEE forecast report as Excel
  exportOeeForecastExcel: protectedProcedure
    .input(z.object({
      productionLineId: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const prediction = await predictOeeTrend(input.productionLineId, input.forecastDays);
      
      // Create Excel using ExcelJS
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SPC/CPK Calculator";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("OEE Forecast");
      
      // Header info
      sheet.addRow(["Báo cáo Dự đoán OEE"]);
      sheet.addRow(["Dây chuyền", prediction.productionLineName]);
      sheet.addRow(["OEE hiện tại", `${prediction.currentOee.toFixed(1)}%`]);
      sheet.addRow(["Availability", `${prediction.availability.toFixed(1)}%`]);
      sheet.addRow(["Performance", `${prediction.performance.toFixed(1)}%`]);
      sheet.addRow(["Quality", `${prediction.quality.toFixed(1)}%`]);
      sheet.addRow(["Xu hướng", prediction.trend.trend === "up" ? "Tăng" : prediction.trend.trend === "down" ? "Giảm" : "Ổn định"]);
      sheet.addRow([]);

      // Predictions table
      sheet.addRow(["Ngày", "OEE dự đoán", "Giới hạn dưới", "Giới hạn trên", "Độ tin cậy"]);
      const headerRow = sheet.lastRow;
      if (headerRow) {
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF667EEA" },
        };
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      }

      prediction.predictions.forEach(p => {
        sheet.addRow([
          new Date(p.date).toLocaleDateString("vi-VN"),
          `${p.predictedValue.toFixed(1)}%`,
          `${p.lowerBound.toFixed(1)}%`,
          `${p.upperBound.toFixed(1)}%`,
          `${(p.confidence * 100).toFixed(0)}%`,
        ]);
      });

      // Recommendations
      sheet.addRow([]);
      sheet.addRow(["Khuyến nghị"]);
      prediction.recommendations.forEach(r => {
        sheet.addRow([r]);
      });

      // Set column widths
      sheet.columns = [
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      
      // Upload to S3
      const fileKey = `ai-reports/oee-forecast-${prediction.productionLineName}-${nanoid(8)}.xlsx`;
      const result = await storagePut(
        fileKey,
        Buffer.from(buffer),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      return {
        success: true,
        url: result.url,
        filename: `oee-forecast-${prediction.productionLineName}-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  // Get export history (optional - for tracking)
  getExportHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      // This would typically query from a database table tracking exports
      // For now, return empty array as placeholder
      return {
        exports: [],
        total: 0,
      };
    }),

  // Export accuracy metrics report as HTML (for PDF conversion)
  exportAccuracyMetricsHtml: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .mutation(async ({ input }) => {
      const data = await getAccuracyMetricsData(input?.days || 30);
      const html = await generateAccuracyMetricsHtml(data);
      
      // Upload to S3
      const fileKey = `ai-reports/accuracy-metrics-${nanoid(8)}.html`;
      const result = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");
      
      return {
        success: true,
        url: result.url,
        filename: `accuracy-metrics-${new Date().toISOString().split("T")[0]}.html`,
      };
    }),

  // Export accuracy metrics report as Excel
  exportAccuracyMetricsExcel: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .mutation(async ({ input }) => {
      const data = await getAccuracyMetricsData(input?.days || 30);
      const buffer = await generateAccuracyMetricsExcel(data);
      
      // Upload to S3
      const fileKey = `ai-reports/accuracy-metrics-${nanoid(8)}.xlsx`;
      const result = await storagePut(
        fileKey,
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      return {
        success: true,
        url: result.url,
        filename: `accuracy-metrics-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  // Get accuracy metrics data (for dashboard)
  getAccuracyMetrics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ input }) => {
      return await getAccuracyMetricsData(input?.days || 30);
    }),
});
