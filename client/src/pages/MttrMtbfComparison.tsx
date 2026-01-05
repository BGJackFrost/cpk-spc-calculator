/**
 * MTTR/MTBF Comparison Page
 * Dedicated page for comparing MTTR/MTBF metrics across devices/machines
 */
import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  Download,
  Trophy,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Wrench,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

// Mock data generator
const generateComparisonData = (targetType: string, count: number = 10) => {
  const prefixes = {
    device: ['PLC', 'Sensor', 'Gateway', 'HMI', 'SCADA'],
    machine: ['CNC', 'Lathe', 'Mill', 'Press', 'Robot', 'Drill'],
    production_line: ['Line'],
  };
  
  const prefix = prefixes[targetType as keyof typeof prefixes] || ['Item'];
  
  return Array.from({ length: count }, (_, i) => {
    const p = prefix[i % prefix.length];
    return {
      id: i + 1,
      name: `${p}-${String(i + 1).padStart(3, '0')}`,
      mttr: Math.round(15 + Math.random() * 90),
      mtbf: Math.round(50 + Math.random() * 250),
      availability: 0.80 + Math.random() * 0.19,
      failures: Math.floor(Math.random() * 20) + 1,
      repairs: Math.floor(Math.random() * 18) + 1,
      downtime: Math.round(Math.random() * 600) + 30,
      category: p,
    };
  });
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function MttrMtbfComparison() {
  const [targetType, setTargetType] = useState<'device' | 'machine' | 'production_line'>('machine');
  const [sortBy, setSortBy] = useState<'mttr' | 'mtbf' | 'availability' | 'failures'>('mtbf');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [days, setDays] = useState(30);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Export mutations
  const exportExcelMutation = trpc.mttrMtbfComparison.exportExcel.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast({
        title: 'Xuất Excel thành công',
        description: `File ${data.filename} đã được tạo`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi xuất Excel',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => setIsExporting(false),
  });

  const exportPdfMutation = trpc.mttrMtbfComparison.exportPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast({
        title: 'Xuất PDF thành công',
        description: `File ${data.filename} đã được tạo`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi xuất PDF',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => setIsExporting(false),
  });

  // Generate comparison data
  const allData = useMemo(() => {
    return generateComparisonData(targetType, 15);
  }, [targetType]);

  // Filter and sort data
  const comparisonData = useMemo(() => {
    let data = allData;
    
    // Filter by search
    if (searchQuery) {
      data = data.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    return data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [allData, searchQuery, sortBy, sortOrder]);

  // Selected items for radar
  const selectedData = useMemo(() => {
    if (selectedItems.length === 0) return comparisonData.slice(0, 5);
    return comparisonData.filter(item => selectedItems.includes(item.id));
  }, [comparisonData, selectedItems]);

  // Radar chart data
  const radarData = useMemo(() => {
    const metrics = ['MTTR', 'MTBF', 'Availability', 'Failures'];
    const maxValues = {
      MTTR: Math.max(...comparisonData.map(d => d.mttr)),
      MTBF: Math.max(...comparisonData.map(d => d.mtbf)),
      Availability: 100,
      Failures: Math.max(...comparisonData.map(d => d.failures)),
    };
    
    return metrics.map(metric => {
      const result: any = { metric };
      selectedData.forEach(item => {
        let value = 0;
        switch (metric) {
          case 'MTTR':
            value = (item.mttr / maxValues.MTTR) * 100;
            break;
          case 'MTBF':
            value = (item.mtbf / maxValues.MTBF) * 100;
            break;
          case 'Availability':
            value = item.availability * 100;
            break;
          case 'Failures':
            value = (item.failures / maxValues.Failures) * 100;
            break;
        }
        result[item.name] = Math.round(value);
      });
      return result;
    });
  }, [selectedData, comparisonData]);

  // Scatter data for MTTR vs MTBF
  const scatterData = useMemo(() => {
    return comparisonData.map(item => ({
      x: item.mttr,
      y: item.mtbf,
      z: item.failures * 5,
      name: item.name,
      availability: item.availability,
    }));
  }, [comparisonData]);

  // Statistics
  const stats = useMemo(() => {
    const mttrValues = comparisonData.map(d => d.mttr);
    const mtbfValues = comparisonData.map(d => d.mtbf);
    const availValues = comparisonData.map(d => d.availability);
    
    return {
      avgMttr: Math.round(mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length),
      avgMtbf: Math.round(mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length),
      avgAvailability: (availValues.reduce((a, b) => a + b, 0) / availValues.length * 100).toFixed(1),
      bestMtbf: comparisonData.reduce((max, item) => item.mtbf > max.mtbf ? item : max, comparisonData[0]),
      worstMtbf: comparisonData.reduce((min, item) => item.mtbf < min.mtbf ? item : min, comparisonData[0]),
      bestMttr: comparisonData.reduce((min, item) => item.mttr < min.mttr ? item : min, comparisonData[0]),
      worstMttr: comparisonData.reduce((max, item) => item.mttr > max.mttr ? item : max, comparisonData[0]),
    };
  }, [comparisonData]);

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : prev.length < 8 ? [...prev, id] : prev
    );
  };

  const targetTypeLabel = {
    device: 'Thiết bị IoT',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
  }[targetType];

  // Handle export
  const handleExport = (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const targetIds = comparisonData.map(item => item.id);

    if (format === 'excel') {
      exportExcelMutation.mutate({
        targetType,
        targetIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } else {
      exportPdfMutation.mutate({
        targetType,
        targetIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              So sánh MTTR/MTBF
            </h1>
            <p className="text-muted-foreground">
              Phân tích và so sánh hiệu suất giữa các {targetTypeLabel.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="60">60 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Xuất báo cáo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Xuất Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2 text-red-600" />
                  Xuất PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Loại:</Label>
                <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device">Thiết bị IoT</SelectItem>
                    <SelectItem value="machine">Máy móc</SelectItem>
                    <SelectItem value="production_line">Dây chuyền</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Sắp xếp:</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mttr">MTTR</SelectItem>
                    <SelectItem value="mtbf">MTBF</SelectItem>
                    <SelectItem value="availability">Availability</SelectItem>
                    <SelectItem value="failures">Số lỗi</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">MTBF tốt nhất</p>
                  <p className="text-lg font-bold">{stats.bestMtbf?.name}</p>
                  <p className="text-sm text-green-600">{stats.bestMtbf?.mtbf} giờ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">MTBF kém nhất</p>
                  <p className="text-lg font-bold">{stats.worstMtbf?.name}</p>
                  <p className="text-sm text-red-600">{stats.worstMtbf?.mtbf} giờ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">MTTR trung bình</p>
                  <p className="text-2xl font-bold">{stats.avgMttr}</p>
                  <p className="text-sm text-muted-foreground">phút</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Availability TB</p>
                  <p className="text-2xl font-bold">{stats.avgAvailability}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="bar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bar">Biểu đồ cột</TabsTrigger>
            <TabsTrigger value="radar">Biểu đồ Radar</TabsTrigger>
            <TabsTrigger value="scatter">MTTR vs MTBF</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle>So sánh MTTR/MTBF</CardTitle>
                <CardDescription>
                  So sánh chỉ số MTTR và MTBF giữa các {targetTypeLabel.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mttr" name="MTTR (phút)" fill="#ef4444" />
                      <Bar dataKey="mtbf" name="MTBF (giờ)" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="radar">
            <Card>
              <CardHeader>
                <CardTitle>So sánh đa chiều</CardTitle>
                <CardDescription>
                  Chọn tối đa 8 {targetTypeLabel.toLowerCase()} để so sánh (click vào bảng bên dưới)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {selectedData.map((item, index) => (
                        <Radar
                          key={item.id}
                          name={item.name}
                          dataKey={item.name}
                          stroke={COLORS[index % COLORS.length]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scatter">
            <Card>
              <CardHeader>
                <CardTitle>Phân bố MTTR vs MTBF</CardTitle>
                <CardDescription>
                  Kích thước điểm thể hiện số lượng lỗi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="x" 
                        name="MTTR" 
                        unit=" phút"
                        label={{ value: 'MTTR (phút)', position: 'bottom' }}
                      />
                      <YAxis 
                        dataKey="y" 
                        name="MTBF" 
                        unit=" giờ"
                        label={{ value: 'MTBF (giờ)', angle: -90, position: 'left' }}
                      />
                      <ZAxis dataKey="z" range={[50, 400]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-bold">{data.name}</p>
                                <p>MTTR: {data.x} phút</p>
                                <p>MTBF: {data.y} giờ</p>
                                <p>Availability: {(data.availability * 100).toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={scatterData}>
                        {scatterData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.availability > 0.95 ? '#22c55e' : entry.availability > 0.90 ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng xếp hạng</CardTitle>
            <CardDescription>
              Xếp hạng {targetTypeLabel.toLowerCase()} theo hiệu suất tổng hợp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparisonData.slice(0, 10).map((item, index) => {
                const score = (item.mtbf / 3) + (100 - item.mttr) + (item.availability * 100);
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedItems.includes(item.id) 
                        ? 'bg-primary/10 border border-primary' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => toggleItemSelection(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          MTBF: {item.mtbf}h | MTTR: {item.mttr}p | Avail: {(item.availability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        item.availability > 0.95 && item.mtbf > 150 ? 'default' :
                        item.availability > 0.90 && item.mtbf > 100 ? 'secondary' :
                        'destructive'
                      }>
                        {item.availability > 0.95 && item.mtbf > 150 ? 'Tốt' :
                         item.availability > 0.90 && item.mtbf > 100 ? 'Trung bình' :
                         'Cần cải thiện'}
                      </Badge>
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng dữ liệu chi tiết</CardTitle>
            <CardDescription>
              Dữ liệu chi tiết của tất cả {targetTypeLabel.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tên</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">MTTR (phút)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">MTBF (giờ)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Availability</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Số lỗi</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Sửa chữa</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Downtime</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((item, index) => (
                    <tr 
                      key={item.id}
                      className={`border-t ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.mttr < 30 ? 'default' : item.mttr < 50 ? 'secondary' : 'destructive'}>
                          {item.mttr}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.mtbf > 180 ? 'default' : item.mtbf > 100 ? 'secondary' : 'destructive'}>
                          {item.mtbf}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.availability > 0.95 ? 'default' : item.availability > 0.90 ? 'secondary' : 'destructive'}>
                          {(item.availability * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{item.failures}</td>
                      <td className="px-4 py-3 text-right">{item.repairs}</td>
                      <td className="px-4 py-3 text-right">{item.downtime} phút</td>
                      <td className="px-4 py-3 text-center">
                        {item.availability > 0.95 && item.mtbf > 150 ? (
                          <Badge className="bg-green-500">Tốt</Badge>
                        ) : item.availability > 0.90 && item.mtbf > 100 ? (
                          <Badge className="bg-yellow-500">Trung bình</Badge>
                        ) : (
                          <Badge variant="destructive">Cần cải thiện</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
