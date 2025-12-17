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
  PieChart, Pie, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight
} from "lucide-react";
import { Link } from "wouter";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f43f5e', '#84cc16'];

export default function NtfProductAnalysis() {
  const [days, setDays] = useState(30);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  const { data, isLoading } = trpc.ntfConfig.getProductNtfAnalysis.useQuery({ days });

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

  // Prepare pie chart data
  const pieData = data?.products.slice(0, 8).map((p, i) => ({
    name: p.productName,
    value: p.ntfCount,
    fill: COLORS[i % COLORS.length],
  })) || [];

  // Get trend for selected product
  const selectedTrend = selectedProduct ? data?.trendByProduct[selectedProduct] : null;
  const selectedCategories = selectedProduct ? data?.categoryByProduct[selectedProduct] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Phân tích NTF theo Sản phẩm
            </h1>
            <p className="text-muted-foreground">So sánh NTF rate giữa các sản phẩm</p>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng sản phẩm</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalDefects.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">NTF: {data.summary.totalNtf.toLocaleString()}</p>
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
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">SP cần cải thiện</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-red-500">{data.summary.worstProduct?.productName || '-'}</div>
                  <p className="text-sm text-muted-foreground">
                    NTF: {data.summary.worstProduct?.ntfRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>NTF Rate theo Sản phẩm</CardTitle>
                  <CardDescription>Top sản phẩm có NTF rate cao nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.products.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <YAxis 
                          type="category" 
                          dataKey="productName" 
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
                          onClick={(data) => setSelectedProduct(data.productId)}
                          cursor="pointer"
                        >
                          {data.products.slice(0, 10).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getBarColor(entry.ntfRate)}
                              opacity={selectedProduct === entry.productId ? 1 : 0.7}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ NTF theo Sản phẩm</CardTitle>
                  <CardDescription>Tỷ lệ NTF của từng sản phẩm</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data) => {
                            const product = data?.products?.find((p: any) => p.productName === data.name);
                            if (product) setSelectedProduct(product.productId);
                          }}
                          cursor="pointer"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString(), 'NTF']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Detail (when selected) */}
            {selectedProduct && selectedTrend && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        Chi tiết: {data.products.find(p => p.productId === selectedProduct)?.productName}
                      </CardTitle>
                      <CardDescription>Xu hướng NTF và phân tích nguyên nhân</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
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
                            <Area type="monotone" dataKey="ntfRate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
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

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng Thống kê Chi tiết</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Mã SP</TableHead>
                    <TableHead className="text-right">Tổng lỗi</TableHead>
                    <TableHead className="text-right">NTF</TableHead>
                    <TableHead className="text-right">Real NG</TableHead>
                    <TableHead className="text-right">NTF Rate</TableHead>
                    <TableHead>Đánh giá</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product) => (
                    <TableRow 
                      key={product.productId} 
                      className={selectedProduct === product.productId ? "bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{product.productCode}</TableCell>
                      <TableCell className="text-right">{product.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-yellow-600">{product.ntfCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{product.realNgCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${getStatusColor(product.ntfRate)}`}>
                          {product.ntfRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.ntfRate >= 30 ? (
                          <Badge variant="destructive">Nghiêm trọng</Badge>
                        ) : product.ntfRate >= 20 ? (
                          <Badge className="bg-yellow-500">Cảnh báo</Badge>
                        ) : (
                          <Badge className="bg-green-500">Bình thường</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedProduct(product.productId === selectedProduct ? null : product.productId)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                {data.summary.worstProduct && data.summary.worstProduct.ntfRate > 30 && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="font-medium">Sản phẩm có NTF rate nghiêm trọng</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-bold text-red-600">{data.summary.worstProduct.productName}</span> có NTF rate{' '}
                      <span className="font-bold">{data.summary.worstProduct.ntfRate.toFixed(1)}%</span>, 
                      cao hơn ngưỡng cho phép. Cần rà soát quy trình kiểm tra và tiêu chuẩn chất lượng.
                    </p>
                  </div>
                )}
                
                {data.products.filter(p => p.ntfRate > 20).length > 3 && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="font-medium">Nhiều sản phẩm có NTF rate cao</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Có {data.products.filter(p => p.ntfRate > 20).length} sản phẩm có NTF rate &gt; 20%.
                      Cần xem xét lại quy trình kiểm tra chung hoặc đào tạo nhân viên.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">Khuyến nghị chung</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Ưu tiên cải thiện quy trình cho sản phẩm {data.summary.worstProduct?.productName}</li>
                    <li>• Áp dụng best practice từ sản phẩm {data.summary.bestProduct?.productName} (NTF: {data.summary.bestProduct?.ntfRate.toFixed(1)}%)</li>
                    <li>• Phân tích nguyên nhân gốc cho các sản phẩm có NTF rate cao</li>
                    <li>• Xem xét cập nhật tiêu chuẩn kiểm tra cho từng loại sản phẩm</li>
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
