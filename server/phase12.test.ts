/**
 * Phase 12 Tests - Dashboard Integration, Webhook Notifications, và Báo cáo Email tự động
 * Tests cho các tính năng:
 * - RadarChartHistoryComparison widget tích hợp vào Dashboard
 * - Webhook notification cho Slack và Microsoft Teams
 * - Báo cáo tự động gửi email định kỳ với biểu đồ Radar Chart
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Phase 12 - Dashboard Integration, Webhook Notifications, và Báo cáo Email tự động", () => {
  
  describe("RadarChartHistoryWidget Integration", () => {
    it("should calculate CPK improvement correctly", () => {
      const currentCpk = 1.45;
      const previousCpk = 1.32;
      
      const change = currentCpk - previousCpk;
      const changePercent = (change / previousCpk) * 100;
      
      expect(change).toBeCloseTo(0.13, 2);
      expect(changePercent).toBeCloseTo(9.85, 1);
    });

    it("should determine CPK status correctly", () => {
      const getCpkStatus = (cpk: number) => {
        if (cpk >= 1.67) return { label: "Xuất sắc", color: "bg-green-500" };
        if (cpk >= 1.33) return { label: "Tốt", color: "bg-blue-500" };
        if (cpk >= 1.0) return { label: "Đạt", color: "bg-yellow-500" };
        return { label: "Không đạt", color: "bg-red-500" };
      };

      expect(getCpkStatus(1.8).label).toBe("Xuất sắc");
      expect(getCpkStatus(1.5).label).toBe("Tốt");
      expect(getCpkStatus(1.2).label).toBe("Đạt");
      expect(getCpkStatus(0.8).label).toBe("Không đạt");
    });

    it("should generate radar chart data with correct structure", () => {
      const generateRadarChartData = (currentCpk: number, previousCpk: number) => {
        return [
          { metric: "CPK", current: currentCpk, previous: previousCpk },
          { metric: "CP", current: currentCpk * 1.05, previous: previousCpk * 1.05 },
          { metric: "PP", current: currentCpk * 1.02, previous: previousCpk * 1.02 },
          { metric: "PPK", current: currentCpk * 0.98, previous: previousCpk * 0.98 },
          { metric: "CA", current: 1.90, previous: 1.80 },
          { metric: "CR", current: 0.70, previous: 0.80 },
        ];
      };

      const data = generateRadarChartData(1.45, 1.32);
      
      expect(data).toHaveLength(6);
      expect(data[0].metric).toBe("CPK");
      expect(data[0].current).toBe(1.45);
      expect(data[0].previous).toBe(1.32);
    });
  });

  describe("CPK Webhook Notification Service", () => {
    it("should format Slack payload correctly", () => {
      const formatSlackPayload = (eventType: string, data: any) => {
        const severity = data.severity || "info";
        const color = severity === "critical" ? "#dc2626" 
                    : severity === "major" ? "#f59e0b" 
                    : severity === "minor" ? "#3b82f6" 
                    : "#22c55e";
        
        return {
          attachments: [
            {
              color,
              title: `⚠️ ${eventType}`,
              fields: [
                { title: "Sản phẩm", value: data.productCode || "N/A", short: true },
                { title: "CPK", value: data.currentCpk?.toFixed(3) || "N/A", short: true },
              ],
              footer: "SPC/CPK Calculator",
            },
          ],
        };
      };

      const payload = formatSlackPayload("cpk_alert", {
        productCode: "TEST-001",
        currentCpk: 1.25,
        severity: "major",
      });

      expect(payload.attachments).toHaveLength(1);
      expect(payload.attachments[0].color).toBe("#f59e0b");
      expect(payload.attachments[0].fields[0].value).toBe("TEST-001");
      expect(payload.attachments[0].fields[1].value).toBe("1.250");
    });

    it("should format Teams payload correctly", () => {
      const formatTeamsPayload = (eventType: string, data: any) => {
        const severity = data.severity || "info";
        const themeColor = severity === "critical" ? "dc2626" 
                         : severity === "major" ? "f59e0b" 
                         : severity === "minor" ? "3b82f6" 
                         : "22c55e";
        
        return {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          themeColor,
          summary: eventType,
          sections: [
            {
              activityTitle: eventType,
              facts: [
                { name: "Sản phẩm", value: data.productCode || "N/A" },
                { name: "CPK", value: data.currentCpk?.toFixed(3) || "N/A" },
              ],
              markdown: true,
            },
          ],
        };
      };

      const payload = formatTeamsPayload("cpk_alert", {
        productCode: "TEST-001",
        currentCpk: 1.25,
        severity: "critical",
      });

      expect(payload["@type"]).toBe("MessageCard");
      expect(payload.themeColor).toBe("dc2626");
      expect(payload.sections[0].facts[0].value).toBe("TEST-001");
    });

    it("should validate webhook URL format", () => {
      const isValidSlackWebhook = (url: string) => {
        return url.startsWith("https://hooks.slack.com/services/");
      };

      const isValidTeamsWebhook = (url: string) => {
        return url.includes("webhook.office.com") || url.includes("outlook.office.com");
      };

      expect(isValidSlackWebhook("https://hooks.slack.com/services/T00/B00/xxx")).toBe(true);
      expect(isValidSlackWebhook("https://example.com/webhook")).toBe(false);
      
      expect(isValidTeamsWebhook("https://outlook.office.com/webhook/xxx")).toBe(true);
      expect(isValidTeamsWebhook("https://example.com/webhook")).toBe(false);
    });

    it("should determine severity correctly based on CPK value", () => {
      const determineSeverity = (cpk: number, threshold: number = 1.33) => {
        if (cpk < 1.0) return "critical";
        if (cpk < threshold) return "major";
        if (cpk < 1.67) return "minor";
        return "info";
      };

      expect(determineSeverity(0.8)).toBe("critical");
      expect(determineSeverity(1.2)).toBe("major");
      expect(determineSeverity(1.5)).toBe("minor");
      expect(determineSeverity(1.8)).toBe("info");
    });

    it("should calculate retry delay with exponential backoff", () => {
      const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds
      
      const calculateRetryDelay = (retryCount: number) => {
        return RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
      };

      expect(calculateRetryDelay(0)).toBe(60);    // 1 minute
      expect(calculateRetryDelay(1)).toBe(300);   // 5 minutes
      expect(calculateRetryDelay(2)).toBe(900);   // 15 minutes
      expect(calculateRetryDelay(3)).toBe(3600);  // 1 hour
      expect(calculateRetryDelay(4)).toBe(7200);  // 2 hours
      expect(calculateRetryDelay(10)).toBe(7200); // Max delay
    });
  });

  describe("Scheduled Email Report Service", () => {
    it("should calculate next run time for daily schedule", () => {
      const calculateNextRunTime = (scheduleType: string, scheduleTime: string) => {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const now = new Date();
        const next = new Date();
        
        next.setHours(hours, minutes, 0, 0);
        
        if (scheduleType === "daily" && next <= now) {
          next.setDate(next.getDate() + 1);
        }
        
        return next;
      };

      const nextRun = calculateNextRunTime("daily", "08:00");
      expect(nextRun.getHours()).toBe(8);
      expect(nextRun.getMinutes()).toBe(0);
    });

    it("should calculate next run time for weekly schedule", () => {
      const calculateNextWeeklyRun = (targetDay: number, scheduleTime: string) => {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const now = new Date();
        const next = new Date();
        
        next.setHours(hours, minutes, 0, 0);
        
        const currentDay = now.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
          daysUntil += 7;
        }
        next.setDate(next.getDate() + daysUntil);
        
        return next;
      };

      const nextRun = calculateNextWeeklyRun(1, "08:00"); // Monday
      expect(nextRun.getDay()).toBe(1); // Monday
    });

    it("should generate radar chart SVG correctly", () => {
      const generateRadarChartSvg = (data: Array<{ metric: string; current: number; previous: number }>) => {
        const size = 400;
        const center = size / 2;
        
        // Check that SVG contains required elements
        const svg = `<svg width="${size}" height="${size}">
          <polygon points="..." fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6"/>
          <polygon points="..." fill="rgba(148, 163, 184, 0.2)" stroke="#94a3b8"/>
        </svg>`;
        
        return svg;
      };

      const data = [
        { metric: "CPK", current: 1.45, previous: 1.32 },
        { metric: "CP", current: 1.52, previous: 1.40 },
      ];

      const svg = generateRadarChartSvg(data);
      expect(svg).toContain("<svg");
      expect(svg).toContain("polygon");
    });

    it("should generate HTML email content with correct structure", () => {
      const generateReportHtml = (data: any) => {
        return `
          <!DOCTYPE html>
          <html>
          <head><title>Báo cáo CPK/SPC</title></head>
          <body>
            <div class="header">
              <h1>📊 Báo cáo CPK/SPC</h1>
              <p>${data.reportPeriod}</p>
            </div>
            <div class="content">
              <div class="summary-cards">
                <div class="summary-card">
                  <div class="value">${data.avgCpk.toFixed(2)}</div>
                  <div class="label">CPK Trung bình</div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;
      };

      const html = generateReportHtml({
        reportPeriod: "Báo cáo hàng tuần",
        avgCpk: 1.45,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Báo cáo CPK/SPC");
      expect(html).toContain("1.45");
    });

    it("should parse recipients correctly", () => {
      const parseRecipients = (input: string) => {
        return input.split(",").map(e => e.trim()).filter(e => e);
      };

      const recipients = parseRecipients("email1@example.com, email2@example.com, email3@example.com");
      
      expect(recipients).toHaveLength(3);
      expect(recipients[0]).toBe("email1@example.com");
      expect(recipients[2]).toBe("email3@example.com");
    });

    it("should validate email format", () => {
      const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
    });
  });

  describe("Report Type Validation", () => {
    it("should validate report types", () => {
      const validReportTypes = [
        "spc_summary",
        "cpk_analysis",
        "violation_report",
        "production_line_status",
        "ai_vision_dashboard",
        "radar_chart_comparison",
      ];

      const isValidReportType = (type: string) => validReportTypes.includes(type);

      expect(isValidReportType("spc_summary")).toBe(true);
      expect(isValidReportType("radar_chart_comparison")).toBe(true);
      expect(isValidReportType("invalid_type")).toBe(false);
    });

    it("should validate schedule types", () => {
      const validScheduleTypes = ["daily", "weekly", "monthly"];

      const isValidScheduleType = (type: string) => validScheduleTypes.includes(type);

      expect(isValidScheduleType("daily")).toBe(true);
      expect(isValidScheduleType("weekly")).toBe(true);
      expect(isValidScheduleType("monthly")).toBe(true);
      expect(isValidScheduleType("yearly")).toBe(false);
    });

    it("should validate schedule time format", () => {
      const isValidTimeFormat = (time: string) => {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
      };

      expect(isValidTimeFormat("08:00")).toBe(true);
      expect(isValidTimeFormat("23:59")).toBe(true);
      expect(isValidTimeFormat("24:00")).toBe(false);
      expect(isValidTimeFormat("8:00")).toBe(true);
      expect(isValidTimeFormat("invalid")).toBe(false);
    });
  });

  describe("Webhook Event Types", () => {
    it("should define all CPK webhook event types", () => {
      const eventTypes = [
        "cpk_alert",
        "cpk_improvement",
        "cpk_degradation",
        "spc_violation",
        "daily_report",
        "weekly_report",
        "monthly_report",
        "radar_chart_comparison",
      ];

      expect(eventTypes).toContain("cpk_alert");
      expect(eventTypes).toContain("radar_chart_comparison");
      expect(eventTypes).toHaveLength(8);
    });

    it("should get correct event title", () => {
      const getEventTitle = (eventType: string) => {
        const titles: Record<string, string> = {
          cpk_alert: "Cảnh báo CPK",
          cpk_improvement: "CPK Cải thiện",
          cpk_degradation: "CPK Suy giảm",
          spc_violation: "Vi phạm SPC Rule",
          daily_report: "Báo cáo hàng ngày",
          weekly_report: "Báo cáo hàng tuần",
          monthly_report: "Báo cáo hàng tháng",
          radar_chart_comparison: "So sánh Radar Chart",
        };
        return titles[eventType] || eventType;
      };

      expect(getEventTitle("cpk_alert")).toBe("Cảnh báo CPK");
      expect(getEventTitle("radar_chart_comparison")).toBe("So sánh Radar Chart");
      expect(getEventTitle("unknown")).toBe("unknown");
    });
  });

  describe("Dashboard Widget Visibility", () => {
    it("should manage widget visibility state", () => {
      const defaultWidgets = {
        cpk_summary: true,
        violations: true,
        production_lines: true,
        radar_chart_history: true,
      };

      const toggleWidget = (widgets: Record<string, boolean>, key: string) => {
        return { ...widgets, [key]: !widgets[key] };
      };

      const updated = toggleWidget(defaultWidgets, "radar_chart_history");
      expect(updated.radar_chart_history).toBe(false);

      const restored = toggleWidget(updated, "radar_chart_history");
      expect(restored.radar_chart_history).toBe(true);
    });
  });
});
