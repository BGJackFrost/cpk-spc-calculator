import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  Truck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  ChevronRight, Award, Star
} from "lucide-react";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f43f5e', '#84cc16'];

export default function NtfSupplierAnalysis() {
  const [days, setDays] = useState(30);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);

  const { data, isLoading } = trpc.ntfConfig.getSupplierNtfAnalysis.useQuery({ days });

  const getStatusColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "text-red-500";
    if (ntfRate >= 20) return "text-yellow-500";
    return "text-green-500";
  };

  const getBarColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "#dc2626";
    if (ntfRate >= 20) return "#f59e0b";
    return "#22c55e";
  };

  const getQualityRating = (ntfRate: number): { stars: number; label: string } => {
    if (ntfRate < 10) return { stars: 5, label: 'Xuất sắc' };
    if (ntfRate < 20) return { stars: 4, label: 'Tốt' };
    if (ntfRate < 30) return { stars: 3, label: 'Trung bình' };
    if (ntfRate < 40) return { stars: 2, label: 'Cần cải thiện' };
    return { stars: 1, label: 'Kém' };
  };

  // Prepare pie chart data
  const pieData = data?.suppliers.slice(0, 8).map((s, i) => ({
    name: s.supplierName,
    value: s.ntfCount,
    fill: COLORS[i % COLORS.length],
  })) || [];

  // Prepare radar data for top 5 suppliers
  const radarData = data?.suppliers.slice(0, 5).map(s => ({
    supplier: s.supplierName.length > 10 ? s.supplierName.substring(0, 10) + '...' : s.supplierName,
    ntfRate: s.ntfRate,
    fullMark: 50,
  })) || [];

  // Get trend for selected supplier
  const selectedTrend = selectedSupplier ? data?.trendBySupplier[selectedSupplier] : null;
  const selectedCategories = selectedSupplier ? data?.categoryBySupplier[selectedSupplier] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Phân tích NTF theo Nhà cung cấp
            </h1>
            <p className="text-muted-foreground">So sánh chất lượng nguyên vật liệu từ các nhà cung cấp</p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-24 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không có dữ liệu
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng NCC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalSuppliers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">NTF Rate TB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getStatusColor(data.summary.avgNtfRate)}`}>
                    {data.summary.avgNtfRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Award className="w-4 h-4 text-green-500" />
                    NCC tốt nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-500">{data.summary.bestSupplier?.supplierName || '-'}</div>
                  <p className="text-sm text-muted-foreground">
                    NTF: {data.summary.bestSupplier?.ntfRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">NCC cần cải thiện</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-red-500">{data.summary.worstSupplier?.supplierName || '-'}</div>
                  <p className="text-sm text-muted-foreground">
                    NTF: {data.summary.worstSupplier?.ntfRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>NTF Rate theo Nhà cung cấp</CardTitle>
                  <CardDescription>Top NCC có NTF rate cao nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.suppliers.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <YAxis 
                          type="category" 
                          dataKey="supplierName" 
                          width={100}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar 
                          dataKey="ntfRate" 
                          radius={[0, 4, 4, 0]}
                          onClick={(data) => setSelectedSupplier(data.supplierId)}
                          cursor="pointer"
                        >
                          {data.suppliers.slice(0, 10).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getBarColor(entry.ntfRate)}
                              opacity={selectedSupplier === entry.supplierId ? 1 : 0.7}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>So sánh Top 5 NCC</CardTitle>
                  <CardDescription>Biểu đồ radar so sánh NTF rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="supplier" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 50]} />
                        <Radar name="NTF Rate" dataKey="ntfRate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Supplier Detail (when selected) */}
            {selectedSupplier && selectedTrend && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        Chi tiết: {data.suppliers.find(s => s.supplierId === selectedSupplier)?.supplierName}
                      </CardTitle>
                      <CardDescription>Xu hướng NTF và phân tích nguyên nhân</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>
                      Đóng
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Trend Chart */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Xu hướng NTF</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedTrend}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            />
                            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                            <Tooltip 
                              formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                              labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Area type="monotone" dataKey="ntfRate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Nguyên nhân NTF</h4>
                      {selectedCategories && selectedCategories.length > 0 ? (
                        <div className="space-y-2">
                          {selectedCategories.slice(0, 5).map((cat, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{cat.category}</span>
                              <Badge variant="secondary">{cat.count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suppliers Table with Quality Rating */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng Đánh giá Nhà cung cấp</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead>Mã NCC</TableHead>
                    <TableHead className="text-right">Tổng lỗi</TableHead>
                    <TableHead className="text-right">NTF</TableHead>
                    <TableHead className="text-right">NTF Rate</TableHead>
                    <TableHead>Đánh giá</TableHead>
                    <TableHead>Xếp hạng</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.suppliers.map((supplier) => {
                    const rating = getQualityRating(supplier.ntfRate);
                    return (
                      <TableRow 
                        key={supplier.supplierId} 
                        className={selectedSupplier === supplier.supplierId ? "bg-muted/50" : ""}
                      >
                        <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                        <TableCell className="text-muted-foreground">{supplier.supplierCode}</TableCell>
                        <TableCell className="text-right">{supplier.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-yellow-600">{supplier.ntfCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${getStatusColor(supplier.ntfRate)}`}>
                            {supplier.ntfRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {supplier.ntfRate >= 30 ? (
                            <Badge variant="destructive">Nghiêm trọng</Badge>
                          ) : supplier.ntfRate >= 20 ? (
                            <Badge className="bg-yellow-500">Cảnh báo</Badge>
                          ) : (
                            <Badge className="bg-green-500">Bình thường</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < rating.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{rating.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedSupplier(supplier.supplierId === selectedSupplier ? null : supplier.supplierId)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Phân tích & Khuyến nghị
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.summary.worstSupplier && data.summary.worstSupplier.ntfRate > 30 && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="font-medium">Nhà cung cấp có NTF rate nghiêm trọng</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-bold text-red-600">{data.summary.worstSupplier.supplierName}</span> có NTF rate{' '}
                      <span className="font-bold">{data.summary.worstSupplier.ntfRate.toFixed(1)}%</span>. 
                      Cần đánh giá lại chất lượng nguyên vật liệu và xem xét thay đổi nhà cung cấp.
                    </p>
                  </div>
                )}
                
                {data.suppliers.filter(s => s.ntfRate > 20).length > 3 && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="font-medium">Nhiều NCC có NTF rate cao</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Có {data.suppliers.filter(s => s.ntfRate > 20).length} nhà cung cấp có NTF rate &gt; 20%.
                      Cần xem xét lại tiêu chuẩn chất lượng đầu vào.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">Khuyến nghị chung</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Ưu tiên đơn hàng cho NCC {data.summary.bestSupplier?.supplierName} (NTF: {data.summary.bestSupplier?.ntfRate.toFixed(1)}%)</li>
                    <li>• Yêu cầu {data.summary.worstSupplier?.supplierName} cải thiện chất lượng hoặc tìm NCC thay thế</li>
                    <li>• Thiết lập chương trình đánh giá NCC định kỳ</li>
                    <li>• Xây dựng tiêu chuẩn chất lượng đầu vào rõ ràng cho từng loại nguyên vật liệu</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
