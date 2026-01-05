import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, WifiOff, Activity, Thermometer, Droplets, Gauge, Zap, RefreshCw, Trash2 } from 'lucide-react';
import { useMqttRealtime, MqttSensorData } from '@/hooks/useMqttRealtime';
import { format } from 'date-fns';

const SENSOR_ICONS: Record<string, any> = { temperature: Thermometer, humidity: Droplets, pressure: Gauge, vibration: Activity, current: Zap, voltage: Zap };
const STATUS_COLORS = { normal: 'bg-green-100 text-green-700 border-green-300', warning: 'bg-yellow-100 text-yellow-700 border-yellow-300', critical: 'bg-red-100 text-red-700 border-red-300' };

interface MqttRealtimeWidgetProps { className?: string; showMessages?: boolean; maxSensors?: number; }

export default function MqttRealtimeWidget({ className = '', showMessages = true, maxSensors = 20 }: MqttRealtimeWidgetProps) {
  const [activeTab, setActiveTab] = useState('sensors');
  const { isConnected, isConnecting, messages, sensorData, connect, disconnect, clearMessages } = useMqttRealtime();
  const sensorArray = Array.from(sensorData.values()).slice(-maxSensors);
  const criticalCount = sensorArray.filter(s => s.status === 'critical').length;
  const warningCount = sensorArray.filter(s => s.status === 'warning').length;

  const renderSensorCard = (sensor: MqttSensorData) => {
    const Icon = SENSOR_ICONS[sensor.sensorType] || Activity;
    return (
      <div key={`${sensor.deviceId}-${sensor.sensorType}`} className={`p-3 rounded-lg border ${STATUS_COLORS[sensor.status]}`}>
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-medium text-sm">{sensor.deviceId}</span></div><Badge variant="outline" className="text-xs">{sensor.sensorType}</Badge></div>
        <div className="mt-2 flex items-baseline gap-1"><span className="text-2xl font-bold">{sensor.value}</span><span className="text-sm text-muted-foreground">{sensor.unit}</span></div>
        <div className="mt-1 text-xs text-muted-foreground">{format(new Date(sensor.timestamp), 'HH:mm:ss')}</div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-500" />MQTT Realtime Sensors</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? <Badge className="bg-green-100 text-green-700"><Wifi className="h-3 w-3 mr-1" />Connected</Badge> : isConnecting ? <Badge className="bg-yellow-100 text-yellow-700"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Connecting</Badge> : <Badge className="bg-red-100 text-red-700"><WifiOff className="h-3 w-3 mr-1" />Disconnected</Badge>}
            <Button variant="ghost" size="sm" onClick={isConnected ? disconnect : connect}>{isConnected ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}</Button>
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-sm"><span>Sensors: <strong>{sensorArray.length}</strong></span>{criticalCount > 0 && <span className="text-red-600">Critical: <strong>{criticalCount}</strong></span>}{warningCount > 0 && <span className="text-yellow-600">Warning: <strong>{warningCount}</strong></span>}</div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4"><TabsTrigger value="sensors">Sensors ({sensorArray.length})</TabsTrigger>{showMessages && <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>}</TabsList>
          <TabsContent value="sensors"><ScrollArea className="h-[400px]"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{sensorArray.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground"><Activity className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Đang chờ dữ liệu từ sensors...</p></div> : sensorArray.map(renderSensorCard)}</div></ScrollArea></TabsContent>
          {showMessages && <TabsContent value="messages"><div className="flex justify-end mb-2"><Button variant="ghost" size="sm" onClick={clearMessages}><Trash2 className="h-4 w-4 mr-1" />Clear</Button></div><ScrollArea className="h-[350px]"><div className="space-y-2">{messages.length === 0 ? <div className="text-center py-8 text-muted-foreground"><p>Chưa có message</p></div> : messages.slice().reverse().map((msg, i) => (<div key={i} className="p-2 bg-muted/50 rounded text-sm font-mono"><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{msg.topic}</span><span>{format(new Date(msg.timestamp), 'HH:mm:ss')}</span></div><pre className="text-xs overflow-x-auto">{JSON.stringify(msg.payload, null, 2)}</pre></div>))}</div></ScrollArea></TabsContent>}
        </Tabs>
      </CardContent>
    </Card>
  );
}
