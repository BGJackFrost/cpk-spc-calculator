import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Factory, Building2, TrendingUp, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import CpkTrendChart from "@/components/CpkTrendChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  inactive: '#6b7280',
  maintenance: '#f59e0b',
};

export default function CapacityStatsWidget() {
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>("all");
  
  const { data: capacityStats, isLoading } = trpc.factoryWorkshop.getCapacityStats.useQuery({
    factoryId: selectedFactoryId !== "all" ? parseInt(selectedFactoryId) : undefined,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Thống kê công suất
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const factories = capacityStats?.factories || [];
  const workshops = capacityStats?.workshops || [];
  const totalCapacity = capacityStats?.totalCapacity || 0;

  // Prepare factory chart data
  const factoryChartData = factories.map((f, index) => ({
    name: f.code || f.name,
    fullName: f.name,
    capacity: f.capacity || 0,
    color: COLORS[index % COLORS.length],
  }));

  // Prepare workshop chart data
  const workshopChartData = workshops.map((w, index) => ({
    name: w.code || w.name,
    fullName: w.name,
    capacity: w.capacity || 0,
    productionLines: w.productionLineCount || 0,
    status: w.status,
    color: STATUS_COLORS[w.status || 'active'],
  }));

  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'Hoạt động', value: workshops.filter(w => w.status === 'active').length, color: STATUS_COLORS.active },
    { name: 'Bảo trì', value: workshops.filter(w => w.status === 'maintenance').length, color: STATUS_COLORS.maintenance },
    { name: 'Ngừng', value: workshops.filter(w => w.status === 'inactive').length, color: STATUS_COLORS.inactive },
  ].filter(s => s.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullName || label}</p>
          <p className="text-sm text-muted-foreground">
            Công suất: <span className="font-medium text-foreground">{(data.capacity || 0).toLocaleString()}</span> sp/ngày
          </p>
          {data.productionLines !== undefined && (
            <p className="text-sm text-muted-foreground">
              Dây chuyền: <span className="font-medium text-foreground">{data.productionLines}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Thống kê công suất Factory/Workshop
            </CardTitle>
            <CardDescription>
              Tổng công suất: {totalCapacity.toLocaleString()} sản phẩm/ngày
            </CardDescription>
          </div>
          <Select value={selectedFactoryId} onValueChange={setSelectedFactoryId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn nhà máy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhà máy</SelectItem>
              {factories.map((factory) => (
                <SelectItem key={factory.id} value={factory.id.toString()}>
                  {factory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="factory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="factory" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Theo Factory
            </TabsTrigger>
            <TabsTrigger value="workshop" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Theo Workshop
            </TabsTrigger>
            <TabsTrigger value="cpk-trend" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Trend CPK
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factory" className="space-y-4">
            {factoryChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={factoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
                      {factoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu nhà máy
              </div>
            )}
          </TabsContent>

          <TabsContent value="workshop" className="space-y-4">
            {workshopChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workshopChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
                      {workshopChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu xưởng
              </div>
            )}
            
            {/* Workshop status legend */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.active }} />
                <span className="text-sm">Hoạt động</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.maintenance }} />
                <span className="text-sm">Bảo trì</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.inactive }} />
                <span className="text-sm">Ngừng</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cpk-trend" className="space-y-4">
            <CpkTrendChart 
              workshopId={selectedFactoryId !== "all" ? undefined : undefined}
              showControls={true}
              height={350}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary cards */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Factory className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{factories.length}</p>
                          <p className="text-sm text-muted-foreground">Nhà máy</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{workshops.length}</p>
                          <p className="text-sm text-muted-foreground">Xưởng</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{totalCapacity.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Tổng công suất (sp/ngày)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top workshops by capacity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top xưởng theo công suất</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workshopChartData
                        .sort((a, b) => b.capacity - a.capacity)
                        .slice(0, 5)
                        .map((workshop, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                                {index + 1}
                              </Badge>
                              <span className="text-sm">{workshop.fullName}</span>
                            </div>
                            <span className="text-sm font-medium">{workshop.capacity.toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status pie chart */}
              <div className="h-[300px]">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Không có dữ liệu trạng thái
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
