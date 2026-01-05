/**
 * IoTFirmwareOTA - Trang quản lý Firmware OTA Update cho thiết bị IoT
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Upload, Package, Rocket, Play, Pause, XCircle, 
  RefreshCw, CheckCircle, AlertTriangle, Clock, 
  Download, RotateCcw, Cpu, Server, Wifi
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Status badge colors
const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  published: "bg-green-500",
  deprecated: "bg-yellow-500",
  archived: "bg-red-500",
  scheduled: "bg-blue-500",
  in_progress: "bg-purple-500",
  paused: "bg-orange-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
  failed: "bg-red-500",
  pending: "bg-gray-400",
  downloading: "bg-blue-400",
  downloaded: "bg-blue-500",
  installing: "bg-purple-400",
  verifying: "bg-purple-500",
  rollback: "bg-orange-500",
};

const deviceTypeIcons: Record<string, React.ReactNode> = {
  plc: <Cpu className="h-4 w-4" />,
  sensor: <Wifi className="h-4 w-4" />,
  gateway: <Server className="h-4 w-4" />,
  hmi: <Cpu className="h-4 w-4" />,
  scada: <Server className="h-4 w-4" />,
  other: <Cpu className="h-4 w-4" />,
};

export default function IoTFirmwareOTA() {
  const [activeTab, setActiveTab] = useState("packages");
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [showCreateDeployment, setShowCreateDeployment] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<number | null>(null);
  
  // Form states
  const [packageForm, setPackageForm] = useState({
    name: "",
    version: "",
    description: "",
    deviceType: "plc" as const,
    manufacturer: "",
    model: "",
    releaseNotes: "",
    minRequiredVersion: "",
    isStable: true,
    isBeta: false,
  });
  
  const [deploymentForm, setDeploymentForm] = useState({
    name: "",
    description: "",
    firmwarePackageId: 0,
    deploymentType: "immediate" as const,
    targetDeviceIds: [] as number[],
    rollbackEnabled: true,
    rollbackOnFailurePercent: 20,
  });

  // Queries
  const { data: packages, refetch: refetchPackages } = trpc.firmwareOta.listPackages.useQuery({});
  const { data: deployments, refetch: refetchDeployments } = trpc.firmwareOta.listDeployments.useQuery({});
  const { data: devices } = trpc.iotDeviceManagement.listDevices.useQuery({});
  
  // Get device statuses for selected deployment
  const { data: deviceStatuses, refetch: refetchStatuses } = trpc.firmwareOta.getDeviceStatuses.useQuery(
    { deploymentId: selectedDeployment! },
    { enabled: !!selectedDeployment, refetchInterval: 2000 }
  );

  // Mutations
  const createPackage = trpc.firmwareOta.createPackage.useMutation({
    onSuccess: () => {
      toast.success("Tạo firmware package thành công");
      setShowCreatePackage(false);
      refetchPackages();
      resetPackageForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishPackage = trpc.firmwareOta.publishPackage.useMutation({
    onSuccess: () => {
      toast.success("Đã publish firmware package");
      refetchPackages();
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePackage = trpc.firmwareOta.deletePackage.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa firmware package");
      refetchPackages();
    },
    onError: (err) => toast.error(err.message),
  });

  const createDeployment = trpc.firmwareOta.createDeployment.useMutation({
    onSuccess: () => {
      toast.success("Tạo deployment thành công");
      setShowCreateDeployment(false);
      refetchDeployments();
      resetDeploymentForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const startDeployment = trpc.firmwareOta.startDeployment.useMutation({
    onSuccess: () => {
      toast.success("Đã bắt đầu deployment");
      refetchDeployments();
    },
    onError: (err) => toast.error(err.message),
  });

  const pauseDeployment = trpc.firmwareOta.pauseDeployment.useMutation({
    onSuccess: () => {
      toast.success("Đã tạm dừng deployment");
      refetchDeployments();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelDeployment = trpc.firmwareOta.cancelDeployment.useMutation({
    onSuccess: () => {
      toast.success("Đã hủy deployment");
      refetchDeployments();
    },
    onError: (err) => toast.error(err.message),
  });

  const simulateAll = trpc.firmwareOta.simulateAllPending.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã bắt đầu mô phỏng ${data.count} thiết bị`);
    },
    onError: (err) => toast.error(err.message),
  });

  const retryDevice = trpc.firmwareOta.retryDevice.useMutation({
    onSuccess: () => {
      toast.success("Đã retry thiết bị");
      refetchStatuses();
    },
    onError: (err) => toast.error(err.message),
  });

  const rollbackDevice = trpc.firmwareOta.rollbackDevice.useMutation({
    onSuccess: () => {
      toast.success("Đã rollback thiết bị");
      refetchStatuses();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPackageForm = () => {
    setPackageForm({
      name: "",
      version: "",
      description: "",
      deviceType: "plc",
      manufacturer: "",
      model: "",
      releaseNotes: "",
      minRequiredVersion: "",
      isStable: true,
      isBeta: false,
    });
  };

  const resetDeploymentForm = () => {
    setDeploymentForm({
      name: "",
      description: "",
      firmwarePackageId: 0,
      deploymentType: "immediate",
      targetDeviceIds: [],
      rollbackEnabled: true,
      rollbackOnFailurePercent: 20,
    });
  };

  const handleCreatePackage = () => {
    if (!packageForm.name || !packageForm.version) {
      toast.error("Vui lòng nhập tên và version");
      return;
    }
    
    // Demo: Create with placeholder URL
    createPackage.mutate({
      ...packageForm,
      fileUrl: `https://storage.example.com/firmware/${packageForm.name}-${packageForm.version}.bin`,
      fileSize: 1024 * 1024 * 5, // 5MB demo
      checksum: "sha256_demo_checksum_" + Date.now(),
    });
  };

  const handleCreateDeployment = () => {
    if (!deploymentForm.name || !deploymentForm.firmwarePackageId || deploymentForm.targetDeviceIds.length === 0) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    createDeployment.mutate(deploymentForm);
  };

  const toggleDeviceSelection = (deviceId: number) => {
    setDeploymentForm(prev => ({
      ...prev,
      targetDeviceIds: prev.targetDeviceIds.includes(deviceId)
        ? prev.targetDeviceIds.filter(id => id !== deviceId)
        : [...prev.targetDeviceIds, deviceId]
    }));
  };

  const selectAllDevices = () => {
    if (devices) {
      setDeploymentForm(prev => ({
        ...prev,
        targetDeviceIds: devices.map(d => d.id)
      }));
    }
  };

  const getDeploymentProgress = (deployment: any) => {
    const total = deployment.totalDevices || 0;
    if (total === 0) return 0;
    return Math.round(((deployment.successCount + deployment.failedCount) / total) * 100);
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Firmware OTA Update
          </h1>
          <p className="text-muted-foreground">
            Quản lý và cập nhật firmware từ xa cho thiết bị IoT
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetchPackages(); refetchDeployments(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Firmware Packages</p>
                <p className="text-2xl font-bold">{packages?.length || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deployments</p>
                <p className="text-2xl font-bold">
                  {deployments?.filter(d => d.status === "in_progress").length || 0}
                </p>
              </div>
              <Rocket className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {deployments?.filter(d => d.status === "completed").length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">
                  {deployments?.filter(d => d.status === "failed").length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="packages">Firmware Packages</TabsTrigger>
          <TabsTrigger value="deployments">OTA Deployments</TabsTrigger>
          {selectedDeployment && (
            <TabsTrigger value="status">Device Status</TabsTrigger>
          )}
        </TabsList>

        {/* Firmware Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreatePackage} onOpenChange={setShowCreatePackage}>
              <DialogTrigger asChild>
                <Button>
                  <Package className="h-4 w-4 mr-2" />
                  Tạo Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tạo Firmware Package</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Tên Package *</Label>
                    <Input
                      value={packageForm.name}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: PLC-Firmware"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Version *</Label>
                    <Input
                      value={packageForm.version}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="VD: 2.1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại thiết bị</Label>
                    <Select
                      value={packageForm.deviceType}
                      onValueChange={(v: any) => setPackageForm(prev => ({ ...prev, deviceType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plc">PLC</SelectItem>
                        <SelectItem value="sensor">Sensor</SelectItem>
                        <SelectItem value="gateway">Gateway</SelectItem>
                        <SelectItem value="hmi">HMI</SelectItem>
                        <SelectItem value="scada">SCADA</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Min Required Version</Label>
                    <Input
                      value={packageForm.minRequiredVersion}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, minRequiredVersion: e.target.value }))}
                      placeholder="VD: 2.0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      value={packageForm.manufacturer}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={packageForm.model}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={packageForm.description}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Release Notes</Label>
                    <Textarea
                      value={packageForm.releaseNotes}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, releaseNotes: e.target.value }))}
                      rows={3}
                      placeholder="Các thay đổi trong phiên bản này..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={packageForm.isStable}
                        onCheckedChange={(v) => setPackageForm(prev => ({ ...prev, isStable: !!v }))}
                      />
                      <Label>Stable</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={packageForm.isBeta}
                        onCheckedChange={(v) => setPackageForm(prev => ({ ...prev, isBeta: !!v }))}
                      />
                      <Label>Beta</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreatePackage(false)}>Hủy</Button>
                  <Button onClick={handleCreatePackage} disabled={createPackage.isPending}>
                    {createPackage.isPending ? "Đang tạo..." : "Tạo Package"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {packages?.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        {deviceTypeIcons[pkg.deviceType] || <Package className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{pkg.name}</h3>
                          <Badge variant="outline">v{pkg.version}</Badge>
                          <Badge className={statusColors[pkg.status || "draft"]}>
                            {pkg.status}
                          </Badge>
                          {pkg.isStable === 1 && <Badge variant="secondary">Stable</Badge>}
                          {pkg.isBeta === 1 && <Badge variant="outline">Beta</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pkg.deviceType.toUpperCase()} • {pkg.manufacturer || "N/A"} • {pkg.model || "N/A"}
                        </p>
                        {pkg.description && (
                          <p className="text-sm mt-2">{pkg.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Size: {((pkg.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
                          <span>Downloads: {pkg.downloadCount || 0}</span>
                          {pkg.minRequiredVersion && (
                            <span>Min version: {pkg.minRequiredVersion}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pkg.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => publishPackage.mutate({ id: pkg.id })}
                          disabled={publishPackage.isPending}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      )}
                      {pkg.status === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPackage(pkg.id);
                            setDeploymentForm(prev => ({ ...prev, firmwarePackageId: pkg.id }));
                            setShowCreateDeployment(true);
                          }}
                        >
                          <Rocket className="h-4 w-4 mr-1" />
                          Deploy
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePackage.mutate({ id: pkg.id })}
                        disabled={deletePackage.isPending}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!packages || packages.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có firmware package nào</p>
                  <Button className="mt-4" onClick={() => setShowCreatePackage(true)}>
                    Tạo Package đầu tiên
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* OTA Deployments Tab */}
        <TabsContent value="deployments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showCreateDeployment} onOpenChange={setShowCreateDeployment}>
              <DialogTrigger asChild>
                <Button>
                  <Rocket className="h-4 w-4 mr-2" />
                  Tạo Deployment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tạo OTA Deployment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên Deployment *</Label>
                      <Input
                        value={deploymentForm.name}
                        onChange={(e) => setDeploymentForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="VD: Update PLC v2.1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Firmware Package *</Label>
                      <Select
                        value={deploymentForm.firmwarePackageId.toString()}
                        onValueChange={(v) => setDeploymentForm(prev => ({ ...prev, firmwarePackageId: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn firmware" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages?.filter(p => p.status === "published").map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                              {pkg.name} v{pkg.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={deploymentForm.description}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loại Deployment</Label>
                      <Select
                        value={deploymentForm.deploymentType}
                        onValueChange={(v: any) => setDeploymentForm(prev => ({ ...prev, deploymentType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Ngay lập tức</SelectItem>
                          <SelectItem value="scheduled">Lên lịch</SelectItem>
                          <SelectItem value="phased">Theo giai đoạn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rollback khi thất bại (%)</Label>
                      <Input
                        type="number"
                        value={deploymentForm.rollbackOnFailurePercent}
                        onChange={(e) => setDeploymentForm(prev => ({ 
                          ...prev, 
                          rollbackOnFailurePercent: parseInt(e.target.value) || 20 
                        }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={deploymentForm.rollbackEnabled}
                      onCheckedChange={(v) => setDeploymentForm(prev => ({ ...prev, rollbackEnabled: !!v }))}
                    />
                    <Label>Cho phép rollback tự động</Label>
                  </div>
                  
                  {/* Device Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Chọn thiết bị ({deploymentForm.targetDeviceIds.length} đã chọn)</Label>
                      <Button variant="outline" size="sm" onClick={selectAllDevices}>
                        Chọn tất cả
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto p-2">
                      {devices?.map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => toggleDeviceSelection(device.id)}
                        >
                          <Checkbox
                            checked={deploymentForm.targetDeviceIds.includes(device.id)}
                            onCheckedChange={() => toggleDeviceSelection(device.id)}
                          />
                          <span className="font-medium">{device.deviceCode}</span>
                          <span className="text-muted-foreground">{device.deviceName}</span>
                          <Badge variant="outline" className="ml-auto">{device.deviceType}</Badge>
                        </div>
                      ))}
                      {(!devices || devices.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">
                          Không có thiết bị nào
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDeployment(false)}>Hủy</Button>
                  <Button onClick={handleCreateDeployment} disabled={createDeployment.isPending}>
                    {createDeployment.isPending ? "Đang tạo..." : "Tạo Deployment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {deployments?.map((deployment) => (
              <Card key={deployment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{deployment.name}</h3>
                        <Badge className={statusColors[deployment.status || "draft"]}>
                          {deployment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Firmware: {deployment.firmwareName} v{deployment.firmwareVersion}
                      </p>
                      {deployment.description && (
                        <p className="text-sm mt-2">{deployment.description}</p>
                      )}
                      
                      {/* Progress */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Tiến độ</span>
                          <span>{getDeploymentProgress(deployment)}%</span>
                        </div>
                        <Progress value={getDeploymentProgress(deployment)} />
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {deployment.successCount} thành công
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            {deployment.failedCount} thất bại
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-500" />
                            {deployment.pendingCount} chờ
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3 text-purple-500" />
                            {deployment.inProgressCount} đang chạy
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {deployment.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => startDeployment.mutate({ id: deployment.id })}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Bắt đầu
                        </Button>
                      )}
                      {deployment.status === "in_progress" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseDeployment.mutate({ id: deployment.id })}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Tạm dừng
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => simulateAll.mutate({ deploymentId: deployment.id })}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Mô phỏng
                          </Button>
                        </>
                      )}
                      {deployment.status === "paused" && (
                        <Button
                          size="sm"
                          onClick={() => startDeployment.mutate({ id: deployment.id })}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Tiếp tục
                        </Button>
                      )}
                      {["draft", "scheduled", "in_progress", "paused"].includes(deployment.status || "") && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelDeployment.mutate({ id: deployment.id })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Hủy
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDeployment(deployment.id);
                          setActiveTab("status");
                        }}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!deployments || deployments.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có deployment nào</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Device Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {selectedDeployment && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Trạng thái thiết bị - Deployment #{selectedDeployment}</h3>
                <Button variant="outline" onClick={() => refetchStatuses()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </div>
              <div className="grid gap-2">
                {deviceStatuses?.map((status) => (
                  <Card key={status.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <p className="font-medium">{status.deviceCode || `Device #${status.deviceId}`}</p>
                            <p className="text-xs text-muted-foreground">{status.deviceName}</p>
                          </div>
                          <Badge className={statusColors[status.status || "pending"]}>
                            {status.status}
                          </Badge>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              {status.previousVersion || "N/A"} → {status.targetVersion}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {status.status === "downloading" && (
                            <div className="w-32">
                              <Progress value={status.downloadProgress || 0} className="h-2" />
                              <p className="text-xs text-center mt-1">{status.downloadProgress}%</p>
                            </div>
                          )}
                          {status.status === "installing" && (
                            <div className="w-32">
                              <Progress value={status.installProgress || 0} className="h-2" />
                              <p className="text-xs text-center mt-1">{status.installProgress}%</p>
                            </div>
                          )}
                          {status.status === "failed" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retryDevice.mutate({ id: status.id })}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Retry
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => rollbackDevice.mutate({ id: status.id })}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Rollback
                              </Button>
                            </div>
                          )}
                          {status.errorMessage && (
                            <span className="text-xs text-red-500 max-w-xs truncate">
                              {status.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
