/**
 * CPK History Comparison Page
 * Trang so sánh lịch sử Radar Chart CPK theo thời gian
 */

import DashboardLayout from "@/components/DashboardLayout";
import RadarChartHistoryComparison from "@/components/RadarChartHistoryComparison";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, ArrowLeft, Download, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function CpkHistoryComparison() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  
  // Fetch SPC plans
  const { data: spcPlans } = trpc.spcPlan.list.useQuery();
  
  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  const handleExportPdf = () => {
    toast.info("Tính năng xuất PDF đang được phát triển");
  };

  const handleExportExcel = () => {
    toast.info("Tính năng xuất Excel đang được phát triển");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                So sánh Lịch sử CPK
              </h1>
              <p className="text-muted-foreground">
                Theo dõi xu hướng cải tiến quy trình theo thời gian với biểu đồ Radar Chart
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf}>
              <FileText className="h-4 w-4 mr-2" />
              Xuất PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bộ lọc</CardTitle>
            <CardDescription>Chọn kế hoạch SPC hoặc dây chuyền sản xuất để xem lịch sử</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Kế hoạch SPC</label>
                <Select 
                  value={selectedPlanId?.toString() || ""} 
                  onValueChange={(v) => {
                    setSelectedPlanId(v ? parseInt(v) : null);
                    setSelectedLineId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kế hoạch SPC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    {spcPlans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dây chuyền sản xuất</label>
                <Select 
                  value={selectedLineId?.toString() || ""} 
                  onValueChange={(v) => {
                    setSelectedLineId(v ? parseInt(v) : null);
                    setSelectedPlanId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Radar Chart History Comparison */}
        <Card>
          <CardContent className="pt-6">
            <RadarChartHistoryComparison 
              planId={selectedPlanId || undefined}
              productionLineId={selectedLineId || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
