import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { smsConfigs, smsLogs } from "../../drizzle/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

export const smsRouter = router({
  // Get SMS config
  getConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {
      provider: "twilio" as const,
      enabled: false,
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioFromNumber: "",
      vonageApiKey: "",
      vonageApiSecret: "",
      vonageFromNumber: "",
      customWebhookUrl: "",
      customWebhookMethod: "POST" as const,
      customWebhookHeaders: "",
      customWebhookBodyTemplate: "",
    };
    
    const configs = await db.select().from(smsConfigs).limit(1);
    
    if (configs.length === 0) {
      return {
        provider: "twilio" as const,
        enabled: false,
        twilioAccountSid: "",
        twilioAuthToken: "",
        twilioFromNumber: "",
        vonageApiKey: "",
        vonageApiSecret: "",
        vonageFromNumber: "",
        customWebhookUrl: "",
        customWebhookMethod: "POST" as const,
        customWebhookHeaders: "",
        customWebhookBodyTemplate: "",
      };
    }
    
    const config = configs[0];
    return {
      provider: config.provider as "twilio" | "vonage" | "custom",
      enabled: config.enabled,
      twilioAccountSid: config.twilioAccountSid || "",
      twilioAuthToken: config.twilioAuthToken || "",
      twilioFromNumber: config.twilioFromNumber || "",
      vonageApiKey: config.vonageApiKey || "",
      vonageApiSecret: config.vonageApiSecret || "",
      vonageFromNumber: config.vonageFromNumber || "",
      customWebhookUrl: config.customWebhookUrl || "",
      customWebhookMethod: (config.customWebhookMethod || "POST") as "POST" | "GET",
      customWebhookHeaders: config.customWebhookHeaders || "",
      customWebhookBodyTemplate: config.customWebhookBodyTemplate || "",
    };
  }),

  // Save SMS config
  saveConfig: protectedProcedure
    .input(z.object({
      provider: z.enum(["twilio", "vonage", "custom"]),
      enabled: z.boolean(),
      twilioAccountSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioFromNumber: z.string().optional(),
      vonageApiKey: z.string().optional(),
      vonageApiSecret: z.string().optional(),
      vonageFromNumber: z.string().optional(),
      customWebhookUrl: z.string().optional(),
      customWebhookMethod: z.enum(["POST", "GET"]).optional(),
      customWebhookHeaders: z.string().optional(),
      customWebhookBodyTemplate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      const existing = await db.select().from(smsConfigs).limit(1);
      
      const data = {
        provider: input.provider,
        enabled: input.enabled,
        twilioAccountSid: input.twilioAccountSid || null,
        twilioAuthToken: input.twilioAuthToken || null,
        twilioFromNumber: input.twilioFromNumber || null,
        vonageApiKey: input.vonageApiKey || null,
        vonageApiSecret: input.vonageApiSecret || null,
        vonageFromNumber: input.vonageFromNumber || null,
        customWebhookUrl: input.customWebhookUrl || null,
        customWebhookMethod: input.customWebhookMethod || "POST",
        customWebhookHeaders: input.customWebhookHeaders || null,
        customWebhookBodyTemplate: input.customWebhookBodyTemplate || null,
        updatedAt: Date.now(),
      };
      
      if (existing.length > 0) {
        await db.update(smsConfigs).set(data).where(eq(smsConfigs.id, existing[0].id));
      } else {
        await db.insert(smsConfigs).values({
          ...data,
          createdAt: Date.now(),
        });
      }
      
      return { success: true };
    }),

  // Get SMS stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, sent: 0, failed: 0, today: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const [totalResult, sentResult, failedResult, todayResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(smsLogs),
      db.select({ count: sql<number>`count(*)` }).from(smsLogs).where(eq(smsLogs.status, "sent")),
      db.select({ count: sql<number>`count(*)` }).from(smsLogs).where(eq(smsLogs.status, "failed")),
      db.select({ count: sql<number>`count(*)` }).from(smsLogs).where(gte(smsLogs.createdAt, todayTimestamp)),
    ]);
    
    return {
      total: Number(totalResult[0]?.count || 0),
      sent: Number(sentResult[0]?.count || 0),
      failed: Number(failedResult[0]?.count || 0),
      today: Number(todayResult[0]?.count || 0),
    };
  }),

  // Get SMS logs
  getLogs: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0, page: input.page, pageSize: input.pageSize };
      
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      
      const [logs, totalResult] = await Promise.all([
        db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt)).limit(pageSize).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(smsLogs),
      ]);
      
      return {
        logs,
        total: Number(totalResult[0]?.count || 0),
        page,
        pageSize,
      };
    }),

  // Test SMS
  testSms: protectedProcedure
    .input(z.object({
      phoneNumber: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available" };
      
      const configs = await db.select().from(smsConfigs).limit(1);
      
      if (configs.length === 0 || !configs[0].enabled) {
        return { success: false, error: "SMS chưa được cấu hình hoặc đang tắt" };
      }
      
      const config = configs[0];
      const message = input.message || "Đây là tin nhắn test từ hệ thống CPK/SPC";
      
      try {
        let result: { success: boolean; messageId?: string; error?: string };
        
        if (config.provider === "twilio") {
          result = await sendTwilioSms(config, input.phoneNumber, message);
        } else if (config.provider === "vonage") {
          result = await sendVonageSms(config, input.phoneNumber, message);
        } else {
          result = await sendCustomWebhookSms(config, input.phoneNumber, message);
        }
        
        // Log the SMS
        await db.insert(smsLogs).values({
          provider: config.provider,
          toNumber: input.phoneNumber,
          message,
          status: result.success ? "sent" : "failed",
          messageId: result.messageId || null,
          errorMessage: result.error || null,
          createdAt: Date.now(),
        });
        
        return result;
      } catch (error: any) {
        await db.insert(smsLogs).values({
          provider: config.provider,
          toNumber: input.phoneNumber,
          message,
          status: "failed",
          errorMessage: error.message,
          createdAt: Date.now(),
        });
        
        return { success: false, error: error.message };
      }
    }),
});

// Helper functions for sending SMS
async function sendTwilioSms(config: any, to: string, message: string) {
  const accountSid = config.twilioAccountSid;
  const authToken = config.twilioAuthToken;
  const from = config.twilioFromNumber;
  
  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Thiếu thông tin cấu hình Twilio" };
  }
  
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message,
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, messageId: data.sid };
    } else {
      return { success: false, error: data.message || "Lỗi gửi SMS qua Twilio" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendVonageSms(config: any, to: string, message: string) {
  const apiKey = config.vonageApiKey;
  const apiSecret = config.vonageApiSecret;
  const from = config.vonageFromNumber;
  
  if (!apiKey || !apiSecret || !from) {
    return { success: false, error: "Thiếu thông tin cấu hình Vonage" };
  }
  
  try {
    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        to,
        from,
        text: message,
      }),
    });
    
    const data = await response.json();
    
    if (data.messages && data.messages[0]?.status === "0") {
      return { success: true, messageId: data.messages[0]["message-id"] };
    } else {
      return { success: false, error: data.messages?.[0]?.["error-text"] || "Lỗi gửi SMS qua Vonage" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendCustomWebhookSms(config: any, to: string, message: string) {
  const url = config.customWebhookUrl;
  const method = config.customWebhookMethod || "POST";
  
  if (!url) {
    return { success: false, error: "Thiếu URL webhook" };
  }
  
  try {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    
    if (config.customWebhookHeaders) {
      try {
        headers = { ...headers, ...JSON.parse(config.customWebhookHeaders) };
      } catch (e) {
        // Ignore invalid JSON
      }
    }
    
    let body = JSON.stringify({ to, message, timestamp: new Date().toISOString() });
    
    if (config.customWebhookBodyTemplate) {
      try {
        body = config.customWebhookBodyTemplate
          .replace(/\{\{to\}\}/g, to)
          .replace(/\{\{message\}\}/g, message)
          .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
      } catch (e) {
        // Use default body
      }
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? body : undefined,
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
