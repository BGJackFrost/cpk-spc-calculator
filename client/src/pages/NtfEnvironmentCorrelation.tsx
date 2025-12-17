import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ZAxis, Legend, LineChart, Line, AreaChart, Area, ReferenceLine
} from "recharts";
import { 
  Thermometer, Droplets, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, Info, BarChart3
} from "lucide-react";

export default function NtfEnvironmentCorrelation() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = trpc.ntfConfig.getEnvironmentCorrelation.useQuery({ days });

  const getCorrelationStrength = (r: number): { label: string; color: string } => {
    const absR = Math.abs(r);
    if (absR >= 0.7) return { label: 'Rất mạnh', color: 'text-red-500' };
    if (absR >= 0.5) return { label: 'Mạnh', color: 'text-orange-500' };
    if (absR >= 0.3) return { label: 'Trung bình', color: 'text-yellow-500' };
    if (absR >= 0.1) return { label: 'Yếu', color: 'text-blue-500' };
    return { label: 'Không đáng kể', color: 'text-gray-500' };
  };

  const getCorrelationDirection = (r: number): string => {
    if (r > 0.1) return 'Thuận (tăng cùng chiều)';
    if (r < -0.1) return 'Nghịch (tăng ngược chiều)';
    return 'Không tương quan';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Tương quan NTF với Môi trường
            </h1>
            <p className="text-muted-foreground">Phân tích mối quan hệ giữa NTF rate và các yếu tố môi trường</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
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
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Thermometer className="w-4 h-4" />
                    Nhiệt độ TB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.avgTemperature.toFixed(1)}°C</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Droplets className="w-4 h-4" />
                    Độ ẩm TB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.avgHumidity.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">NTF Rate TB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.avgNtfRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Điểm dữ liệu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.dataPoints.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Correlation Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={data.correlations.temperature > 0.3 || data.correlations.temperature < -0.3 ? 'border-orange-500/50' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-red-500" />
                    Tương quan NTF - Nhiệt độ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <div className="text-3xl font-bold">r = {data.correlations.temperature.toFixed(3)}</div>
                      <div className={`text-sm ${getCorrelationStrength(data.correlations.temperature).color}`}>
                        {getCorrelationStrength(data.correlations.temperature).label}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getCorrelationDirection(data.correlations.temperature)}
                    </div>
                  </div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          dataKey="temperature" 
                          name="Nhiệt độ" 
                          unit="°C"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="ntfRate" 
                          name="NTF Rate" 
                          unit="%"
                          tick={{ fontSize: 11 }}
                        />
                        <ZAxis type="number" dataKey="total" range={[20, 200]} name="Số lượng" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'Nhiệt độ') return [`${value.toFixed(1)}°C`, name];
                            if (name === 'NTF Rate') return [`${value.toFixed(1)}%`, name];
                            return [value, name];
                          }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Scatter name="Dữ liệu" data={data.dataPoints} fill="#ef4444" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className={data.correlations.humidity > 0.3 || data.correlations.humidity < -0.3 ? 'border-blue-500/50' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    Tương quan NTF - Độ ẩm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <div className="text-3xl font-bold">r = {data.correlations.humidity.toFixed(3)}</div>
                      <div className={`text-sm ${getCorrelationStrength(data.correlations.humidity).color}`}>
                        {getCorrelationStrength(data.correlations.humidity).label}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getCorrelationDirection(data.correlations.humidity)}
                    </div>
                  </div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          dataKey="humidity" 
                          name="Độ ẩm" 
                          unit="%"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="ntfRate" 
                          name="NTF Rate" 
                          unit="%"
                          tick={{ fontSize: 11 }}
                        />
                        <ZAxis type="number" dataKey="total" range={[20, 200]} name="Số lượng" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'Độ ẩm') return [`${value.toFixed(1)}%`, name];
                            if (name === 'NTF Rate') return [`${value.toFixed(1)}%`, name];
                            return [value, name];
                          }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Scatter name="Dữ liệu" data={data.dataPoints} fill="#3b82f6" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Series Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng theo Thời gian</CardTitle>
                <CardDescription>NTF rate, nhiệt độ và độ ẩm theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dataPoints.slice(-100)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="ntfRate" 
                        name="NTF Rate (%)" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="temperature" 
                        name="Nhiệt độ (°C)" 
                        stroke="#ef4444" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="humidity" 
                        name="Độ ẩm (%)" 
                        stroke="#3b82f6" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Correlation Interpretation Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Hướng dẫn Đọc Hệ số Tương quan (r)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Độ mạnh của tương quan</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500">|r| ≥ 0.7</Badge>
                        <span>Rất mạnh - Có mối quan hệ rõ ràng</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500">0.5 ≤ |r| &lt; 0.7</Badge>
                        <span>Mạnh - Có ảnh hưởng đáng kể</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500">0.3 ≤ |r| &lt; 0.5</Badge>
                        <span>Trung bình - Có ảnh hưởng nhất định</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500">0.1 ≤ |r| &lt; 0.3</Badge>
                        <span>Yếu - Ảnh hưởng nhỏ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">|r| &lt; 0.1</Badge>
                        <span>Không đáng kể</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Chiều của tương quan</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span><strong>r &gt; 0:</strong> Tương quan thuận - Khi yếu tố môi trường tăng, NTF rate cũng tăng</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span><strong>r &lt; 0:</strong> Tương quan nghịch - Khi yếu tố môi trường tăng, NTF rate giảm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
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
                {data.insights.map((insight, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
                
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="font-medium">Lưu ý quan trọng</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Tương quan không có nghĩa là nhân quả - cần phân tích thêm để xác định nguyên nhân thực sự</li>
                    <li>• Dữ liệu môi trường có thể bị ảnh hưởng bởi nhiều yếu tố khác</li>
                    <li>• Nên kết hợp với phân tích theo ca làm việc và dây chuyền để có cái nhìn toàn diện</li>
                  </ul>
                </div>

                {(Math.abs(data.correlations.temperature) > 0.3 || Math.abs(data.correlations.humidity) > 0.3) && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="font-medium">Khuyến nghị hành động</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      {Math.abs(data.correlations.temperature) > 0.3 && (
                        <li>• Xem xét cải thiện hệ thống điều hòa nhiệt độ trong khu vực sản xuất</li>
                      )}
                      {Math.abs(data.correlations.humidity) > 0.3 && (
                        <li>• Xem xét lắp đặt hệ thống kiểm soát độ ẩm</li>
                      )}
                      <li>• Thiết lập ngưỡng cảnh báo môi trường tự động</li>
                      <li>• Ghi nhận điều kiện môi trường khi xảy ra lỗi để phân tích chi tiết hơn</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
