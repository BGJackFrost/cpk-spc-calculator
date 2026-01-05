/**
 * MTTR/MTBF Comparison Widget Component
 * Compares MTTR/MTBF metrics across multiple devices/machines
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import {
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Download,
  Trophy,
  AlertTriangle,
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
} from 'recharts';

interface MttrMtbfComparisonWidgetProps {
  className?: string;
}

// Mock data for comparison - in production, this would come from API
const generateComparisonData = (targetType: string) => {
  const items = targetType === 'device' 
    ? ['PLC-001', 'PLC-002', 'Sensor-A1', 'Sensor-A2', 'Gateway-01', 'HMI-01']
    : targetType === 'machine'
    ? ['CNC-001', 'CNC-002', 'Lathe-01', 'Mill-01', 'Press-01', 'Robot-01']
    : ['Line-A', 'Line-B', 'Line-C', 'Line-D'];

  return items.map((name, index) => ({
    id: index + 1,
    name,
    mttr: Math.round(20 + Math.random() * 80),
    mtbf: Math.round(80 + Math.random() * 200),
    availability: 0.85 + Math.random() * 0.14,
    failures: Math.floor(Math.random() * 15) + 1,
    repairs: Math.floor(Math.random() * 12) + 1,
    downtime: Math.round(Math.random() * 500) + 50,
  }));
};

export default function MttrMtbfComparisonWidget({ className = '' }: MttrMtbfComparisonWidgetProps) {
  const [targetType, setTargetType] = useState<'device' | 'machine' | 'production_line'>('machine');
  const [sortBy, setSortBy] = useState<'mttr' | 'mtbf' | 'availability'>('mtbf');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'bar' | 'radar' | 'table'>('bar');

  // Generate comparison data
  const comparisonData = useMemo(() => {
    const data = generateComparisonData(targetType);
    return data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [targetType, sortBy, sortOrder]);

  // Filter selected items for radar chart
  const selectedData = useMemo(() => {
    if (selectedItems.length === 0) return comparisonData.slice(0, 4);
    return comparisonData.filter(item => selectedItems.includes(item.id));
  }, [comparisonData, selectedItems]);

  // Prepare radar data
  const radarData = useMemo(() => {
    const metrics = ['MTTR', 'MTBF', 'Availability', 'Failures', 'Repairs'];
    return metrics.map(metric => {
      const result: any = { metric };
      selectedData.forEach(item => {
        switch (metric) {
          case 'MTTR':
            result[item.name] = item.mttr;
            break;
          case 'MTBF':
            result[item.name] = item.mtbf;
            break;
          case 'Availability':
            result[item.name] = item.availability * 100;
            break;
          case 'Failures':
            result[item.name] = item.failures * 10; // Scale for visibility
            break;
          case 'Repairs':
            result[item.name] = item.repairs * 10; // Scale for visibility
            break;
        }
      });
      return result;
    });
  }, [selectedData]);

  // Colors for charts
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Get best and worst performers
  const bestMtbf = comparisonData.reduce((max, item) => item.mtbf > max.mtbf ? item : max, comparisonData[0]);
  const worstMtbf = comparisonData.reduce((min, item) => item.mtbf < min.mtbf ? item : min, comparisonData[0]);

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              So sánh MTTR/MTBF
            </CardTitle>
            <CardDescription>
              So sánh hiệu suất giữa các {targetType === 'device' ? 'thiết bị' : targetType === 'machine' ? 'máy móc' : 'dây chuyền'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device">Thiết bị IoT</SelectItem>
                <SelectItem value="machine">Máy móc</SelectItem>
                <SelectItem value="production_line">Dây chuyền</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mttr">Sắp xếp: MTTR</SelectItem>
                <SelectItem value="mtbf">Sắp xếp: MTBF</SelectItem>
                <SelectItem value="availability">Sắp xếp: Availability</SelectItem>
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
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Trophy className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">Tốt nhất (MTBF)</p>
              <p className="font-bold text-green-700 dark:text-green-300">{bestMtbf.name}</p>
              <p className="text-sm text-green-600">{bestMtbf.mtbf}h MTBF</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-red-600 dark:text-red-400">Cần cải thiện</p>
              <p className="font-bold text-red-700 dark:text-red-300">{worstMtbf.name}</p>
              <p className="text-sm text-red-600">{worstMtbf.mtbf}h MTBF</p>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
          <TabsList className="mb-4">
            <TabsTrigger value="bar">Biểu đồ cột</TabsTrigger>
            <TabsTrigger value="radar">Biểu đồ radar</TabsTrigger>
            <TabsTrigger value="table">Bảng chi tiết</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'MTTR') return [`${value} phút`, name];
                      if (name === 'MTBF') return [`${value} giờ`, name];
                      if (name === 'Availability') return [`${(value * 100).toFixed(1)}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="mttr" name="MTTR" fill="#3b82f6" />
                  <Bar dataKey="mtbf" name="MTBF" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="radar">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
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
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Chọn để so sánh:</p>
                <ScrollArea className="h-[320px]">
                  <div className="space-y-2">
                    {comparisonData.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <Checkbox 
                          checked={selectedItems.includes(item.id) || (selectedItems.length === 0 && comparisonData.indexOf(item) < 4)}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tên</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">MTTR (phút)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">MTBF (giờ)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Availability</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Lỗi</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Sửa chữa</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Downtime (phút)</th>
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
                        <Badge variant={item.mttr < 40 ? 'default' : item.mttr < 60 ? 'secondary' : 'destructive'}>
                          {item.mttr}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.mtbf > 150 ? 'default' : item.mtbf > 100 ? 'secondary' : 'destructive'}>
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
                      <td className="px-4 py-3 text-right">{item.downtime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
