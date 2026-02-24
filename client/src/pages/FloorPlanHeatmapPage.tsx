/**
 * FloorPlanHeatmapPage - Trang hiển thị bản đồ nhiệt yield rate nhà máy
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FloorPlanHeatMap } from "@/components/FloorPlanHeatMap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Thermometer, 
  RefreshCw, 
  Download, 
  Factory,
  Building2,
  Calendar,
  Info
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function FloorPlanHeatmapPage() {
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Filter workshops based on selected factory
  const filteredWorkshops = hierarchyOptions?.workshops?.filter(w => 
    selectedFactory === "all" || w.factoryId === parseInt(selectedFactory)
  ) || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refetch
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export heat map");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Thermometer className="h-8 w-8 text-primary" />
              Bản đồ Nhiệt Nhà máy
            </h1>
            <p className="text-muted-foreground mt-1">
              Hiển thị yield rate theo vùng sản xuất với màu sắc gradient
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Factory Filter */}
            <Select value={selectedFactory} onValueChange={setSelectedFactory}>
              <SelectTrigger className="w-[150px]">
                <Factory className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhà máy</SelectItem>
                {hierarchyOptions?.factories?.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workshop Filter */}
            <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
              <SelectTrigger className="w-[150px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà xưởng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả xưởng</SelectItem>
                {filteredWorkshops.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Range */}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "1h" | "6h" | "24h" | "7d")}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="6h">6 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Chú thích màu sắc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500"></div>
                <span className="text-sm">Yield &gt; 95% (Tốt)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-500"></div>
                <span className="text-sm">Yield 85-95% (Trung bình)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-orange-500"></div>
                <span className="text-sm">Yield 70-85% (Cảnh báo)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-500"></div>
                <span className="text-sm">Yield &lt; 70% (Kém)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heat Map Component */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Bản đồ Nhiệt Yield Rate
            </CardTitle>
            <CardDescription>
              Hover vào từng vùng để xem chi tiết yield rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FloorPlanHeatMap 
              factoryId={selectedFactory !== "all" ? parseInt(selectedFactory) : undefined}
              workshopId={selectedWorkshop !== "all" ? parseInt(selectedWorkshop) : undefined}
              timeRange={timeRange}
            />
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vùng tốt</p>
                  <p className="text-2xl font-bold text-green-500">12</p>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  &gt;95%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vùng trung bình</p>
                  <p className="text-2xl font-bold text-yellow-500">5</p>
                </div>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                  85-95%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vùng cảnh báo</p>
                  <p className="text-2xl font-bold text-orange-500">2</p>
                </div>
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  70-85%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vùng kém</p>
                  <p className="text-2xl font-bold text-red-500">1</p>
                </div>
                <Badge variant="outline" className="text-red-500 border-red-500">
                  &lt;70%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
