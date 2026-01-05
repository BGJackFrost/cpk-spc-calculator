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
import { trpc } from '@/lib/trpc';
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
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
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
                  <p className="text-xs text-green-600 font-medium">MTBF cao nhất</p>
                  <p className="text-lg font-bold text-green-700">{stats.bestMtbf.name}</p>
                  <p className="text-sm text-green-600">{stats.bestMtbf.mtbf} giờ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wrench className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">MTTR thấp nhất</p>
                  <p className="text-lg font-bold text-blue-700">{stats.bestMttr.name}</p>
                  <p className="text-sm text-blue-600">{stats.bestMttr.mttr} phút</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">Cần cải thiện MTBF</p>
                  <p className="text-lg font-bold text-amber-700">{stats.worstMtbf.name}</p>
                  <p className="text-sm text-amber-600">{stats.worstMtbf.mtbf} giờ</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-xs text-purple-600 font-medium">Availability TB</p>
                  <p className="text-lg font-bold text-purple-700">{stats.avgAvailability}%</p>
                  <p className="text-sm text-purple-600">MTBF TB: {stats.avgMtbf}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh MTTR & MTBF</CardTitle>
              <CardDescription>
                Biểu đồ cột so sánh các chỉ số
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={80}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="mttr" name="MTTR (phút)" fill="#3b82f6" />
                    <Bar dataKey="mtbf" name="MTBF (giờ)" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>MTTR vs MTBF</CardTitle>
              <CardDescription>
                Phân bố MTTR và MTBF (kích thước = số lỗi)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="MTTR" 
                      unit=" phút"
                      label={{ value: 'MTTR (phút)', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="MTBF" 
                      unit=" giờ"
                      label={{ value: 'MTBF (giờ)', angle: -90, position: 'insideLeft' }}
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border rounded-lg p-3 shadow-lg">
                              <p className="font-bold">{data.name}</p>
                              <p className="text-sm">MTTR: {data.x} phút</p>
                              <p className="text-sm">MTBF: {data.y} giờ</p>
                              <p className="text-sm">Availability: {(data.availability * 100).toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter 
                      data={scatterData} 
                      fill="#8b5cf6"
                    >
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
        </div>

        {/* Radar Chart with Selection */}
        <Card>
          <CardHeader>
            <CardTitle>So sánh đa chiều</CardTitle>
            <CardDescription>
              Chọn tối đa 8 mục để so sánh trên biểu đồ radar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {selectedData.map((item, index) => (
                        <Radar
                          key={item.id}
                          name={item.name}
                          dataKey={item.name}
                          stroke={COLORS[index % COLORS.length]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Chọn để so sánh ({selectedItems.length}/8):</p>
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-2">
                    {comparisonData.map(item => (
                      <div 
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedItems.includes(item.id) || (selectedItems.length === 0 && comparisonData.indexOf(item) < 5)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <Checkbox 
                          checked={selectedItems.includes(item.id) || (selectedItems.length === 0 && comparisonData.indexOf(item) < 5)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            MTBF: {item.mtbf}h | MTTR: {item.mttr}m
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng chi tiết</CardTitle>
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
