/**
 * Plant KPI Dashboard Enhanced
 * Task: DSH-02
 * Dashboard KPI nhà máy với drill-down capability
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Factory, Target, TrendingUp, TrendingDown, ChevronRight,
  BarChart3, Activity, Gauge, Zap, Package, Users, Clock,
  ArrowLeft, RefreshCw, Download, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap, Cell
} from "recharts";

// Types
type DrillLevel = "plant" | "area" | "line" | "machine";

interface DrillPath {
  level: DrillLevel;
  id?: number;
  name: string;
}

// KPI Card with drill-down
function DrillableKPICard({ 
  title, 
  value, 
  unit, 
  target, 
  trend, 
  icon: Icon, 
  color,
  onClick,
  hasChildren = true
}: { 
  title: string; 
  value: number; 
  unit: string; 
  target?: number; 
  trend?: number; 
  icon: any; 
  color: string;
  onClick?: () => void;
  hasChildren?: boolean;
}) {
  const isGood = target ? value >= target : trend ? trend >= 0 : true;
  const progressValue = target ? (value / target) * 100 : value;
  
  return (
    <Card 
      className={`${hasChildren ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              {hasChildren && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-3xl font-bold ${color}`}>
                {typeof value === "number" ? value.toFixed(1) : value}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {target && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Tiến độ</span>
                  <span>{progressValue.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(progressValue, 100)} className="h-1.5" />
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${isGood ? "bg-green-100" : "bg-red-100"}`}>
            <Icon className={`h-6 w-6 ${isGood ? "text-green-600" : "text-red-600"}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(trend).toFixed(1)}% so với kỳ trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlantKPIDashboardEnhanced() {
  const [timeRange, setTimeRange] = useState("30d");
  const [drillPath, setDrillPath] = useState<DrillPath[]>([
    { level: "plant", name: "Nhà máy" }
  ]);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  // Fetch data
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Current drill level
  const currentLevel = drillPath[drillPath.length - 1];

  // Mock KPI data based on drill level
  const kpiData = useMemo(() => {
    const baseData = {
      oee: 78.5 + Math.random() * 10,
      oeeTarget: 85,
      productivity: 92.3 + Math.random() * 5,
      productivityTarget: 95,
      quality: 98.1 + Math.random() * 1.5,
      qualityTarget: 99,
      delivery: 94.5 + Math.random() * 4,
      deliveryTarget: 98,
      safety: 100,
      safetyTarget: 100,
      cost: 87.2 + Math.random() * 8,
      costTarget: 90,
    };

    // Adjust based on drill level
    if (currentLevel.level === "line") {
      baseData.oee -= 5;
      baseData.productivity -= 3;
    } else if (currentLevel.level === "machine") {
      baseData.oee -= 8;
      baseData.productivity -= 5;
    }

    return baseData;
  }, [currentLevel]);

  // Treemap data for drill-down visualization
  const treemapData = useMemo(() => {
    if (currentLevel.level === "plant") {
      return [
        { name: "Khu vực A", size: 35, oee: 82, color: "#22c55e" },
        { name: "Khu vực B", size: 30, oee: 76, color: "#f59e0b" },
        { name: "Khu vực C", size: 25, oee: 79, color: "#22c55e" },
        { name: "Khu vực D", size: 10, oee: 68, color: "#ef4444" },
      ];
    } else if (currentLevel.level === "area") {
      return productionLines?.slice(0, 6).map((line: any, i: number) => ({
        name: line.name,
        size: 20 + Math.random() * 30,
        oee: 70 + Math.random() * 20,
        color: Math.random() > 0.3 ? "#22c55e" : Math.random() > 0.5 ? "#f59e0b" : "#ef4444",
      })) || [];
    } else {
      return machines?.slice(0, 8).map((m: any, i: number) => ({
        name: m.name,
        size: 10 + Math.random() * 20,
        oee: 65 + Math.random() * 25,
        color: Math.random() > 0.3 ? "#22c55e" : Math.random() > 0.5 ? "#f59e0b" : "#ef4444",
      })) || [];
    }
  }, [currentLevel, productionLines, machines]);

  // Trend data
  const trendData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      date: `D${i + 1}`,
      oee: 75 + Math.random() * 15,
      productivity: 88 + Math.random() * 10,
      quality: 96 + Math.random() * 3,
    }));
  }, [timeRange]);

  // Drill down handler
  const handleDrillDown = (item: any) => {
    const nextLevel: DrillLevel = 
      currentLevel.level === "plant" ? "area" :
      currentLevel.level === "area" ? "line" : "machine";
    
    if (currentLevel.level !== "machine") {
      setDrillPath([...drillPath, { level: nextLevel, id: item.id, name: item.name }]);
    }
  };

  // Drill up handler
  const handleDrillUp = (index: number) => {
    setDrillPath(drillPath.slice(0, index + 1));
  };

  // Custom Treemap content
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, oee, color } = props;
    
    if (width < 50 || height < 30) return null;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleDrillDown({ name })}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
        >
          {name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="#fff"
          fontSize={11}
        >
          OEE: {oee?.toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6" />
              Plant KPI Dashboard
            </h1>
            <p className="text-muted-foreground">
              Dashboard KPI nhà máy với khả năng drill-down
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <Card>
          <CardContent className="py-3">
            <Breadcrumb>
              <BreadcrumbList>
                {drillPath.map((path, index) => (
                  <BreadcrumbItem key={index}>
                    {index < drillPath.length - 1 ? (
                      <>
                        <BreadcrumbLink 
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleDrillUp(index)}
                        >
                          {path.name}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator />
                      </>
                    ) : (
                      <BreadcrumbPage>{path.name}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </CardContent>
        </Card>

        {/* KPI Cards - SQCDP */}
        <div className="grid grid-cols-6 gap-4">
          <DrillableKPICard
            title="Safety"
            value={kpiData.safety}
            unit="%"
            target={kpiData.safetyTarget}
            icon={Users}
            color="text-green-600"
            onClick={() => setSelectedKPI("safety")}
            hasChildren={currentLevel.level !== "machine"}
          />
          <DrillableKPICard
            title="Quality"
            value={kpiData.quality}
            unit="%"
            target={kpiData.qualityTarget}
            trend={1.2}
            icon={Target}
            color="text-blue-600"
            onClick={() => setSelectedKPI("quality")}
            hasChildren={currentLevel.level !== "machine"}
          />
          <DrillableKPICard
            title="Cost"
            value={kpiData.cost}
            unit="%"
            target={kpiData.costTarget}
            trend={-2.5}
            icon={Package}
            color="text-purple-600"
            onClick={() => setSelectedKPI("cost")}
            hasChildren={currentLevel.level !== "machine"}
          />
          <DrillableKPICard
            title="Delivery"
            value={kpiData.delivery}
            unit="%"
            target={kpiData.deliveryTarget}
            trend={3.1}
            icon={Clock}
            color="text-orange-600"
            onClick={() => setSelectedKPI("delivery")}
            hasChildren={currentLevel.level !== "machine"}
          />
          <DrillableKPICard
            title="Productivity"
            value={kpiData.productivity}
            unit="%"
            target={kpiData.productivityTarget}
            trend={2.8}
            icon={Zap}
            color="text-yellow-600"
            onClick={() => setSelectedKPI("productivity")}
            hasChildren={currentLevel.level !== "machine"}
          />
          <DrillableKPICard
            title="OEE"
            value={kpiData.oee}
            unit="%"
            target={kpiData.oeeTarget}
            trend={4.2}
            icon={Gauge}
            color="text-cyan-600"
            onClick={() => setSelectedKPI("oee")}
            hasChildren={currentLevel.level !== "machine"}
          />
        </div>

        {/* Drill-down Visualization */}
        <div className="grid grid-cols-2 gap-4">
          {/* Treemap */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bổ OEE theo {
                currentLevel.level === "plant" ? "Khu vực" :
                currentLevel.level === "area" ? "Dây chuyền" : "Máy"
              }</CardTitle>
              <CardDescription>
                Click vào ô để drill-down chi tiết
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={<CustomTreemapContent />}
                />
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng KPI</CardTitle>
              <CardDescription>
                OEE, Productivity, Quality theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[60, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="oee" fill="#06b6d4" fillOpacity={0.3} stroke="#06b6d4" name="OEE" />
                  <Line type="monotone" dataKey="productivity" stroke="#eab308" name="Productivity" />
                  <Line type="monotone" dataKey="quality" stroke="#3b82f6" name="Quality" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>So sánh chi tiết</CardTitle>
            <CardDescription>
              So sánh KPI giữa các {
                currentLevel.level === "plant" ? "khu vực" :
                currentLevel.level === "area" ? "dây chuyền" : "máy"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={treemapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="oee" fill="#3b82f6" name="OEE (%)" radius={[4, 4, 0, 0]}>
                  {treemapData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.oee >= 80 ? "#22c55e" : entry.oee >= 70 ? "#f59e0b" : "#ef4444"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Back button for non-plant levels */}
        {drillPath.length > 1 && (
          <Button 
            variant="outline" 
            onClick={() => handleDrillUp(drillPath.length - 2)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại {drillPath[drillPath.length - 2].name}
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}
