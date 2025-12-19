import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  LICENSED_SYSTEMS, 
  SYSTEM_FEATURES, 
  LICENSE_TYPE_PRESETS,
  SystemId 
} from "@shared/licenseTypes";
import { 
  Key, 
  Building2, 
  Mail, 
  Users, 
  Layers, 
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";

interface LicenseCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function LicenseCreateDialog({ open, onOpenChange, onSuccess }: LicenseCreateDialogProps) {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Systems/Features, 3: Preview
  
  // Form state
  const [licenseType, setLicenseType] = useState<"trial" | "standard" | "professional" | "enterprise">("standard");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [maxUsers, setMaxUsers] = useState(10);
  const [maxProductionLines, setMaxProductionLines] = useState(5);
  const [maxSpcPlans, setMaxSpcPlans] = useState(20);
  const [durationDays, setDurationDays] = useState(365);
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState("VND");
  
  // Systems and Features
  const [selectedSystems, setSelectedSystems] = useState<SystemId[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<SystemId, string[]>>({
    spc: [],
    mms: [],
    production: [],
    license: [],
    system: [],
  });
  
  // Queries
  const generatedKeyQuery = trpc.license.generateKey.useQuery();
  
  // Mutations
  const createMutation = trpc.license.create.useMutation();
  
  // Apply preset when license type changes
  useEffect(() => {
    const preset = LICENSE_TYPE_PRESETS[licenseType];
    if (preset) {
      setSelectedSystems(preset.systems);
      setSelectedFeatures(preset.features);
    }
    
    // Set default values based on type
    switch (licenseType) {
      case "trial":
        setMaxUsers(5);
        setMaxProductionLines(1);
        setMaxSpcPlans(5);
        setDurationDays(30);
        setPrice(0);
        break;
      case "standard":
        setMaxUsers(10);
        setMaxProductionLines(3);
        setMaxSpcPlans(20);
        setDurationDays(365);
        setPrice(5000000);
        break;
      case "professional":
        setMaxUsers(50);
        setMaxProductionLines(10);
        setMaxSpcPlans(100);
        setDurationDays(365);
        setPrice(15000000);
        break;
      case "enterprise":
        setMaxUsers(999);
        setMaxProductionLines(999);
        setMaxSpcPlans(999);
        setDurationDays(365);
        setPrice(50000000);
        break;
    }
  }, [licenseType]);
  
  // Toggle system
  const toggleSystem = (systemId: SystemId) => {
    if (selectedSystems.includes(systemId)) {
      setSelectedSystems(prev => prev.filter(s => s !== systemId));
      setSelectedFeatures(prev => ({ ...prev, [systemId]: [] }));
    } else {
      setSelectedSystems(prev => [...prev, systemId]);
    }
  };
  
  // Toggle feature
  const toggleFeature = (systemId: SystemId, featureId: string) => {
    setSelectedFeatures(prev => {
      const current = prev[systemId] || [];
      if (current.includes(featureId)) {
        return { ...prev, [systemId]: current.filter(f => f !== featureId) };
      } else {
        return { ...prev, [systemId]: [...current, featureId] };
      }
    });
  };
  
  // Select all features for a system
  const selectAllFeatures = (systemId: SystemId) => {
    const allFeatures = SYSTEM_FEATURES[systemId].map(f => f.id);
    setSelectedFeatures(prev => ({ ...prev, [systemId]: allFeatures }));
  };
  
  // Clear all features for a system
  const clearAllFeatures = (systemId: SystemId) => {
    setSelectedFeatures(prev => ({ ...prev, [systemId]: [] }));
  };
  
  // Validate form
  const validateStep1 = () => {
    if (!companyName.trim()) {
      toast.error("Vui lòng nhập tên công ty");
      return false;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error("Email không hợp lệ");
      return false;
    }
    return true;
  };
  
  const validateStep2 = () => {
    if (selectedSystems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một hệ thống");
      return false;
    }
    return true;
  };
  
  // Handle create
  const handleCreate = async () => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      
      const result = await createMutation.mutateAsync({
        licenseKey: generatedKeyQuery.data?.licenseKey,
        licenseType,
        companyName: companyName || undefined,
        contactEmail: contactEmail || undefined,
        maxUsers,
        maxProductionLines,
        maxSpcPlans,
        expiresAt,
        systems: JSON.stringify(selectedSystems),
        systemFeatures: JSON.stringify(selectedFeatures),
      });
      
      toast.success(`Đã tạo license: ${result.licenseKey}`);
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Tạo license thất bại");
    }
  };
  
  // Reset form
  const resetForm = () => {
    setStep(1);
    setLicenseType("standard");
    setCompanyName("");
    setContactEmail("");
    setMaxUsers(10);
    setMaxProductionLines(5);
    setMaxSpcPlans(20);
    setDurationDays(365);
    setPrice(0);
    setCurrency("VND");
    setSelectedSystems([]);
    setSelectedFeatures({ spc: [], mms: [], production: [], license: [], system: [] });
  };
  
  // Format price
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };
  
  // Count total features
  const totalFeatures = Object.values(selectedFeatures).reduce((sum, arr) => sum + arr.length, 0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Tạo License Mới
          </DialogTitle>
          <DialogDescription>
            Bước {step}/3: {step === 1 ? "Thông tin cơ bản" : step === 2 ? "Chọn hệ thống & chức năng" : "Xem trước & xác nhận"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step ? "bg-primary text-primary-foreground" : 
                s < step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded ${s < step ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 py-4">
              {/* License Type */}
              <div className="space-y-2">
                <Label>Loại License</Label>
                <Select value={licenseType} onValueChange={(v: any) => setLicenseType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Trial</Badge>
                        <span>Dùng thử (30 ngày)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500">Standard</Badge>
                        <span>Tiêu chuẩn</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="professional">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500">Professional</Badge>
                        <span>Chuyên nghiệp</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="enterprise">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500">Enterprise</Badge>
                        <span>Doanh nghiệp</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Tên công ty <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nhập tên công ty"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email liên hệ
                  </Label>
                  <Input 
                    type="email"
                    value={contactEmail} 
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
              </div>
              
              {/* Limits */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Số người dùng tối đa
                  </Label>
                  <Input 
                    type="number"
                    value={maxUsers} 
                    onChange={(e) => setMaxUsers(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    Số dây chuyền tối đa
                  </Label>
                  <Input 
                    type="number"
                    value={maxProductionLines} 
                    onChange={(e) => setMaxProductionLines(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Số kế hoạch SPC tối đa
                  </Label>
                  <Input 
                    type="number"
                    value={maxSpcPlans} 
                    onChange={(e) => setMaxSpcPlans(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
              </div>
              
              {/* Duration & Price */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Thời hạn (ngày)
                  </Label>
                  <Input 
                    type="number"
                    value={durationDays} 
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Giá
                  </Label>
                  <Input 
                    type="number"
                    value={price} 
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đơn vị tiền tệ</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND">VND</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Systems & Features */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Đã chọn: {selectedSystems.length} hệ thống, {totalFeatures} chức năng
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const preset = LICENSE_TYPE_PRESETS[licenseType];
                    if (preset) {
                      setSelectedSystems(preset.systems);
                      setSelectedFeatures(preset.features);
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Áp dụng preset {licenseType}
                </Button>
              </div>
              
              <Tabs defaultValue="spc" className="w-full">
                <TabsList className="grid grid-cols-5 w-full">
                  {(Object.keys(LICENSED_SYSTEMS) as SystemId[]).map((systemId) => (
                    <TabsTrigger 
                      key={systemId} 
                      value={systemId}
                      className="relative"
                    >
                      {LICENSED_SYSTEMS[systemId].name}
                      {selectedSystems.includes(systemId) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {(Object.keys(LICENSED_SYSTEMS) as SystemId[]).map((systemId) => (
                  <TabsContent key={systemId} value={systemId} className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedSystems.includes(systemId)}
                              onCheckedChange={() => toggleSystem(systemId)}
                            />
                            <div>
                              <CardTitle className="text-lg" style={{ color: LICENSED_SYSTEMS[systemId].color }}>
                                {LICENSED_SYSTEMS[systemId].name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {LICENSED_SYSTEMS[systemId].description}
                              </p>
                            </div>
                          </div>
                          {selectedSystems.includes(systemId) && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => selectAllFeatures(systemId)}
                              >
                                Chọn tất cả
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => clearAllFeatures(systemId)}
                              >
                                Bỏ chọn
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      {selectedSystems.includes(systemId) && (
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {SYSTEM_FEATURES[systemId].map((feature) => (
                              <div 
                                key={feature.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                                  selectedFeatures[systemId]?.includes(feature.id) 
                                    ? "border-primary bg-primary/5" 
                                    : "border-transparent hover:bg-muted"
                                }`}
                                onClick={() => toggleFeature(systemId, feature.id)}
                              >
                                <Checkbox 
                                  checked={selectedFeatures[systemId]?.includes(feature.id)}
                                  onCheckedChange={() => toggleFeature(systemId, feature.id)}
                                />
                                <div>
                                  <p className="text-sm font-medium">{feature.name}</p>
                                  <p className="text-xs text-muted-foreground">{feature.nameEn}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
          
          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Xem trước License
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* License Key */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">License Key</Label>
                    <p className="font-mono text-lg font-bold">
                      {generatedKeyQuery.data?.licenseKey || "Đang tạo..."}
                    </p>
                  </div>
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Loại License</Label>
                      <p className="font-medium">
                        <Badge className={
                          licenseType === "trial" ? "bg-gray-500" :
                          licenseType === "standard" ? "bg-blue-500" :
                          licenseType === "professional" ? "bg-purple-500" :
                          "bg-amber-500"
                        }>
                          {licenseType.toUpperCase()}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Công ty</Label>
                      <p className="font-medium">{companyName || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="font-medium">{contactEmail || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Thời hạn</Label>
                      <p className="font-medium">{durationDays} ngày</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{maxUsers}</p>
                      <p className="text-xs text-muted-foreground">Người dùng</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Layers className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{maxProductionLines}</p>
                      <p className="text-xs text-muted-foreground">Dây chuyền</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{maxSpcPlans}</p>
                      <p className="text-xs text-muted-foreground">Kế hoạch SPC</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Systems & Features */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Hệ thống & Chức năng</Label>
                    <div className="space-y-3">
                      {selectedSystems.map((systemId) => (
                        <div key={systemId} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: LICENSED_SYSTEMS[systemId].color }}
                            />
                            <span className="font-medium">{LICENSED_SYSTEMS[systemId].name}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {selectedFeatures[systemId]?.length || 0} chức năng
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedFeatures[systemId]?.map((featureId) => {
                              const feature = SYSTEM_FEATURES[systemId].find(f => f.id === featureId);
                              return (
                                <Badge key={featureId} variant="outline" className="text-xs">
                                  {feature?.name || featureId}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Price */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Giá trị License</Label>
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(price)} {currency}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            {step < 3 ? (
              <Button 
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                  setStep(step + 1);
                }}
              >
                Tiếp tục
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo License"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
