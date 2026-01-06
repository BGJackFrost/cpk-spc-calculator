import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, WifiOff, Activity, Thermometer, Droplets, Gauge, Zap, RefreshCw, Trash2, TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import { useMqttRealtime, MqttSensorData } from '@/hooks/useMqttRealtime';
import { format } from 'date-fns';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SENSOR_ICONS: Record<string, any> = { temperature: Thermometer, humidity: Droplets, pressure: Gauge, vibration: Activity, current: Zap, voltage: Zap };
const STATUS_COLORS = { normal: 'bg-green-100 text-green-700 border-green-300', warning: 'bg-yellow-100 text-yellow-700 border-yellow-300', critical: 'bg-red-100 text-red-700 border-red-300' };
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface SensorHistoryPoint {
  timestamp: number;
  value: number;
  status: string;
}

interface MqttRealtimeWidgetProps { 
  className?: string; 
  showMessages?: boolean; 
  maxSensors?: number;
  showTrendChart?: boolean;
  maxHistoryPoints?: number;
}

export default function MqttRealtimeWidget({ 
  className = '', 
  showMessages = true, 
  maxSensors = 20,
  showTrendChart = true,
  maxHistoryPoints = 60,
}: MqttRealtimeWidgetProps) {
  const [activeTab, setActiveTab] = useState('sensors');
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m'>('5m');
  const { isConnected, isConnecting, messages, sensorData, connect, disconnect, clearMessages } = useMqttRealtime();
  
  // Store sensor history for trend charts
  const sensorHistoryRef = useRef<Map<string, SensorHistoryPoint[]>>(new Map());
  
  const sensorArray = Array.from(sensorData.values()).slice(-maxSensors);
  const criticalCount = sensorArray.filter(s => s.status === 'critical').length;
  const warningCount = sensorArray.filter(s => s.status === 'warning').length;

  // Update sensor history when new data arrives
  useEffect(() => {
    sensorArray.forEach(sensor => {
      const key = `${sensor.deviceId}-${sensor.sensorType}`;
      const history = sensorHistoryRef.current.get(key) || [];
      
      // Add new point
      history.push({
        timestamp: sensor.timestamp,
        value: sensor.value,
        status: sensor.status,
      });
      
      // Keep only maxHistoryPoints
      while (history.length > maxHistoryPoints) {
        history.shift();
      }
      
      sensorHistoryRef.current.set(key, history);
    });
  }, [sensorData, maxHistoryPoints]);

  // Get unique sensor keys for selection
  const sensorKeys = useMemo(() => {
    return sensorArray.map(s => `${s.deviceId}-${s.sensorType}`);
  }, [sensorArray]);

  // Auto-select first 4 sensors if none selected
  useEffect(() => {
    if (selectedSensors.length === 0 && sensorKeys.length > 0) {
      setSelectedSensors(sensorKeys.slice(0, Math.min(4, sensorKeys.length)));
    }
  }, [sensorKeys]);

  // Calculate trend for a sensor
  const calculateTrend = (key: string): 'up' | 'down' | 'stable' => {
    const history = sensorHistoryRef.current.get(key) || [];
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-5);
    if (recent.length < 2) return 'stable';
    
    const avgFirst = recent.slice(0, Math.floor(recent.length / 2)).reduce((sum, p) => sum + p.value, 0) / Math.floor(recent.length / 2);
    const avgSecond = recent.slice(Math.floor(recent.length / 2)).reduce((sum, p) => sum + p.value, 0) / (recent.length - Math.floor(recent.length / 2));
    
    const diff = avgSecond - avgFirst;
    if (Math.abs(diff) < 0.5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (selectedSensors.length === 0) return [];
    
    const timeRangeMs = timeRange === '1m' ? 60000 : timeRange === '5m' ? 300000 : 900000;
    const cutoffTime = Date.now() - timeRangeMs;
    
    // Collect all timestamps
    const allTimestamps = new Set<number>();
    selectedSensors.forEach(key => {
      const history = sensorHistoryRef.current.get(key) || [];
      history.filter(p => p.timestamp >= cutoffTime).forEach(p => allTimestamps.add(p.timestamp));
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Build chart data
    return sortedTimestamps.map(ts => {
      const point: Record<string, any> = { time: format(new Date(ts), 'HH:mm:ss') };
      selectedSensors.forEach(key => {
        const history = sensorHistoryRef.current.get(key) || [];
        const dataPoint = history.find(p => p.timestamp === ts);
        if (dataPoint) {
          point[key] = dataPoint.value;
        }
      });
      return point;
    });
  }, [selectedSensors, timeRange, sensorData]);

  const toggleSensorSelection = (key: string) => {
    setSelectedSensors(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      if (prev.length >= 8) {
        return prev; // Max 8 sensors on chart
      }
      return [...prev, key];
    });
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-blue-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const renderSensorCard = (sensor: MqttSensorData) => {
    const Icon = SENSOR_ICONS[sensor.sensorType] || Activity;
    const key = `${sensor.deviceId}-${sensor.sensorType}`;
    const trend = calculateTrend(key);
    const isSelected = selectedSensors.includes(key);
    
    return (
      <div 
        key={key} 
        className={`p-3 rounded-lg border cursor-pointer transition-all ${STATUS_COLORS[sensor.status]} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
        onClick={() => toggleSensorSelection(key)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{sensor.deviceId}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon trend={trend} />
            <Badge variant="outline" className="text-xs">{sensor.sensorType}</Badge>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold">{sensor.value}</span>
          <span className="text-sm text-muted-foreground">{sensor.unit}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{format(new Date(sensor.timestamp), 'HH:mm:ss')}</span>
          {isSelected && <Badge className="text-xs bg-blue-500">Chart</Badge>}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            MQTT Realtime Sensors
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-100 text-green-700"><Wifi className="h-3 w-3 mr-1" />Connected</Badge>
            ) : isConnecting ? (
              <Badge className="bg-yellow-100 text-yellow-700"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Connecting</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700"><WifiOff className="h-3 w-3 mr-1" />Disconnected</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={isConnected ? disconnect : connect}>
              {isConnected ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-sm">
          <span>Sensors: <strong>{sensorArray.length}</strong></span>
          {criticalCount > 0 && <span className="text-red-600">Critical: <strong>{criticalCount}</strong></span>}
          {warningCount > 0 && <span className="text-yellow-600">Warning: <strong>{warningCount}</strong></span>}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="sensors">Sensors ({sensorArray.length})</TabsTrigger>
            {showTrendChart && <TabsTrigger value="trend"><LineChart className="h-4 w-4 mr-1" />Trend</TabsTrigger>}
            {showMessages && <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="sensors">
            <div className="mb-2 text-xs text-muted-foreground">
              Click vào sensor để thêm/bỏ khỏi biểu đồ trend (tối đa 8)
            </div>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sensorArray.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Đang chờ dữ liệu từ sensors...</p>
                  </div>
                ) : (
                  sensorArray.map(renderSensorCard)
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {showTrendChart && (
            <TabsContent value="trend">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Khoảng thời gian:</span>
                    <Select value={timeRange} onValueChange={(v: '1m' | '5m' | '15m') => setTimeRange(v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 phút</SelectItem>
                        <SelectItem value="5m">5 phút</SelectItem>
                        <SelectItem value="15m">15 phút</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Đang theo dõi: {selectedSensors.length} sensors
                  </div>
                </div>
                
                {selectedSensors.length === 0 ? (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Chọn sensors từ tab Sensors để xem biểu đồ trend</p>
                    </div>
                  </div>
                ) : chartData.length < 2 ? (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-50 animate-spin" />
                      <p>Đang thu thập dữ liệu...</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        {selectedSensors.map((key, index) => {
                          const sensor = sensorArray.find(s => `${s.deviceId}-${s.sensorType}` === key);
                          return (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              name={sensor ? `${sensor.deviceId} (${sensor.sensorType})` : key}
                              stroke={CHART_COLORS[index % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                              connectNulls
                            />
                          );
                        })}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Selected sensors chips */}
                <div className="flex flex-wrap gap-2">
                  {selectedSensors.map((key, index) => {
                    const sensor = sensorArray.find(s => `${s.deviceId}-${s.sensorType}` === key);
                    return (
                      <Badge 
                        key={key}
                        variant="outline"
                        className="cursor-pointer"
                        style={{ borderColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        onClick={() => toggleSensorSelection(key)}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        {sensor ? `${sensor.deviceId} (${sensor.sensorType})` : key}
                        <span className="ml-1 text-muted-foreground">×</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          )}
          
          {showMessages && (
            <TabsContent value="messages">
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  <Trash2 className="h-4 w-4 mr-1" />Clear
                </Button>
              </div>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Chưa có message</p>
                    </div>
                  ) : (
                    messages.slice().reverse().map((msg, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded text-sm font-mono">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{msg.topic}</span>
                          <span>{format(new Date(msg.timestamp), 'HH:mm:ss')}</span>
                        </div>
                        <pre className="text-xs overflow-x-auto">{JSON.stringify(msg.payload, null, 2)}</pre>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
