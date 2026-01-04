import { getDb } from "../db";
import { escalationTemplates } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export interface EscalationTemplate {
  id: number;
  name: string;
  description?: string | null;
  level1TimeoutMinutes: number;
  level1Emails?: string[] | null;
  level1Webhooks?: number[] | null;
  level1SmsEnabled: boolean;
  level1SmsPhones?: string[] | null;
  level2TimeoutMinutes: number;
  level2Emails?: string[] | null;
  level2Webhooks?: number[] | null;
  level2SmsEnabled: boolean;
  level2SmsPhones?: string[] | null;
  level3TimeoutMinutes: number;
  level3Emails?: string[] | null;
  level3Webhooks?: number[] | null;
  level3SmsEnabled: boolean;
  level3SmsPhones?: string[] | null;
  alertTypes?: string[] | null;
  productionLineIds?: number[] | null;
  machineIds?: number[] | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: number | null;
  createdAt: number;
  updatedAt: number;
}

function parseTemplate(row: any): EscalationTemplate {
  return {
    ...row,
    level1Emails: row.level1Emails ? (typeof row.level1Emails === 'string' ? JSON.parse(row.level1Emails) : row.level1Emails) : null,
    level1Webhooks: row.level1Webhooks ? (typeof row.level1Webhooks === 'string' ? JSON.parse(row.level1Webhooks) : row.level1Webhooks) : null,
    level1SmsPhones: row.level1SmsPhones ? (typeof row.level1SmsPhones === 'string' ? JSON.parse(row.level1SmsPhones) : row.level1SmsPhones) : null,
    level2Emails: row.level2Emails ? (typeof row.level2Emails === 'string' ? JSON.parse(row.level2Emails) : row.level2Emails) : null,
    level2Webhooks: row.level2Webhooks ? (typeof row.level2Webhooks === 'string' ? JSON.parse(row.level2Webhooks) : row.level2Webhooks) : null,
    level2SmsPhones: row.level2SmsPhones ? (typeof row.level2SmsPhones === 'string' ? JSON.parse(row.level2SmsPhones) : row.level2SmsPhones) : null,
    level3Emails: row.level3Emails ? (typeof row.level3Emails === 'string' ? JSON.parse(row.level3Emails) : row.level3Emails) : null,
    level3Webhooks: row.level3Webhooks ? (typeof row.level3Webhooks === 'string' ? JSON.parse(row.level3Webhooks) : row.level3Webhooks) : null,
    level3SmsPhones: row.level3SmsPhones ? (typeof row.level3SmsPhones === 'string' ? JSON.parse(row.level3SmsPhones) : row.level3SmsPhones) : null,
    alertTypes: row.alertTypes ? (typeof row.alertTypes === 'string' ? JSON.parse(row.alertTypes) : row.alertTypes) : null,
    productionLineIds: row.productionLineIds ? (typeof row.productionLineIds === 'string' ? JSON.parse(row.productionLineIds) : row.productionLineIds) : null,
    machineIds: row.machineIds ? (typeof row.machineIds === 'string' ? JSON.parse(row.machineIds) : row.machineIds) : null,
  };
}

export async function createEscalationTemplate(data: Omit<EscalationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  
  if (data.isDefault) {
    await db.update(escalationTemplates).set({ isDefault: false, updatedAt: now }).where(eq(escalationTemplates.isDefault, true));
  }
  
  const result = await db.insert(escalationTemplates).values({
    name: data.name, description: data.description || null,
    level1TimeoutMinutes: data.level1TimeoutMinutes,
    level1Emails: data.level1Emails ? JSON.stringify(data.level1Emails) : null,
    level1Webhooks: data.level1Webhooks ? JSON.stringify(data.level1Webhooks) : null,
    level1SmsEnabled: data.level1SmsEnabled,
    level1SmsPhones: data.level1SmsPhones ? JSON.stringify(data.level1SmsPhones) : null,
    level2TimeoutMinutes: data.level2TimeoutMinutes,
    level2Emails: data.level2Emails ? JSON.stringify(data.level2Emails) : null,
    level2Webhooks: data.level2Webhooks ? JSON.stringify(data.level2Webhooks) : null,
    level2SmsEnabled: data.level2SmsEnabled,
    level2SmsPhones: data.level2SmsPhones ? JSON.stringify(data.level2SmsPhones) : null,
    level3TimeoutMinutes: data.level3TimeoutMinutes,
    level3Emails: data.level3Emails ? JSON.stringify(data.level3Emails) : null,
    level3Webhooks: data.level3Webhooks ? JSON.stringify(data.level3Webhooks) : null,
    level3SmsEnabled: data.level3SmsEnabled,
    level3SmsPhones: data.level3SmsPhones ? JSON.stringify(data.level3SmsPhones) : null,
    alertTypes: data.alertTypes ? JSON.stringify(data.alertTypes) : null,
    productionLineIds: data.productionLineIds ? JSON.stringify(data.productionLineIds) : null,
    machineIds: data.machineIds ? JSON.stringify(data.machineIds) : null,
    isDefault: data.isDefault, isActive: data.isActive, createdBy: data.createdBy || null,
    createdAt: now, updatedAt: now,
  } as any);
  
  return (result as any)[0].insertId;
}

export async function getEscalationTemplates(options?: { activeOnly?: boolean }): Promise<EscalationTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(escalationTemplates);
  if (options?.activeOnly) query = query.where(eq(escalationTemplates.isActive, true)) as any;
  const results = await query.orderBy(desc(escalationTemplates.createdAt));
  return results.map(parseTemplate);
}

export async function getEscalationTemplateById(id: number): Promise<EscalationTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(escalationTemplates).where(eq(escalationTemplates.id, id));
  if (results.length === 0) return null;
  return parseTemplate(results[0]);
}

export async function getDefaultEscalationTemplate(): Promise<EscalationTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(escalationTemplates).where(and(eq(escalationTemplates.isDefault, true), eq(escalationTemplates.isActive, true)));
  if (results.length === 0) return null;
  return parseTemplate(results[0]);
}

export async function updateEscalationTemplate(id: number, data: Partial<EscalationTemplate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  
  if (data.isDefault) {
    await db.update(escalationTemplates).set({ isDefault: false, updatedAt: now }).where(eq(escalationTemplates.isDefault, true));
  }
  
  const updateData: any = { updatedAt: now };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.level1TimeoutMinutes !== undefined) updateData.level1TimeoutMinutes = data.level1TimeoutMinutes;
  if (data.level1Emails !== undefined) updateData.level1Emails = data.level1Emails ? JSON.stringify(data.level1Emails) : null;
  if (data.level1Webhooks !== undefined) updateData.level1Webhooks = data.level1Webhooks ? JSON.stringify(data.level1Webhooks) : null;
  if (data.level1SmsEnabled !== undefined) updateData.level1SmsEnabled = data.level1SmsEnabled;
  if (data.level1SmsPhones !== undefined) updateData.level1SmsPhones = data.level1SmsPhones ? JSON.stringify(data.level1SmsPhones) : null;
  if (data.level2TimeoutMinutes !== undefined) updateData.level2TimeoutMinutes = data.level2TimeoutMinutes;
  if (data.level2Emails !== undefined) updateData.level2Emails = data.level2Emails ? JSON.stringify(data.level2Emails) : null;
  if (data.level2Webhooks !== undefined) updateData.level2Webhooks = data.level2Webhooks ? JSON.stringify(data.level2Webhooks) : null;
  if (data.level2SmsEnabled !== undefined) updateData.level2SmsEnabled = data.level2SmsEnabled;
  if (data.level2SmsPhones !== undefined) updateData.level2SmsPhones = data.level2SmsPhones ? JSON.stringify(data.level2SmsPhones) : null;
  if (data.level3TimeoutMinutes !== undefined) updateData.level3TimeoutMinutes = data.level3TimeoutMinutes;
  if (data.level3Emails !== undefined) updateData.level3Emails = data.level3Emails ? JSON.stringify(data.level3Emails) : null;
  if (data.level3Webhooks !== undefined) updateData.level3Webhooks = data.level3Webhooks ? JSON.stringify(data.level3Webhooks) : null;
  if (data.level3SmsEnabled !== undefined) updateData.level3SmsEnabled = data.level3SmsEnabled;
  if (data.level3SmsPhones !== undefined) updateData.level3SmsPhones = data.level3SmsPhones ? JSON.stringify(data.level3SmsPhones) : null;
  if (data.alertTypes !== undefined) updateData.alertTypes = data.alertTypes ? JSON.stringify(data.alertTypes) : null;
  if (data.productionLineIds !== undefined) updateData.productionLineIds = data.productionLineIds ? JSON.stringify(data.productionLineIds) : null;
  if (data.machineIds !== undefined) updateData.machineIds = data.machineIds ? JSON.stringify(data.machineIds) : null;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await db.update(escalationTemplates).set(updateData).where(eq(escalationTemplates.id, id));
}

export async function deleteEscalationTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(escalationTemplates).where(eq(escalationTemplates.id, id));
}

export function getEscalationLevelConfig(template: EscalationTemplate, level: number) {
  switch (level) {
    case 1: return { timeoutMinutes: template.level1TimeoutMinutes, emails: template.level1Emails || [], webhooks: template.level1Webhooks || [], smsEnabled: template.level1SmsEnabled, smsPhones: template.level1SmsPhones || [] };
    case 2: return { timeoutMinutes: template.level2TimeoutMinutes, emails: template.level2Emails || [], webhooks: template.level2Webhooks || [], smsEnabled: template.level2SmsEnabled, smsPhones: template.level2SmsPhones || [] };
    default: return { timeoutMinutes: template.level3TimeoutMinutes, emails: template.level3Emails || [], webhooks: template.level3Webhooks || [], smsEnabled: template.level3SmsEnabled, smsPhones: template.level3SmsPhones || [] };
  }
}

export async function findMatchingTemplate(alertType: string, productionLineId?: number, machineId?: number): Promise<EscalationTemplate | null> {
  const templates = await getEscalationTemplates({ activeOnly: true });
  for (const template of templates) {
    if (template.alertTypes && template.alertTypes.length > 0 && !template.alertTypes.includes(alertType)) continue;
    if (template.productionLineIds && template.productionLineIds.length > 0 && productionLineId && !template.productionLineIds.includes(productionLineId)) continue;
    if (template.machineIds && template.machineIds.length > 0 && machineId && !template.machineIds.includes(machineId)) continue;
    return template;
  }
  return await getDefaultEscalationTemplate();
}
