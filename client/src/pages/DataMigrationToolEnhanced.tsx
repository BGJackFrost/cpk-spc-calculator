import { useState, useCallback, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  ArrowRight,
  ArrowLeftRight,
  Table2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Upload,
  Settings,
  History,
  Link2,
  Unlink2,
  Wand2,
  Calendar,
  Mail,
  Save,
  FolderOpen,
  RotateCcw,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Columns,
  Timer,
  Activity
} from "lucide-react";

// Types
interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
  selected: boolean;
  status: "pending" | "migrating" | "success" | "error" | "skipped";
  migratedRows?: number;
  errorMessage?: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transformation?: TransformationRule;
  autoMatched: boolean;
  typeCompatible: boolean;
}

interface TransformationRule {
  type: "none" | "trim" | "uppercase" | "lowercase" | "date_format" | "number_format" | "custom";
  params?: Record<string, number | string>;
}

interface MigrationProfile {
  id: string;
  name: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  tableMappings: {
    sourceTable: string;
    targetTable: string;
    columnMappings: ColumnMapping[];
  }[];
  options: MigrationOptions;
  createdAt: Date;
  lastUsed?: Date;
}

interface MigrationOptions {
  truncateTarget: boolean;
  skipErrors: boolean;
  batchSize: number;
  validateData: boolean;
  createBackup: boolean;
  conflictResolution: "skip" | "overwrite" | "merge" | "ask";
  scheduleEnabled: boolean;
  scheduleTime?: string;
  emailNotification: boolean;
  notificationEmail?: string;
}

interface ConflictRecord {
  id: number;
  tableName: string;
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  conflictType: "duplicate_key" | "constraint_violation" | "type_mismatch";
  resolution?: "skip" | "overwrite" | "merge";
}

interface MigrationLog {
  id: number;
  timestamp: Date;
  sourceConnection: string;
  targetConnection: string;
  tablesCount: number;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  duration: number;
  status: "success" | "partial" | "failed" | "rolled_back";
  backupId?: string;
  logs: string[];
}

// Wizard Steps
type WizardStep = "source" | "target" | "mapping" | "transform" | "preview" | "execute";

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "source", label: "Chọn nguồn", icon: Database },
  { id: "target", label: "Chọn đích", icon: Database },
  { id: "mapping", label: "Mapping", icon: Link2 },
  { id: "transform", label: "Transform", icon: Wand2 },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "execute", label: "Thực thi", icon: Play },
];

// Mock data for source tables
const MOCK_SOURCE_TABLES: TableInfo[] = [
  { 
    name: "measurements", 
    rowCount: 15000, 
    selected: true, 
    status: "pending",
    columns: [
      { name: "id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "product_code", type: "VARCHAR(50)", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "station_name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "value", type: "DECIMAL(10,4)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "measured_at", type: "DATETIME", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "operator", type: "VARCHAR(50)", nullable: true, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "products", 
    rowCount: 50, 
    selected: true, 
    status: "pending",
    columns: [
      { name: "id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "code", type: "VARCHAR(50)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "name", type: "VARCHAR(200)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "description", type: "TEXT", nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: "created_at", type: "DATETIME", nullable: false, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "stations", 
    rowCount: 20, 
    selected: true, 
    status: "pending",
    columns: [
      { name: "id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "line_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "status", type: "VARCHAR(20)", nullable: false, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "production_lines", 
    rowCount: 5, 
    selected: true, 
    status: "pending",
    columns: [
      { name: "id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "description", type: "TEXT", nullable: true, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "machines", 
    rowCount: 30, 
    selected: false, 
    status: "pending",
    columns: [
      { name: "id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "station_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "serial_number", type: "VARCHAR(50)", nullable: true, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "audit_logs", 
    rowCount: 50000, 
    selected: false, 
    status: "pending",
    columns: [
      { name: "id", type: "BIGINT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "action", type: "VARCHAR(50)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "user_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "details", type: "JSON", nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: "created_at", type: "DATETIME", nullable: false, isPrimaryKey: false, isForeignKey: false },
    ]
  },
];

// Mock data for target tables
const MOCK_TARGET_TABLES: TableInfo[] = [
  { 
    name: "tbl_measurements", 
    rowCount: 0, 
    selected: false, 
    status: "pending",
    columns: [
      { name: "measurement_id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "product_id", type: "VARCHAR(50)", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "station", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "measured_value", type: "DECIMAL(10,4)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "measurement_time", type: "DATETIME", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "operator_name", type: "VARCHAR(50)", nullable: true, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "tbl_products", 
    rowCount: 10, 
    selected: false, 
    status: "pending",
    columns: [
      { name: "product_id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "product_code", type: "VARCHAR(50)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "product_name", type: "VARCHAR(200)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "product_desc", type: "TEXT", nullable: true, isPrimaryKey: false, isForeignKey: false },
      { name: "create_date", type: "DATETIME", nullable: false, isPrimaryKey: false, isForeignKey: false },
    ]
  },
  { 
    name: "tbl_stations", 
    rowCount: 5, 
    selected: false, 
    status: "pending",
    columns: [
      { name: "station_id", type: "INT", nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: "station_name", type: "VARCHAR(100)", nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: "production_line_id", type: "INT", nullable: false, isPrimaryKey: false, isForeignKey: true },
      { name: "station_status", type: "VARCHAR(20)", nullable: false, isPrimaryKey: false, isForeignKey: false },
    ]
  },
];

export default function DataMigrationToolEnhanced() {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>("source");
  const [sourceConnectionId, setSourceConnectionId] = useState<string>("");
  const [targetConnectionId, setTargetConnectionId] = useState<string>("");
  const [sourceTables, setSourceTables] = useState<TableInfo[]>([]);
  const [targetTables, setTargetTables] = useState<TableInfo[]>([]);
  const [selectedSourceTable, setSelectedSourceTable] = useState<string>("");
  const [selectedTargetTable, setSelectedTargetTable] = useState<string>("");
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping[]>>({});
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [currentMigratingTable, setCurrentMigratingTable] = useState<string>("");
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [previewData, setPreviewData] = useState<{ source: Record<string, unknown>[]; transformed: Record<string, unknown>[] }>({ source: [], transformed: [] });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictRecord | null>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<MigrationProfile[]>([]);
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  
  const [options, setOptions] = useState<MigrationOptions>({
    truncateTarget: false,
    skipErrors: true,
    batchSize: 1000,
    validateData: true,
    createBackup: true,
    conflictResolution: "skip",
    scheduleEnabled: false,
    scheduleTime: "",
    emailNotification: false,
    notificationEmail: "",
  });

  const { toast } = useToast();
  const connectionsQuery = trpc.databaseConnection.list.useQuery();
  const connections = connectionsQuery.data || [];

  // Mock migration history
  const [migrationHistory, setMigrationHistory] = useState<MigrationLog[]>([
    {
      id: 1,
      timestamp: new Date(Date.now() - 86400000),
      sourceConnection: "Production DB",
      targetConnection: "Backup DB",
      tablesCount: 5,
      totalRows: 15000,
      successRows: 15000,
      failedRows: 0,
      skippedRows: 0,
      duration: 45,
      status: "success",
      backupId: "backup_20241218_001",
      logs: ["Started migration", "Completed successfully"],
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 172800000),
      sourceConnection: "Test DB",
      targetConnection: "Dev DB",
      tablesCount: 3,
      totalRows: 5000,
      successRows: 4950,
      failedRows: 50,
      skippedRows: 0,
      duration: 20,
      status: "partial",
      logs: ["Started migration", "50 records failed due to constraint violations"],
    },
  ]);

  // Computed values
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
  const selectedSourceTables = sourceTables.filter(t => t.selected);
  const totalSelectedRows = selectedSourceTables.reduce((sum, t) => sum + t.rowCount, 0);

  // Load tables from source connection
  const handleLoadSourceTables = async () => {
    if (!sourceConnectionId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn kết nối nguồn", variant: "destructive" });
      return;
    }

    setIsLoadingTables(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSourceTables(MOCK_SOURCE_TABLES);
      toast({ title: "Thành công", description: `Đã tải ${MOCK_SOURCE_TABLES.length} bảng từ database nguồn` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể tải danh sách bảng", variant: "destructive" });
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Load tables from target connection
  const handleLoadTargetTables = async () => {
    if (!targetConnectionId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn kết nối đích", variant: "destructive" });
      return;
    }

    setIsLoadingTables(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setTargetTables(MOCK_TARGET_TABLES);
      toast({ title: "Thành công", description: `Đã tải ${MOCK_TARGET_TABLES.length} bảng từ database đích` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể tải danh sách bảng", variant: "destructive" });
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Calculate string similarity
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/_/g, "");
    const s2 = str2.toLowerCase().replace(/_/g, "");
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const words1 = s1.split(/(?=[A-Z])|_/).map(w => w.toLowerCase());
    const words2 = s2.split(/(?=[A-Z])|_/).map(w => w.toLowerCase());
    const commonWords = words1.filter(w => words2.includes(w));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }, []);

  // Check type compatibility
  const checkTypeCompatibility = useCallback((sourceType: string, targetType: string): boolean => {
    const s = sourceType.toUpperCase();
    const t = targetType.toUpperCase();
    
    if (s === t) return true;
    
    const numericTypes = ["INT", "BIGINT", "DECIMAL", "FLOAT", "DOUBLE", "NUMERIC"];
    if (numericTypes.some(nt => s.includes(nt)) && numericTypes.some(nt => t.includes(nt))) return true;
    
    const stringTypes = ["VARCHAR", "CHAR", "TEXT", "NVARCHAR"];
    if (stringTypes.some(st => s.includes(st)) && stringTypes.some(st => t.includes(st))) return true;
    
    const dateTypes = ["DATE", "DATETIME", "TIMESTAMP"];
    if (dateTypes.some(dt => s.includes(dt)) && dateTypes.some(dt => t.includes(dt))) return true;
    
    return false;
  }, []);

  // Auto-suggest column mappings
  const autoSuggestMappings = useCallback((sourceTable: TableInfo, targetTable: TableInfo) => {
    const mappings: ColumnMapping[] = [];
    
    sourceTable.columns.forEach(sourceCol => {
      let bestMatch: ColumnInfo | null = null;
      let bestScore = 0;
      
      targetTable.columns.forEach(targetCol => {
        const score = calculateSimilarity(sourceCol.name, targetCol.name);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = targetCol;
        }
      });
      
      if (bestMatch !== null) {
        const matchedCol = bestMatch as ColumnInfo;
        const typeCompatible = checkTypeCompatibility(sourceCol.type, matchedCol.type);
        mappings.push({
          sourceColumn: sourceCol.name,
          targetColumn: matchedCol.name,
          autoMatched: true,
          typeCompatible,
          transformation: typeCompatible ? { type: "none" } : undefined,
        });
      }
    });
    
    return mappings;
  }, [calculateSimilarity, checkTypeCompatibility]);

  // Handle drag start for column mapping
  const handleDragStart = (columnName: string) => {
    setDraggedColumn(columnName);
  };

  // Handle drop for column mapping
  const handleDrop = (targetColumn: string) => {
    if (!draggedColumn || !selectedSourceTable || !selectedTargetTable) return;
    
    const key = `${selectedSourceTable}_${selectedTargetTable}`;
    const currentMappings = columnMappings[key] || [];
    
    const existingIndex = currentMappings.findIndex(m => m.sourceColumn === draggedColumn);
    
    const sourceTable = sourceTables.find(t => t.name === selectedSourceTable);
    const targetTable = targetTables.find(t => t.name === selectedTargetTable);
    
    if (sourceTable && targetTable) {
      const sourceCol = sourceTable.columns.find(c => c.name === draggedColumn);
      const targetCol = targetTable.columns.find(c => c.name === targetColumn);
      
      if (sourceCol && targetCol) {
        const typeCompatible = checkTypeCompatibility(sourceCol.type, targetCol.type);
        
        const newMapping: ColumnMapping = {
          sourceColumn: draggedColumn,
          targetColumn,
          autoMatched: false,
          typeCompatible,
          transformation: { type: "none" },
        };
        
        if (existingIndex >= 0) {
          currentMappings[existingIndex] = newMapping;
        } else {
          currentMappings.push(newMapping);
        }
        
        setColumnMappings({ ...columnMappings, [key]: currentMappings });
      }
    }
    
    setDraggedColumn(null);
  };

  // Remove column mapping
  const removeMapping = (sourceColumn: string) => {
    if (!selectedSourceTable || !selectedTargetTable) return;
    
    const key = `${selectedSourceTable}_${selectedTargetTable}`;
    const currentMappings = columnMappings[key] || [];
    
    setColumnMappings({
      ...columnMappings,
      [key]: currentMappings.filter(m => m.sourceColumn !== sourceColumn),
    });
  };

  // Apply transformation to preview data
  const applyTransformation = (value: unknown, rule: TransformationRule): unknown => {
    if (!rule || rule.type === "none") return value;
    
    switch (rule.type) {
      case "trim":
        return typeof value === "string" ? value.trim() : value;
      case "uppercase":
        return typeof value === "string" ? value.toUpperCase() : value;
      case "lowercase":
        return typeof value === "string" ? value.toLowerCase() : value;
      case "date_format":
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return value;
      case "number_format":
        if (typeof value === "number") {
          const decimals = typeof rule.params?.decimals === "number" ? rule.params.decimals : 2;
          return value.toFixed(decimals);
        }
        return value;
      default:
        return value;
    }
  };

  // Generate preview data
  const generatePreview = async () => {
    if (!selectedSourceTable) return;
    
    const sourceData = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      product_code: `  PROD-${String(i + 1).padStart(3, "0")}  `,
      station_name: `station ${i + 1}`,
      value: Math.random() * 100,
      measured_at: new Date(Date.now() - Math.random() * 86400000 * 30),
      operator: i % 2 === 0 ? `Operator ${i + 1}` : null,
    }));
    
    const key = `${selectedSourceTable}_${selectedTargetTable}`;
    const mappings = columnMappings[key] || [];
    
    const transformedData = sourceData.map(row => {
      const newRow: Record<string, unknown> = {};
      mappings.forEach(mapping => {
        const sourceValue = row[mapping.sourceColumn as keyof typeof row];
        newRow[mapping.targetColumn] = mapping.transformation 
          ? applyTransformation(sourceValue, mapping.transformation)
          : sourceValue;
      });
      return newRow;
    });
    
    setPreviewData({ source: sourceData as unknown as Record<string, unknown>[], transformed: transformedData });
  };

  // Start migration
  const handleStartMigration = async () => {
    if (selectedSourceTables.length === 0) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ít nhất một bảng để migrate", variant: "destructive" });
      return;
    }

    if (!targetConnectionId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn kết nối đích", variant: "destructive" });
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);
    setProcessedRows(0);
    setTotalRows(totalSelectedRows);
    setMigrationLogs([`[${new Date().toLocaleTimeString()}] Bắt đầu migration...`]);
    
    if (options.createBackup) {
      setMigrationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Tạo backup snapshot...`]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMigrationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Backup hoàn thành: backup_${Date.now()}`]);
    }

    const startTime = Date.now();
    let processedTotal = 0;

    for (let i = 0; i < selectedSourceTables.length; i++) {
      const table = selectedSourceTables[i];
      setCurrentMigratingTable(table.name);
      
      setSourceTables(prev => prev.map(t => 
        t.name === table.name ? { ...t, status: "migrating" } : t
      ));
      
      setMigrationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Đang migrate bảng: ${table.name} (${table.rowCount.toLocaleString()} rows)`]);

      const batches = Math.ceil(table.rowCount / options.batchSize);
      for (let batch = 0; batch < batches; batch++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const batchRows = Math.min(options.batchSize, table.rowCount - batch * options.batchSize);
        processedTotal += batchRows;
        setProcessedRows(processedTotal);
        
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processedTotal / elapsed;
        const remaining = (totalSelectedRows - processedTotal) / rate;
        setEstimatedTimeRemaining(Math.round(remaining));
      }

      const success = Math.random() > 0.1;
      setSourceTables(prev => prev.map(t => 
        t.name === table.name ? {
          ...t,
          status: success ? "success" : "error",
          migratedRows: success ? t.rowCount : Math.floor(t.rowCount * 0.8),
          errorMessage: success ? undefined : "Connection timeout",
        } : t
      ));

      setMigrationLogs(prev => [...prev, 
        success 
          ? `[${new Date().toLocaleTimeString()}] ✓ ${table.name}: ${table.rowCount.toLocaleString()} rows migrated`
          : `[${new Date().toLocaleTimeString()}] ✗ ${table.name}: Error - Connection timeout`
      ]);

      setMigrationProgress(((i + 1) / selectedSourceTables.length) * 100);
    }

    setIsMigrating(false);
    setCurrentMigratingTable("");
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    setMigrationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Migration hoàn thành trong ${duration}s`]);
    
    const newLog: MigrationLog = {
      id: Date.now(),
      timestamp: new Date(),
      sourceConnection: connections.find((c: { id: number }) => c.id.toString() === sourceConnectionId)?.name || "Unknown",
      targetConnection: connections.find((c: { id: number }) => c.id.toString() === targetConnectionId)?.name || "Unknown",
      tablesCount: selectedSourceTables.length,
      totalRows: totalSelectedRows,
      successRows: sourceTables.filter(t => t.status === "success").reduce((sum, t) => sum + (t.migratedRows || 0), 0),
      failedRows: sourceTables.filter(t => t.status === "error").reduce((sum, t) => sum + t.rowCount - (t.migratedRows || 0), 0),
      skippedRows: 0,
      duration,
      status: sourceTables.every(t => t.status === "success") ? "success" : "partial",
      backupId: options.createBackup ? `backup_${Date.now()}` : undefined,
      logs: migrationLogs,
    };
    setMigrationHistory(prev => [newLog, ...prev]);

    if (options.emailNotification && options.notificationEmail) {
      toast({ title: "Email đã gửi", description: `Thông báo đã được gửi đến ${options.notificationEmail}` });
    }

    toast({
      title: "Migration hoàn thành",
      description: `Đã migrate ${selectedSourceTables.length} bảng trong ${duration}s`,
    });
  };

  // Handle conflict resolution
  const handleConflictResolution = (resolution: "skip" | "overwrite" | "merge") => {
    if (currentConflict) {
      setMigrationLogs(prev => [...prev, 
        `[${new Date().toLocaleTimeString()}] Conflict resolved: ${resolution} for record ID ${(currentConflict.sourceData as { id?: number }).id}`
      ]);
    }
    setShowConflictDialog(false);
    setCurrentConflict(null);
  };

  // Rollback migration
  const handleRollback = async (logId: number) => {
    const log = migrationHistory.find(l => l.id === logId);
    if (!log?.backupId) {
      toast({ title: "Lỗi", description: "Không có backup để rollback", variant: "destructive" });
      return;
    }

    toast({ title: "Đang rollback...", description: `Khôi phục từ ${log.backupId}` });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setMigrationHistory(prev => prev.map(l => 
      l.id === logId ? { ...l, status: "rolled_back" as const } : l
    ));
    
    toast({ title: "Rollback thành công", description: "Dữ liệu đã được khôi phục" });
  };

  // Save migration profile
  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên profile", variant: "destructive" });
      return;
    }

    const profile: MigrationProfile = {
      id: Date.now().toString(),
      name: profileName,
      sourceConnectionId,
      targetConnectionId,
      tableMappings: Object.entries(columnMappings).map(([key, mappings]) => {
        const [sourceTable, targetTable] = key.split("_");
        return { sourceTable, targetTable, columnMappings: mappings };
      }),
      options,
      createdAt: new Date(),
    };

    setSavedProfiles(prev => [...prev, profile]);
    setShowSaveProfileDialog(false);
    setProfileName("");
    toast({ title: "Đã lưu", description: `Profile "${profileName}" đã được lưu` });
  };

  // Load migration profile
  const handleLoadProfile = (profile: MigrationProfile) => {
    setSourceConnectionId(profile.sourceConnectionId);
    setTargetConnectionId(profile.targetConnectionId);
    setOptions(profile.options);
    
    const mappings: Record<string, ColumnMapping[]> = {};
    profile.tableMappings.forEach(tm => {
      mappings[`${tm.sourceTable}_${tm.targetTable}`] = tm.columnMappings;
    });
    setColumnMappings(mappings);
    
    toast({ title: "Đã tải", description: `Profile "${profile.name}" đã được tải` });
  };

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "source": return sourceConnectionId && sourceTables.length > 0 && selectedSourceTables.length > 0;
      case "target": return targetConnectionId && targetTables.length > 0;
      case "mapping": return Object.keys(columnMappings).length > 0;
      case "transform": return true;
      case "preview": return true;
      case "execute": return !isMigrating;
      default: return false;
    }
  }, [currentStep, sourceConnectionId, sourceTables, selectedSourceTables, targetConnectionId, targetTables, columnMappings, isMigrating]);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex].id);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex].id);
    }
  };

  // Toggle table selection
  const toggleTableSelection = (tableName: string) => {
    setSourceTables(prev => prev.map(t =>
      t.name === tableName ? { ...t, selected: !t.selected } : t
    ));
  };

  const selectAllTables = (selected: boolean) => {
    setSourceTables(prev => prev.map(t => ({ ...t, selected })));
  };

  // Auto-suggest when tables are selected
  useEffect(() => {
    if (selectedSourceTable && selectedTargetTable) {
      const sourceTable = sourceTables.find(t => t.name === selectedSourceTable);
      const targetTable = targetTables.find(t => t.name === selectedTargetTable);
      
      if (sourceTable && targetTable) {
        const key = `${selectedSourceTable}_${selectedTargetTable}`;
        if (!columnMappings[key]) {
          const suggested = autoSuggestMappings(sourceTable, targetTable);
          setColumnMappings(prev => ({ ...prev, [key]: suggested }));
        }
      }
    }
  }, [selectedSourceTable, selectedTargetTable, sourceTables, targetTables, autoSuggestMappings, columnMappings]);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Data Migration Tool
              <Badge variant="secondary">Enhanced</Badge>
            </h1>
            <p className="text-muted-foreground">
              Migrate dữ liệu với visual mapping, transformation và conflict resolution
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSaveProfileDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              Lưu Profile
            </Button>
            <Select onValueChange={(id) => {
              const profile = savedProfiles.find(p => p.id === id);
              if (profile) handleLoadProfile(profile);
            }}>
              <SelectTrigger className="w-[180px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tải Profile" />
              </SelectTrigger>
              <SelectContent>
                {savedProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Wizard Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-8">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                      className={`flex flex-col items-center gap-2 ${
                        index <= currentStepIndex ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : isCompleted 
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-muted border-muted-foreground/30"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </button>
                    {index < WIZARD_STEPS.length - 1 && (
                      <div className={`w-16 h-0.5 mx-2 ${
                        index < currentStepIndex ? "bg-green-500" : "bg-muted"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={currentStep} className="space-y-6">
          {/* Step 1: Source Selection */}
          <TabsContent value="source" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Chọn Database Nguồn
                </CardTitle>
                <CardDescription>Chọn kết nối và các bảng cần migrate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Kết nối nguồn</Label>
                    <Select value={sourceConnectionId} onValueChange={setSourceConnectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn database nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((conn: { id: number; name: string; databaseType: string }) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.name} ({conn.databaseType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleLoadSourceTables} disabled={isLoadingTables || !sourceConnectionId}>
                    {isLoadingTables ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Tải danh sách bảng
                  </Button>
                </div>

                {sourceTables.length > 0 && (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={sourceTables.every(t => t.selected)}
                          onCheckedChange={(checked) => selectAllTables(!!checked)}
                        />
                        <span className="text-sm font-medium">Chọn tất cả</span>
                      </div>
                      <Badge variant="outline">
                        {selectedSourceTables.length}/{sourceTables.length} bảng • {totalSelectedRows.toLocaleString()} rows
                      </Badge>
                    </div>
                    
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Tên bảng</TableHead>
                            <TableHead className="text-right">Số dòng</TableHead>
                            <TableHead className="text-right">Số cột</TableHead>
                            <TableHead>Columns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sourceTables.map((table) => (
                            <TableRow key={table.name} className={table.selected ? "bg-primary/5" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={table.selected}
                                  onCheckedChange={() => toggleTableSelection(table.name)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Table2 className="h-4 w-4 text-muted-foreground" />
                                  {table.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{table.rowCount.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{table.columns.length}</TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="cursor-help">
                                        {table.columns.slice(0, 3).map(c => c.name).join(", ")}
                                        {table.columns.length > 3 && ` +${table.columns.length - 3}`}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <div className="space-y-1">
                                        {table.columns.map(col => (
                                          <div key={col.name} className="flex items-center gap-2 text-xs">
                                            <span className="font-mono">{col.name}</span>
                                            <span className="text-muted-foreground">{col.type}</span>
                                            {col.isPrimaryKey && <Badge variant="default" className="text-[10px] px-1">PK</Badge>}
                                            {col.isForeignKey && <Badge variant="secondary" className="text-[10px] px-1">FK</Badge>}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Target Selection */}
          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Chọn Database Đích
                </CardTitle>
                <CardDescription>Chọn kết nối đích để migrate dữ liệu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Kết nối đích</Label>
                    <Select value={targetConnectionId} onValueChange={setTargetConnectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn database đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.filter((c: { id: number }) => c.id.toString() !== sourceConnectionId).map((conn: { id: number; name: string; databaseType: string }) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.name} ({conn.databaseType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleLoadTargetTables} disabled={isLoadingTables || !targetConnectionId}>
                    {isLoadingTables ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Tải danh sách bảng
                  </Button>
                </div>

                {targetTables.length > 0 && (
                  <ScrollArea className="h-[400px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên bảng</TableHead>
                          <TableHead className="text-right">Số dòng hiện có</TableHead>
                          <TableHead className="text-right">Số cột</TableHead>
                          <TableHead>Columns</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {targetTables.map((table) => (
                          <TableRow key={table.name}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Table2 className="h-4 w-4 text-muted-foreground" />
                                {table.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{table.rowCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{table.columns.length}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {table.columns.slice(0, 3).map(c => c.name).join(", ")}
                                {table.columns.length > 3 && ` +${table.columns.length - 3}`}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Visual Schema Mapping */}
          <TabsContent value="mapping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Visual Schema Mapping
                </CardTitle>
                <CardDescription>Kéo thả để tạo mapping giữa các cột. Hệ thống sẽ tự động gợi ý dựa trên tên cột.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bảng nguồn</Label>
                    <Select value={selectedSourceTable} onValueChange={setSelectedSourceTable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn bảng nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSourceTables.map((table) => (
                          <SelectItem key={table.name} value={table.name}>
                            {table.name} ({table.rowCount.toLocaleString()} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bảng đích</Label>
                    <Select value={selectedTargetTable} onValueChange={setSelectedTargetTable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn bảng đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetTables.map((table) => (
                          <SelectItem key={table.name} value={table.name}>
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedSourceTable && selectedTargetTable && (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mt-6">
                    {/* Source Columns */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Columns className="h-4 w-4" />
                        Cột nguồn ({selectedSourceTable})
                      </h4>
                      <div className="space-y-2">
                        {sourceTables.find(t => t.name === selectedSourceTable)?.columns.map(col => {
                          const key = `${selectedSourceTable}_${selectedTargetTable}`;
                          const mapping = columnMappings[key]?.find(m => m.sourceColumn === col.name);
                          
                          return (
                            <div
                              key={col.name}
                              draggable
                              onDragStart={() => handleDragStart(col.name)}
                              className={`p-3 border rounded-lg cursor-grab active:cursor-grabbing transition-colors ${
                                mapping ? "bg-green-50 border-green-300 dark:bg-green-950" : "bg-muted/50 hover:bg-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{col.name}</span>
                                  {col.isPrimaryKey && <Badge variant="default" className="text-[10px]">PK</Badge>}
                                  {col.isForeignKey && <Badge variant="secondary" className="text-[10px]">FK</Badge>}
                                </div>
                                <span className="text-xs text-muted-foreground">{col.type}</span>
                              </div>
                              {mapping && (
                                <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  {mapping.targetColumn}
                                  {mapping.autoMatched && <Badge variant="outline" className="text-[10px] ml-1">Auto</Badge>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mapping Lines */}
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                        <Button variant="outline" size="sm" onClick={() => {
                          const sourceTable = sourceTables.find(t => t.name === selectedSourceTable);
                          const targetTable = targetTables.find(t => t.name === selectedTargetTable);
                          if (sourceTable && targetTable) {
                            const suggested = autoSuggestMappings(sourceTable, targetTable);
                            const key = `${selectedSourceTable}_${selectedTargetTable}`;
                            setColumnMappings(prev => ({ ...prev, [key]: suggested }));
                            toast({ title: "Auto-suggest", description: `Đã tạo ${suggested.length} mappings` });
                          }
                        }}>
                          <Wand2 className="h-4 w-4 mr-1" />
                          Auto
                        </Button>
                      </div>
                    </div>

                    {/* Target Columns */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Columns className="h-4 w-4" />
                        Cột đích ({selectedTargetTable})
                      </h4>
                      <div className="space-y-2">
                        {targetTables.find(t => t.name === selectedTargetTable)?.columns.map(col => {
                          const key = `${selectedSourceTable}_${selectedTargetTable}`;
                          const mapping = columnMappings[key]?.find(m => m.targetColumn === col.name);
                          
                          return (
                            <div
                              key={col.name}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(col.name)}
                              className={`p-3 border rounded-lg transition-colors ${
                                mapping 
                                  ? mapping.typeCompatible 
                                    ? "bg-green-50 border-green-300 dark:bg-green-950" 
                                    : "bg-yellow-50 border-yellow-300 dark:bg-yellow-950"
                                  : "bg-muted/50 hover:bg-muted border-dashed"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{col.name}</span>
                                  {col.isPrimaryKey && <Badge variant="default" className="text-[10px]">PK</Badge>}
                                </div>
                                <span className="text-xs text-muted-foreground">{col.type}</span>
                              </div>
                              {mapping && (
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3 rotate-180" />
                                    {mapping.sourceColumn}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => removeMapping(mapping.sourceColumn)}
                                  >
                                    <Unlink2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {mapping && !mapping.typeCompatible && (
                                <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Type mismatch - cần transformation
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Transformation Rules */}
          <TabsContent value="transform" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Data Transformation
                </CardTitle>
                <CardDescription>Định nghĩa các quy tắc chuyển đổi dữ liệu trước khi migrate</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSourceTable && selectedTargetTable && (
                  <div className="space-y-4">
                    {columnMappings[`${selectedSourceTable}_${selectedTargetTable}`]?.map((mapping, index) => (
                      <div key={mapping.sourceColumn} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{mapping.sourceColumn}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-mono text-sm">{mapping.targetColumn}</span>
                          </div>
                          {!mapping.typeCompatible && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Type mismatch
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Transformation</Label>
                            <Select
                              value={mapping.transformation?.type || "none"}
                              onValueChange={(value) => {
                                const key = `${selectedSourceTable}_${selectedTargetTable}`;
                                const mappings = [...(columnMappings[key] || [])];
                                mappings[index] = {
                                  ...mapping,
                                  transformation: { type: value as TransformationRule["type"] }
                                };
                                setColumnMappings({ ...columnMappings, [key]: mappings });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Không chuyển đổi</SelectItem>
                                <SelectItem value="trim">Trim (xóa khoảng trắng)</SelectItem>
                                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                                <SelectItem value="lowercase">lowercase</SelectItem>
                                <SelectItem value="date_format">Date Format (YYYY-MM-DD)</SelectItem>
                                <SelectItem value="number_format">Number Format</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {mapping.transformation?.type === "number_format" && (
                            <div>
                              <Label>Số chữ số thập phân</Label>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                defaultValue={2}
                                onChange={(e) => {
                                  const key = `${selectedSourceTable}_${selectedTargetTable}`;
                                  const mappings = [...(columnMappings[key] || [])];
                                  mappings[index] = {
                                    ...mapping,
                                    transformation: {
                                      ...mapping.transformation!,
                                      params: { decimals: parseInt(e.target.value) }
                                    }
                                  };
                                  setColumnMappings({ ...columnMappings, [key]: mappings });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 5: Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Data Preview
                </CardTitle>
                <CardDescription>Xem trước dữ liệu sau khi áp dụng transformation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generatePreview}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tạo Preview
                </Button>

                {previewData.source.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Dữ liệu nguồn</h4>
                      <ScrollArea className="h-[400px] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(previewData.source[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.source.map((row, i) => (
                              <TableRow key={i}>
                                {Object.values(row).map((value, j) => (
                                  <TableCell key={j} className="font-mono text-xs">
                                    {value instanceof Date ? value.toISOString() : String(value ?? "NULL")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Dữ liệu sau transform</h4>
                      <ScrollArea className="h-[400px] border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData.transformed.length > 0 && Object.keys(previewData.transformed[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.transformed.map((row, i) => (
                              <TableRow key={i}>
                                {Object.values(row).map((value, j) => (
                                  <TableCell key={j} className="font-mono text-xs">
                                    {value instanceof Date ? value.toISOString() : String(value ?? "NULL")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 6: Execute */}
          <TabsContent value="execute" className="space-y-6">
            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tùy chọn Migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Tạo backup trước khi migrate</Label>
                        <p className="text-sm text-muted-foreground">Cho phép rollback nếu có lỗi</p>
                      </div>
                      <Switch
                        checked={options.createBackup}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, createBackup: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Xóa dữ liệu đích trước khi migrate</Label>
                        <p className="text-sm text-muted-foreground">TRUNCATE bảng đích</p>
                      </div>
                      <Switch
                        checked={options.truncateTarget}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, truncateTarget: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Validate dữ liệu sau migrate</Label>
                        <p className="text-sm text-muted-foreground">Kiểm tra tính toàn vẹn</p>
                      </div>
                      <Switch
                        checked={options.validateData}
                        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, validateData: checked }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Xử lý conflict</Label>
                      <Select
                        value={options.conflictResolution}
                        onValueChange={(value: "skip" | "overwrite" | "merge" | "ask") => setOptions(prev => ({ ...prev, conflictResolution: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Bỏ qua (Skip)</SelectItem>
                          <SelectItem value="overwrite">Ghi đè (Overwrite)</SelectItem>
                          <SelectItem value="merge">Merge</SelectItem>
                          <SelectItem value="ask">Hỏi từng trường hợp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Batch size</Label>
                      <Input
                        type="number"
                        value={options.batchSize}
                        onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))}
                        min={100}
                        max={10000}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Scheduling */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Lên lịch migration
                      </Label>
                      <p className="text-sm text-muted-foreground">Chạy vào thời điểm off-peak</p>
                    </div>
                    <Switch
                      checked={options.scheduleEnabled}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, scheduleEnabled: checked }))}
                    />
                  </div>
                  {options.scheduleEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Thời gian chạy</Label>
                        <Input
                          type="datetime-local"
                          value={options.scheduleTime}
                          onChange={(e) => setOptions(prev => ({ ...prev, scheduleTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Email Notification */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Thông báo email
                      </Label>
                      <p className="text-sm text-muted-foreground">Gửi email khi hoàn thành hoặc có lỗi</p>
                    </div>
                    <Switch
                      checked={options.emailNotification}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, emailNotification: checked }))}
                    />
                  </div>
                  {options.emailNotification && (
                    <div>
                      <Label>Email nhận thông báo</Label>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={options.notificationEmail}
                        onChange={(e) => setOptions(prev => ({ ...prev, notificationEmail: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress & Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tiến trình Migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMigrating && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Đang migrate: {currentMigratingTable}</p>
                        <p className="text-sm text-muted-foreground">
                          {processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Math.round(migrationProgress)}%</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          ~{estimatedTimeRemaining}s còn lại
                        </p>
                      </div>
                    </div>
                    <Progress value={migrationProgress} className="h-3" />
                  </div>
                )}

                {/* Migration Logs */}
                <div>
                  <Label>Logs</Label>
                  <ScrollArea className="h-[200px] border rounded-lg p-3 bg-muted/30 font-mono text-xs">
                    {migrationLogs.map((log, i) => (
                      <div key={i} className={`py-0.5 ${
                        log.includes("✓") ? "text-green-600" : 
                        log.includes("✗") ? "text-red-600" : ""
                      }`}>
                        {log}
                      </div>
                    ))}
                    {migrationLogs.length === 0 && (
                      <div className="text-muted-foreground">Chưa có logs...</div>
                    )}
                  </ScrollArea>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleStartMigration}
                    disabled={isMigrating || selectedSourceTables.length === 0}
                    className="flex-1"
                  >
                    {isMigrating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang migrate...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Bắt đầu Migration
                      </>
                    )}
                  </Button>
                  {isMigrating && (
                    <Button variant="destructive" onClick={() => setIsMigrating(false)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Dừng
                    </Button>
                  )}
                </div>

                {/* Summary */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tóm tắt</AlertTitle>
                  <AlertDescription>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <span className="text-muted-foreground">Số bảng:</span>{" "}
                        <strong>{selectedSourceTables.length}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tổng rows:</span>{" "}
                        <strong>{totalSelectedRows.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Backup:</span>{" "}
                        <strong>{options.createBackup ? "Có" : "Không"}</strong>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Migration History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Lịch sử Migration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Nguồn → Đích</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="text-right">Thời lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {migrationHistory.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.timestamp.toLocaleString("vi-VN")}</TableCell>
                        <TableCell>{log.sourceConnection} → {log.targetConnection}</TableCell>
                        <TableCell className="text-right">
                          {log.successRows.toLocaleString()}/{log.totalRows.toLocaleString()}
                          {log.failedRows > 0 && (
                            <span className="text-red-500 ml-1">({log.failedRows} failed)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{log.duration}s</TableCell>
                        <TableCell>
                          {log.status === "success" && <Badge className="bg-green-500">Thành công</Badge>}
                          {log.status === "partial" && <Badge className="bg-yellow-500">Một phần</Badge>}
                          {log.status === "failed" && <Badge variant="destructive">Thất bại</Badge>}
                          {log.status === "rolled_back" && <Badge variant="outline">Đã rollback</Badge>}
                        </TableCell>
                        <TableCell>
                          {log.backupId && log.status !== "rolled_back" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRollback(log.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <Button
            onClick={goToNextStep}
            disabled={!canGoNext || currentStepIndex === WIZARD_STEPS.length - 1}
          >
            Tiếp theo
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Conflict Resolution Dialog */}
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Phát hiện Conflict
              </DialogTitle>
              <DialogDescription>
                Dữ liệu trùng lặp được phát hiện. Vui lòng chọn cách xử lý.
              </DialogDescription>
            </DialogHeader>
            {currentConflict && (
              <div className="space-y-4">
                <div>
                  <Label>Bảng: {currentConflict.tableName}</Label>
                  <p className="text-sm text-muted-foreground">
                    Loại conflict: {currentConflict.conflictType}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground">Dữ liệu nguồn</Label>
                    <pre className="text-xs mt-1">{JSON.stringify(currentConflict.sourceData, null, 2)}</pre>
                  </div>
                  <div className="border rounded-lg p-3">
                    <Label className="text-xs text-muted-foreground">Dữ liệu đích (hiện có)</Label>
                    <pre className="text-xs mt-1">{JSON.stringify(currentConflict.targetData, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => handleConflictResolution("skip")}>
                Bỏ qua
              </Button>
              <Button variant="secondary" onClick={() => handleConflictResolution("merge")}>
                Merge
              </Button>
              <Button onClick={() => handleConflictResolution("overwrite")}>
                Ghi đè
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Profile Dialog */}
        <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lưu Migration Profile</DialogTitle>
              <DialogDescription>
                Lưu cấu hình hiện tại để tái sử dụng sau này
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tên Profile</Label>
                <Input
                  placeholder="VD: Production to Backup Daily"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveProfileDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
