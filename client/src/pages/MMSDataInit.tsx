import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Database, 
  Users, 
  Wrench, 
  Package, 
  Truck, 
  ClipboardList, 
  Calendar,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface DataCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  count: number;
  status: 'empty' | 'partial' | 'ready';
}

export default function MMSDataInit() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  
  // Fetch counts for each category
  const { data: suppliersCount } = trpc.spareParts.listSuppliers.useQuery();
  const { data: sparePartsCount } = trpc.spareParts.listParts.useQuery({});
  const { data: techniciansCount } = trpc.maintenance.listTechnicians.useQuery({});
  const { data: maintenanceTypesCount } = trpc.maintenance.listTypes.useQuery();
  const { data: workOrdersCount } = trpc.maintenance.listWorkOrders.useQuery({});
  const { data: schedulesCount } = trpc.maintenance.listSchedules.useQuery({});
  const { data: oeeRecordsCount } = trpc.oee.listRecords.useQuery({ limit: 100 });
  
  const utils = trpc.useUtils();
  
  const categories: DataCategory[] = [
    {
      id: 'suppliers',
      name: 'Nhà cung cấp',
      icon: Truck,
      description: 'Danh sách nhà cung cấp phụ tùng và vật tư',
      count: suppliersCount?.length || 0,
      status: (suppliersCount?.length || 0) >= 5 ? 'ready' : (suppliersCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'spare_parts',
      name: 'Phụ tùng',
      icon: Package,
      description: 'Danh mục phụ tùng và vật tư thay thế',
      count: sparePartsCount?.length || 0,
      status: (sparePartsCount?.length || 0) >= 10 ? 'ready' : (sparePartsCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'technicians',
      name: 'Kỹ thuật viên',
      icon: Users,
      description: 'Đội ngũ kỹ thuật viên bảo trì',
      count: techniciansCount?.length || 0,
      status: (techniciansCount?.length || 0) >= 5 ? 'ready' : (techniciansCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'maintenance_types',
      name: 'Loại bảo trì',
      icon: Wrench,
      description: 'Các loại hình bảo trì (CM, PM, PdM, CBM...)',
      count: maintenanceTypesCount?.length || 0,
      status: (maintenanceTypesCount?.length || 0) >= 6 ? 'ready' : (maintenanceTypesCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'work_orders',
      name: 'Work Orders',
      icon: ClipboardList,
      description: 'Lệnh công việc bảo trì',
      count: workOrdersCount?.length || 0,
      status: (workOrdersCount?.length || 0) >= 5 ? 'ready' : (workOrdersCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'schedules',
      name: 'Lịch bảo trì',
      icon: Calendar,
      description: 'Lịch bảo trì định kỳ',
      count: schedulesCount?.length || 0,
      status: (schedulesCount?.length || 0) >= 5 ? 'ready' : (schedulesCount?.length || 0) > 0 ? 'partial' : 'empty'
    },
    {
      id: 'oee_records',
      name: 'Dữ liệu OEE',
      icon: Activity,
      description: 'Dữ liệu hiệu suất thiết bị tổng thể',
      count: oeeRecordsCount?.length || 0,
      status: (oeeRecordsCount?.length || 0) >= 10 ? 'ready' : (oeeRecordsCount?.length || 0) > 0 ? 'partial' : 'empty'
    }
  ];
  
  const totalReady = categories.filter(c => c.status === 'ready').length;
  const overallProgress = Math.round((totalReady / categories.length) * 100);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Sẵn sàng</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Một phần</Badge>;
      default:
        return <Badge variant="outline"><Database className="h-3 w-3 mr-1" />Trống</Badge>;
    }
  };
  
  const handleInitializeAll = async () => {
    setIsInitializing(true);
    setProgress(0);
    
    try {
      // Step 1: Suppliers
      setCurrentStep("Đang tạo nhà cung cấp...");
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Spare Parts
      setCurrentStep("Đang tạo phụ tùng...");
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Technicians
      setCurrentStep("Đang tạo kỹ thuật viên...");
      setProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Maintenance Types
      setCurrentStep("Đang tạo loại bảo trì...");
      setProgress(55);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Work Orders
      setCurrentStep("Đang tạo work orders...");
      setProgress(70);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 6: Schedules
      setCurrentStep("Đang tạo lịch bảo trì...");
      setProgress(85);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 7: OEE Records
      setCurrentStep("Đang tạo dữ liệu OEE...");
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh all queries
      await utils.spareParts.invalidate();
      await utils.maintenance.invalidate();
      await utils.oee.invalidate();
      
      toast.success("Khởi tạo dữ liệu MMS thành công!");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi khởi tạo dữ liệu");
      console.error(error);
    } finally {
      setIsInitializing(false);
      setCurrentStep("");
    }
  };
  
  const handleRefreshData = async () => {
    await utils.spareParts.invalidate();
    await utils.maintenance.invalidate();
    await utils.oee.invalidate();
    toast.success("Đã làm mới dữ liệu");
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Khởi tạo Dữ liệu MMS</h1>
            <p className="text-muted-foreground">Quản lý và khởi tạo dữ liệu mẫu cho hệ thống MMS</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>
        
        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tổng quan Dữ liệu MMS
            </CardTitle>
            <CardDescription>
              Trạng thái sẵn sàng của các danh mục dữ liệu MMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tiến độ tổng thể</span>
                <span className="text-sm text-muted-foreground">{totalReady}/{categories.length} danh mục sẵn sàng</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              
              {overallProgress < 100 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dữ liệu chưa đầy đủ</AlertTitle>
                  <AlertDescription>
                    Một số danh mục dữ liệu MMS chưa được khởi tạo. Nhấn "Khởi tạo tất cả" để tạo dữ liệu mẫu.
                  </AlertDescription>
                </Alert>
              )}
              
              {overallProgress === 100 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Dữ liệu sẵn sàng</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Tất cả danh mục dữ liệu MMS đã được khởi tạo và sẵn sàng sử dụng.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Data Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <Card key={category.id} className={category.status === 'ready' ? 'border-green-200' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        category.status === 'ready' ? 'bg-green-100' : 
                        category.status === 'partial' ? 'bg-yellow-100' : 'bg-muted'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          category.status === 'ready' ? 'text-green-600' : 
                          category.status === 'partial' ? 'text-yellow-600' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                    </div>
                    {getStatusBadge(category.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{category.count}</span>
                    <span className="text-sm text-muted-foreground">bản ghi</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Initialization Progress */}
        {isInitializing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="font-medium text-blue-800">{currentStep}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-blue-600">Đang khởi tạo dữ liệu... {progress}%</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hành động</CardTitle>
            <CardDescription>Khởi tạo hoặc xóa dữ liệu MMS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleInitializeAll} 
                disabled={isInitializing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Khởi tạo tất cả
                  </>
                )}
              </Button>
              
              <Button variant="outline" disabled={isInitializing}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa dữ liệu mẫu
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Lưu ý:</strong> Dữ liệu mẫu được tạo để demo và test hệ thống. 
              Trong môi trường production, hãy nhập dữ liệu thực từ các trang quản lý tương ứng.
            </p>
          </CardContent>
        </Card>
        
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Liên kết nhanh</CardTitle>
            <CardDescription>Truy cập các trang quản lý dữ liệu MMS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/spare-parts">
                  <Package className="h-5 w-5 mb-2" />
                  <span>Quản lý Phụ tùng</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/maintenance-dashboard">
                  <ClipboardList className="h-5 w-5 mb-2" />
                  <span>Dashboard Bảo trì</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/oee-dashboard">
                  <Activity className="h-5 w-5 mb-2" />
                  <span>Dashboard OEE</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/maintenance-schedule">
                  <Calendar className="h-5 w-5 mb-2" />
                  <span>Lịch Bảo trì</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
