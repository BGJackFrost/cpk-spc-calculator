/**
 * Settings Export/Import Service
 * Handles exporting and importing system configuration
 */

import { getDb } from "./db";
import { 
  systemConfig, 
  companyInfo, 
  alertSettings, 
  emailNotificationSettings,
  products,
  productSpecifications,
  productionLines,
  workstations,
  machines,
  machineTypes,
  fixtures,
  processSteps,
  processTemplates,
  spcSamplingPlans,
  spcDefectCategories,
  productStationMappings,
  mappingTemplates,
} from "../drizzle/schema";
import { storagePut } from "./storage";

// Export format version for compatibility checking
const EXPORT_VERSION = "1.0.0";

interface ExportData {
  version: string;
  exportedAt: string;
  exportedBy?: number;
  sections: {
    systemConfig?: any[];
    companyInfo?: any;
    alertSettings?: any[];
    emailNotificationSettings?: any[];
    roles?: any[];
    rolePermissions?: any[];
    products?: any[];
    productSpecifications?: any[];
    productionLines?: any[];
    workstations?: any[];
    machines?: any[];
    machineTypes?: any[];
    fixtures?: any[];
    processes?: any[];
    processTemplates?: any[];
    spcSamplingPlans?: any[];
    spcDefectCategories?: any[];
    productStationMappings?: any[];
    mappingTemplates?: any[];
  };
}

/**
 * Export all system settings
 */
export async function exportSettings(options?: {
  includeSystemConfig?: boolean;
  includeCompanyInfo?: boolean;
  includeAlertSettings?: boolean;
  includeEmailSettings?: boolean;
  includeRoles?: boolean;
  includeMasterData?: boolean;
  includeMappings?: boolean;
  exportedBy?: number;
}): Promise<{ success: boolean; data?: ExportData; url?: string; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  const opts = {
    includeSystemConfig: true,
    includeCompanyInfo: true,
    includeAlertSettings: true,
    includeEmailSettings: true,
    includeRoles: true,
    includeMasterData: true,
    includeMappings: true,
    ...options,
  };

  try {
    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: opts.exportedBy,
      sections: {},
    };

    // Export system config
    if (opts.includeSystemConfig) {
      const configs = await db.select().from(systemConfig);
      // Filter out sensitive configs
      exportData.sections.systemConfig = configs.filter(c => 
        !c.isEncrypted && 
        !c.configKey.includes("password") && 
        !c.configKey.includes("secret")
      );
    }

    // Export company info
    if (opts.includeCompanyInfo) {
      const [company] = await db.select().from(companyInfo).limit(1);
      exportData.sections.companyInfo = company || null;
    }

    // Export alert settings
    if (opts.includeAlertSettings) {
      const alerts = await db.select().from(alertSettings);
      exportData.sections.alertSettings = alerts;
    }

    // Export email notification settings
    if (opts.includeEmailSettings) {
      const emails = await db.select().from(emailNotificationSettings);
      // Remove sensitive SMTP credentials
      exportData.sections.emailNotificationSettings = emails.map(e => ({
        ...e,
        smtpPassword: undefined,
      }));
    }

    // Export roles and permissions
    if (opts.includeRoles) {
      // Note: roles table may not exist in current schema
      // Skip for now
    }

    // Export master data
    if (opts.includeMasterData) {
      exportData.sections.products = await db.select().from(products);
      exportData.sections.productSpecifications = await db.select().from(productSpecifications);
      exportData.sections.productionLines = await db.select().from(productionLines);
      exportData.sections.workstations = await db.select().from(workstations);
      exportData.sections.machines = await db.select().from(machines);
      exportData.sections.machineTypes = await db.select().from(machineTypes);
      exportData.sections.fixtures = await db.select().from(fixtures);
      exportData.sections.processes = await db.select().from(processSteps);
      exportData.sections.processTemplates = await db.select().from(processTemplates);
      exportData.sections.spcSamplingPlans = await db.select().from(spcSamplingPlans);
      exportData.sections.spcDefectCategories = await db.select().from(spcDefectCategories);
    }

    // Export mappings
    if (opts.includeMappings) {
      exportData.sections.productStationMappings = await db.select().from(productStationMappings);
      exportData.sections.mappingTemplates = await db.select().from(mappingTemplates);
    }

    // Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `settings-export-${timestamp}.json`;
    const fileKey = `exports/${filename}`;
    const content = JSON.stringify(exportData, null, 2);
    
    const { url } = await storagePut(fileKey, Buffer.from(content), "application/json");

    console.log(`[Settings] Exported settings to: ${filename}`);
    
    return { success: true, data: exportData, url };
  } catch (error) {
    console.error("[Settings] Error exporting settings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Validate import data
 */
export function validateImportData(data: any): { 
  valid: boolean; 
  errors: string[];
  sections: string[];
} {
  const errors: string[] = [];
  const sections: string[] = [];

  if (!data) {
    errors.push("No data provided");
    return { valid: false, errors, sections };
  }

  if (!data.version) {
    errors.push("Missing version field");
  }

  if (!data.exportedAt) {
    errors.push("Missing exportedAt field");
  }

  if (!data.sections || typeof data.sections !== "object") {
    errors.push("Missing or invalid sections field");
    return { valid: false, errors, sections };
  }

  // Check which sections are present
  const validSections = [
    "systemConfig", "companyInfo", "alertSettings", "emailNotificationSettings",
    "roles", "rolePermissions", "products", "productSpecifications",
    "productionLines", "workstations", "machines", "machineTypes",
    "fixtures", "processes", "processTemplates", "spcSamplingPlans",
    "spcDefectCategories", "productStationMappings", "mappingTemplates"
  ];

  for (const section of validSections) {
    if (data.sections[section] !== undefined) {
      sections.push(section);
    }
  }

  if (sections.length === 0) {
    errors.push("No valid sections found in import data");
  }

  return { valid: errors.length === 0, errors, sections };
}

/**
 * Import settings from exported data
 */
export async function importSettings(
  data: ExportData,
  options?: {
    overwrite?: boolean; // Overwrite existing data
    sections?: string[]; // Only import specific sections
    importedBy?: number;
  }
): Promise<{ success: boolean; imported: string[]; errors: string[] }> {
  const db = await getDb();
  if (!db) {
    return { success: false, imported: [], errors: ["Database not available"] };
  }

  const opts = {
    overwrite: false,
    sections: undefined as string[] | undefined,
    ...options,
  };

  const imported: string[] = [];
  const errors: string[] = [];

  // Validate data first
  const validation = validateImportData(data);
  if (!validation.valid) {
    return { success: false, imported: [], errors: validation.errors };
  }

  const sectionsToImport = opts.sections || validation.sections;

  try {
    // Import company info
    if (sectionsToImport.includes("companyInfo") && data.sections.companyInfo) {
      try {
        const [existing] = await db.select().from(companyInfo).limit(1);
        if (existing && opts.overwrite) {
          await db.update(companyInfo)
            .set({
              companyName: data.sections.companyInfo.companyName,
              companyCode: data.sections.companyInfo.companyCode,
              address: data.sections.companyInfo.address,
              phone: data.sections.companyInfo.phone,
              email: data.sections.companyInfo.email,
              website: data.sections.companyInfo.website,
              taxCode: data.sections.companyInfo.taxCode,
            });
        } else if (!existing) {
          await db.insert(companyInfo).values(data.sections.companyInfo);
        }
        imported.push("companyInfo");
      } catch (e) {
        errors.push(`companyInfo: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Import alert settings
    if (sectionsToImport.includes("alertSettings") && data.sections.alertSettings) {
      try {
        if (opts.overwrite) {
          // Clear existing and insert new
          for (const alert of data.sections.alertSettings) {
            const { id, ...alertData } = alert;
            await db.insert(alertSettings).values(alertData);
          }
        }
        imported.push("alertSettings");
      } catch (e) {
        errors.push(`alertSettings: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Import roles - skipped as roles are managed separately
    if (sectionsToImport.includes("roles") && data.sections.roles) {
      // Roles import is handled through role management UI
      imported.push("roles (skipped)");
    }

    // Import products
    if (sectionsToImport.includes("products") && data.sections.products) {
      try {
        for (const product of data.sections.products) {
          const { id, ...productData } = product;
          // Check if product exists by code
          const existing = await db.select().from(products);
          const exists = existing.some(p => p.code === productData.code);
          if (!exists) {
            await db.insert(products).values(productData);
          } else if (opts.overwrite) {
            // Update existing
          }
        }
        imported.push("products");
      } catch (e) {
        errors.push(`products: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Import production lines
    if (sectionsToImport.includes("productionLines") && data.sections.productionLines) {
      try {
        for (const line of data.sections.productionLines) {
          const { id, ...lineData } = line;
          const existing = await db.select().from(productionLines);
          const exists = existing.some(l => l.code === lineData.code);
          if (!exists) {
            await db.insert(productionLines).values(lineData);
          }
        }
        imported.push("productionLines");
      } catch (e) {
        errors.push(`productionLines: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Import machine types
    if (sectionsToImport.includes("machineTypes") && data.sections.machineTypes) {
      try {
        for (const type of data.sections.machineTypes) {
          const { id, ...typeData } = type;
          const existing = await db.select().from(machineTypes);
          const exists = existing.some(t => t.code === typeData.code);
          if (!exists) {
            await db.insert(machineTypes).values(typeData);
          }
        }
        imported.push("machineTypes");
      } catch (e) {
        errors.push(`machineTypes: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Import defect categories
    if (sectionsToImport.includes("spcDefectCategories") && data.sections.spcDefectCategories) {
      try {
        for (const cat of data.sections.spcDefectCategories) {
          const { id, ...catData } = cat;
          const existing = await db.select().from(spcDefectCategories);
          const exists = existing.some(c => c.code === catData.code);
          if (!exists) {
            await db.insert(spcDefectCategories).values(catData);
          }
        }
        imported.push("spcDefectCategories");
      } catch (e) {
        errors.push(`spcDefectCategories: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    console.log(`[Settings] Imported ${imported.length} sections, ${errors.length} errors`);
    
    return { 
      success: errors.length === 0, 
      imported, 
      errors 
    };
  } catch (error) {
    console.error("[Settings] Error importing settings:", error);
    return { 
      success: false, 
      imported, 
      errors: [...errors, error instanceof Error ? error.message : "Unknown error"] 
    };
  }
}

/**
 * Get export preview (list of sections and counts)
 */
export async function getExportPreview(): Promise<{
  sections: { name: string; count: number; description: string }[];
}> {
  const db = await getDb();
  if (!db) {
    return { sections: [] };
  }

  try {
    const sections = [
      { 
        name: "systemConfig", 
        count: (await db.select().from(systemConfig)).length,
        description: "Cấu hình hệ thống"
      },
      { 
        name: "companyInfo", 
        count: (await db.select().from(companyInfo)).length > 0 ? 1 : 0,
        description: "Thông tin công ty"
      },
      { 
        name: "alertSettings", 
        count: (await db.select().from(alertSettings)).length,
        description: "Cài đặt cảnh báo"
      },
      { 
        name: "roles", 
        count: 0, // Roles managed separately
        description: "Vai trò và phân quyền"
      },
      { 
        name: "products", 
        count: (await db.select().from(products)).length,
        description: "Danh sách sản phẩm"
      },
      { 
        name: "productSpecifications", 
        count: (await db.select().from(productSpecifications)).length,
        description: "Tiêu chuẩn kỹ thuật"
      },
      { 
        name: "productionLines", 
        count: (await db.select().from(productionLines)).length,
        description: "Dây chuyền sản xuất"
      },
      { 
        name: "machines", 
        count: (await db.select().from(machines)).length,
        description: "Máy móc thiết bị"
      },
      { 
        name: "spcSamplingPlans", 
        count: (await db.select().from(spcSamplingPlans)).length,
        description: "Kế hoạch SPC"
      },
      { 
        name: "productStationMappings", 
        count: (await db.select().from(productStationMappings)).length,
        description: "Mapping sản phẩm-trạm"
      },
    ];

    return { sections };
  } catch (error) {
    console.error("[Settings] Error getting export preview:", error);
    return { sections: [] };
  }
}
