import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, RefreshCw, Download, Brain, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Target, Zap, Clock, ThumbsUp, ThumbsDown, Bookmark, Share2 } from "lucide-react";

// Mock insights data
// Mock data removed - mockInsightsData (data comes from tRPC or is not yet implemented)

export default function AiInsights() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleImplement = (id: number) => {
    toast({ title: "Đã đánh dấu triển khai", description: "Insight đã được chuyển sang trạng thái triển khai" });
  };

  const handleDismiss = (id: number) => {
    toast({ title: "Đã bỏ qua", description: "Insight đã được bỏ qua" });
  };

  const handleSave = (id: number) => {
    toast({ title: "Đã lưu", description: "Insight đã được lưu vào danh sách theo dõi" });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge className="bg-red-500">Cao</Badge>;
      case "medium": return <Badge className="bg-orange-500">Trung bình</Badge>;
      case "low": return <Badge className="bg-blue-500">Thấp</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge className="bg-blue-500">Mới</Badge>;
      case "reviewing": return <Badge className="bg-yellow-500">Đang xem xét</Badge>;
      case "implemented": return <Badge className="bg-green-500">Đã triển khai</Badge>;
      case "dismissed": return <Badge variant="secondary">Đã bỏ qua</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Quality": return "text-blue-600 bg-blue-100";
      case "Efficiency": return "text-green-600 bg-green-100";
      case "Maintenance": return "text-orange-600 bg-orange-100";
      case "Cost": return "text-purple-600 bg-purple-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const filteredInsights = mockInsightsData.insights.filter((insight) => {
    if (categoryFilter !== "all" && insight.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && insight.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && insight.status !== statusFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-500" />
              AI Insights
            </h1>
            <p className="text-muted-foreground mt-1">Insights và khuyến nghị từ AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng Insights</p>
              <p className="text-3xl font-bold">{mockInsightsData.summary.totalInsights}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Có thể hành động</p>
              <p className="text-3xl font-bold text-blue-600">{mockInsightsData.summary.actionable}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">Đã triển khai</p>
              <p className="text-3xl font-bold text-green-800">{mockInsightsData.summary.implemented}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tác động TB</p>
              <p className="text-3xl font-bold text-emerald-600">{mockInsightsData.summary.avgImpact}</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Summary */}
        <div className="grid grid-cols-4 gap-4">
          {mockInsightsData.categories.map((cat, i) => (
            <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter(cat.name)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getCategoryColor(cat.name)}`}>
                    {cat.name}
                  </span>
                  <span className="text-2xl font-bold">{cat.count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="Quality">Quality</SelectItem>
              <SelectItem value="Efficiency">Efficiency</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Cost">Cost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Độ ưu tiên" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="high">Cao</SelectItem>
              <SelectItem value="medium">Trung bình</SelectItem>
              <SelectItem value="low">Thấp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="new">Mới</SelectItem>
              <SelectItem value="reviewing">Đang xem xét</SelectItem>
              <SelectItem value="implemented">Đã triển khai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <Card key={insight.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(insight.category)}`}>
                        {insight.category}
                      </span>
                      {getPriorityBadge(insight.priority)}
                      {getStatusBadge(insight.status)}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                    <p className="text-muted-foreground mb-3">{insight.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-600">{insight.impact}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="w-4 h-4 text-blue-500" />
                        <span>Độ tin cậy: {(insight.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{insight.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-purple-500" />
                        <span>{insight.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {insight.status !== "implemented" && (
                      <Button size="sm" onClick={() => handleImplement(insight.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Triển khai
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleSave(insight.id)}>
                      <Bookmark className="w-4 h-4 mr-1" />Lưu
                    </Button>
                    {insight.status === "new" && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDismiss(insight.id)}>
                        <ThumbsDown className="w-4 h-4 mr-1" />Bỏ qua
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
