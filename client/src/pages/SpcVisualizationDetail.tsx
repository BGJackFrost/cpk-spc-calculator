import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { 
  Factory, 
  Wrench, 
  Cpu, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowLeft,
  Loader2,
  BarChart3,
  Box,
  Calendar,
  Play,
  Pause,
  Eye
} from "lucide-react";
import RealtimePlanCard from "@/components/RealtimePlanCard";

interface SpcPlan {
  id: number;
  name: string;
  description?: string | null;
  productionLineId: number;
  workstationId?: number | null;
  machineId?: number | null;
  fixtureId?: number | null;
  samplingConfigId: number;
  status: string;
}

interface ProductionLine {
  id: number;
  name: string;
  code: string;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
}

interface Machine {
  id: number;
  name: string;
  code: string;
  workstationId?: number | null;
}

interface Fixture {
  id: number;
  name: string;
  code: string;
  machineId?: number | null;
}

interface SamplingConfig {
  id: number;
  name: string;
}

export default function SpcVisualizationDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/spc-visualization/:type/:id");
  const entityType = params?.type || "line";
  const entityId = parseInt(params?.id || "0");

  // Fetch all data
  const { data: productionLines = [] } = trpc.productionLine.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();
  const { data: machines = [] } = trpc.machine.listAll.useQuery();
  const { data: fixtures = [] } = trpc.fixture.list.useQuery();
  const { data: spcPlans = [], isLoading } = trpc.spcPlan.list.useQuery();
  const { data: samplingConfigs = [] } = trpc.sampling.list.useQuery();

  // Get entity info
  const entityInfo = useMemo(() => {
    switch (entityType) {
      case "line":
        const line = productionLines.find((l: ProductionLine) => l.id === entityId);
        return {
          name: line?.name || "Không tìm thấy",
          code: line?.code || "",
          icon: Factory,
          color: "blue",
          type: "Dây chuyền",
        };
      case "workstation":
        const ws = workstations.find((w: Workstation) => w.id === entityId);
        const wsLine = productionLines.find((l: ProductionLine) => l.id === ws?.productionLineId);
        return {
          name: ws?.name || "Không tìm thấy",
          code: ws?.code || "",
          icon: Wrench,
          color: "green",
          type: "Công trạm",
          parent: wsLine?.name,
          parentType: "line",
          parentId: ws?.productionLineId,
        };
      case "machine":
        const machine = machines.find((m: Machine) => m.id === entityId);
        const machineWs = workstations.find((w: Workstation) => w.id === machine?.workstationId);
        return {
          name: machine?.name || "Không tìm thấy",
          code: machine?.code || "",
          icon: Cpu,
          color: "purple",
          type: "Máy",
          parent: machineWs?.name,
          parentType: "workstation",
          parentId: machine?.workstationId,
        };
      case "fixture":
        const fixture = fixtures.find((f: Fixture) => f.id === entityId);
        const fixtureMachine = machines.find((m: Machine) => m.id === fixture?.machineId);
        return {
          name: fixture?.name || "Không tìm thấy",
          code: fixture?.code || "",
          icon: Box,
          color: "orange",
          type: "Fixture",
          parent: fixtureMachine?.name,
          parentType: "machine",
          parentId: fixture?.machineId,
        };
      default:
        return { name: "Unknown", code: "", icon: Activity, color: "gray", type: "Unknown" };
    }
  }, [entityType, entityId, productionLines, workstations, machines, fixtures]);

  // Get related SPC plans
  const relatedPlans = useMemo(() => {
    return spcPlans.filter((p: SpcPlan) => {
      switch (entityType) {
        case "line": return p.productionLineId === entityId;
        case "workstation": return p.workstationId === entityId;
        case "machine": return p.machineId === entityId;
        case "fixture": return p.fixtureId === entityId;
        default: return false;
      }
    });
  }, [spcPlans, entityType, entityId]);

  // Get child entities
  const childEntities = useMemo(() => {
    switch (entityType) {
      case "line":
        return {
          type: "workstation",
          label: "Công trạm",
          items: workstations.filter((w: Workstation) => w.productionLineId === entityId),
        };
      case "workstation":
        return {
          type: "machine",
          label: "Máy",
          items: machines.filter((m: Machine) => m.workstationId === entityId),
        };
      case "machine":
        return {
          type: "fixture",
          label: "Fixture",
          items: fixtures.filter((f: Fixture) => f.machineId === entityId),
        };
      default:
        return { type: "", label: "", items: [] };
    }
  }, [entityType, entityId, workstations, machines, fixtures]);

  // Get sampling config name
  const getSamplingName = (id: number) => {
    return samplingConfigs.find((s: SamplingConfig) => s.id === id)?.name || "-";
  };

  // Get line name
  const getLineName = (id: number) => {
    return productionLines.find((l: ProductionLine) => l.id === id)?.name || "-";
  };

  // Status stats
  const stats = useMemo(() => {
    const active = relatedPlans.filter((p: SpcPlan) => p.status === "active").length;
    const paused = relatedPlans.filter((p: SpcPlan) => p.status === "paused").length;
    const draft = relatedPlans.filter((p: SpcPlan) => p.status === "draft").length;
    return { active, paused, draft, total: relatedPlans.length };
  }, [relatedPlans]);

  const IconComponent = entityInfo.icon;
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    gray: "bg-gray-100 text-gray-600",
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with breadcrumb */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/spc-visualization")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Trở về
            </Button>
            <span>/</span>
            <span>{entityInfo.type}</span>
            {entityInfo.parent && (
              <>
                <span>/</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto"
                  onClick={() => setLocation(`/spc-visualization/${entityInfo.parentType}/${entityInfo.parentId}`)}
                >
                  {entityInfo.parent}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colorClasses[entityInfo.color]}`}>
                <IconComponent className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{entityInfo.name}</h1>
                <p className="text-muted-foreground">{entityInfo.code} • {entityInfo.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base px-3 py-1">
                {stats.total} kế hoạch SPC
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-xs text-muted-foreground">Đang chạy</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Pause className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
                  <div className="text-xs text-muted-foreground">Tạm dừng</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                  <div className="text-xs text-muted-foreground">Nháp</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-xs text-muted-foreground">Cảnh báo</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content tabs */}
        <Tabs defaultValue="plans" className="w-full">
          <TabsList>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Kế hoạch SPC ({relatedPlans.length})
            </TabsTrigger>
            {childEntities.items.length > 0 && (
              <TabsTrigger value="children" className="flex items-center gap-2">
                {entityType === "line" && <Wrench className="h-4 w-4" />}
                {entityType === "workstation" && <Cpu className="h-4 w-4" />}
                {entityType === "machine" && <Box className="h-4 w-4" />}
                {childEntities.label} ({childEntities.items.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Thống kê
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4">
            {relatedPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedPlans.map((plan: SpcPlan) => (
                  <RealtimePlanCard
                    key={plan.id}
                    plan={plan}
                    lineName={getLineName(plan.productionLineId)}
                    samplingName={getSamplingName(plan.samplingConfigId)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Chưa có kế hoạch SPC</h3>
                  <p className="text-muted-foreground mb-4">
                    Chưa có kế hoạch SPC nào được gán cho {entityInfo.type.toLowerCase()} này.
                  </p>
                  <Button onClick={() => setLocation("/spc-plans")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Tạo kế hoạch SPC
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {childEntities.items.length > 0 && (
            <TabsContent value="children" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {childEntities.items.map((child: any) => {
                  const childPlans = spcPlans.filter((p: SpcPlan) => {
                    if (childEntities.type === "workstation") return p.workstationId === child.id;
                    if (childEntities.type === "machine") return p.machineId === child.id;
                    if (childEntities.type === "fixture") return p.fixtureId === child.id;
                    return false;
                  });
                  const hasActivePlan = childPlans.some((p: SpcPlan) => p.status === "active");

                  return (
                    <Card 
                      key={child.id}
                      className={`cursor-pointer hover:shadow-lg transition-all ${hasActivePlan ? 'border-green-300' : ''}`}
                      onClick={() => setLocation(`/spc-visualization/${childEntities.type}/${child.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${hasActivePlan ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {childEntities.type === "workstation" && <Wrench className={`h-5 w-5 ${hasActivePlan ? 'text-green-600' : 'text-gray-500'}`} />}
                            {childEntities.type === "machine" && <Cpu className={`h-5 w-5 ${hasActivePlan ? 'text-green-600' : 'text-gray-500'}`} />}
                            {childEntities.type === "fixture" && <Box className={`h-5 w-5 ${hasActivePlan ? 'text-green-600' : 'text-gray-500'}`} />}
                          </div>
                          <div>
                            <CardTitle className="text-base">{child.name}</CardTitle>
                            <CardDescription>{child.code}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {childPlans.filter((p: SpcPlan) => p.status === "active").length} kế hoạch active
                          </span>
                          {hasActivePlan ? (
                            <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                          ) : (
                            <Badge variant="outline">Không có kế hoạch</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}

          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê SPC</CardTitle>
                <CardDescription>
                  Tổng hợp các chỉ số SPC cho {entityInfo.type.toLowerCase()} {entityInfo.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Dữ liệu thống kê sẽ được hiển thị khi có kế hoạch SPC đang chạy</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
