import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Database, Shield, Play, CheckCircle, AlertCircle, Building2 } from "lucide-react";

export default function SeedDataPage() {
  const [results, setResults] = useState<{
    permissions?: { created: number; skipped: number };
    sampleData?: {
      connections: number;
      products: number;
      productionLines: number;
      workstations: number;
      specifications: number;
      samplingConfigs: number;
    };
  }>({});

  const initPermissionsMutation = trpc.seed.initPermissions.useMutation({
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, permissions: data }));
      toast.success(`Đã khởi tạo ${data.created} quyền mới, ${data.skipped} đã tồn tại`);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const seedSampleDataMutation = trpc.seed.seedSampleData.useMutation({
    onSuccess: (data) => {
      setResults(prev => ({ ...prev, sampleData: data }));
      const total = data.connections + data.products + data.productionLines + 
                    data.workstations + data.specifications + data.samplingConfigs;
      toast.success(`Đã tạo ${total} bản ghi dữ liệu mẫu`);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const runAllSeedsMutation = trpc.seed.runAllSeeds.useMutation({
    onSuccess: () => {
      toast.success("Đã chạy tất cả các seed thành công");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const seedRulesMutation = trpc.seed.seedRules.useMutation({
    onSuccess: () => {
      toast.success("Đã khởi tạo SPC/CA/CPK Rules mặc định thành công");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const seedAiDataMutation = trpc.seed.seedAiData.useMutation({
    onSuccess: () => {
      toast.success("Đã khởi tạo dữ liệu AI Training thành công");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const seedFactoryWorkshopMutation = trpc.factoryWorkshop.seedSampleData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khởi tạo Dữ liệu</h1>
          <p className="text-muted-foreground mt-1">
            Tạo dữ liệu mẫu và khởi tạo quyền mặc định cho hệ thống
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Initialize Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Khởi tạo Quyền
              </CardTitle>
              <CardDescription>
                Tạo 24 quyền mặc định và gán cho các vai trò (admin, operator, viewer, user)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => initPermissionsMutation.mutate()}
                disabled={initPermissionsMutation.isPending}
                className="w-full"
              >
                {initPermissionsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Khởi tạo quyền
                  </>
                )}
              </Button>

              {results.permissions && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Hoàn thành</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Tạo mới: {results.permissions.created} | Đã tồn tại: {results.permissions.skipped}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seed Sample Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                Dữ liệu Mẫu
              </CardTitle>
              <CardDescription>
                Tạo dữ liệu mẫu: sản phẩm, dây chuyền, công trạm, phương pháp lấy mẫu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => seedSampleDataMutation.mutate()}
                disabled={seedSampleDataMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {seedSampleDataMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Tạo dữ liệu mẫu
                  </>
                )}
              </Button>

              {results.sampleData && (
                <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Hoàn thành</span>
                  </div>
                  <div className="text-sm text-purple-600 mt-1 space-y-0.5">
                    <p>Kết nối DB: {results.sampleData.connections}</p>
                    <p>Sản phẩm: {results.sampleData.products}</p>
                    <p>Dây chuyền: {results.sampleData.productionLines}</p>
                    <p>Công trạm: {results.sampleData.workstations}</p>
                    <p>Lấy mẫu: {results.sampleData.samplingConfigs}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seed Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Khởi tạo Rules
              </CardTitle>
              <CardDescription>
                Tạo 8 SPC Rules (Western Electric), 4 CA Rules, 5 CPK Rules mặc định
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => seedRulesMutation.mutate()}
                disabled={seedRulesMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {seedRulesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Khởi tạo Rules
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                <p>• 8 SPC Rules (Western Electric)</p>
                <p>• 4 CA Rules (độ chính xác)</p>
                <p>• 5 CPK Rules (năng lực quy trình)</p>
              </div>
            </CardContent>
          </Card>

          {/* Seed AI Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Dữ liệu AI Training
              </CardTitle>
              <CardDescription>
                Tạo 5 datasets, 5 training jobs, 290 history records, 5 trained models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => seedAiDataMutation.mutate()}
                disabled={seedAiDataMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {seedAiDataMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Seed AI Data
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                <p>• 5 AI Training Datasets</p>
                <p>• 5 Training Jobs (completed/running/failed/pending)</p>
                <p>• 290 Training History records</p>
                <p>• 5 Trained Models (các modelType khác nhau)</p>
              </div>
            </CardContent>
          </Card>

          {/* Seed Factory/Workshop */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                Nhà máy & Xưởng
              </CardTitle>
              <CardDescription>
                Tạo 3 nhà máy mẫu và 12 xưởng sản xuất
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => seedFactoryWorkshopMutation.mutate()}
                disabled={seedFactoryWorkshopMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {seedFactoryWorkshopMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Tạo Factory/Workshop
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                <p>• 3 Nhà máy (Hà Nội, HCM, Đà Nẵng)</p>
                <p>• 12 Xưởng (SMT, Lắp ráp, QC, Đóng gói...)</p>
                <p>• Thông tin quản lý, công suất, vị trí</p>
              </div>
            </CardContent>
          </Card>

          {/* Run All Seeds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" />
                Chạy Tất cả
              </CardTitle>
              <CardDescription>
                Chạy tất cả các seed cùng một lúc (quyền + dữ liệu mẫu + rules)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => runAllSeedsMutation.mutate()}
                disabled={runAllSeedsMutation.isPending}
                className="w-full"
                variant="default"
              >
                {runAllSeedsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang chạy...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Chạy tất cả seeds
                  </>
                )}
              </Button>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2 text-amber-700">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <div>
                    <span className="font-medium">Lưu ý</span>
                    <p className="text-sm text-amber-600 mt-0.5">
                      Các bản ghi đã tồn tại sẽ được bỏ qua, không ghi đè
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Dữ liệu mẫu bao gồm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Sản phẩm (6)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  PCB Board Type A/B, IC Chip 8/16-bit, Capacitor, Resistor
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Dây chuyền (4)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  SMT Line 1/2, THT Line 1, Assembly Line 1
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Công trạm (6)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Solder Paste, Pick & Place, Reflow, AOI, ICT, FCT
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Phương pháp lấy mẫu (4)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Hourly, 30-min, Daily, Shift Sampling
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Quyền (24)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Dashboard, Analyze, Mapping, Product, Settings...
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Vai trò (4)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Admin (full), Operator, Viewer, User
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
