import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Copy, ExternalLink, Monitor, Code } from 'lucide-react';
import { toast } from 'sonner';

export default function OeeWidgetConfig() {
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(500);

  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();

  const baseUrl = window.location.origin;
  const widgetUrl = selectedMachine === 'all'
    ? `${baseUrl}/embed/oee?theme=${theme}&refresh=${refreshInterval}`
    : `${baseUrl}/embed/oee/${selectedMachine}?theme=${theme}&refresh=${refreshInterval}`;

  const iframeCode = `<iframe
  src="${widgetUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border-radius: 8px; overflow: hidden;"
  title="OEE Widget"
></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}!`);
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cấu hình OEE Widget</h1>
          <p className="text-muted-foreground">
            Tạo widget nhúng để hiển thị OEE realtime trên màn hình nhà máy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Cấu hình Widget
              </CardTitle>
              <CardDescription>
                Tùy chỉnh widget theo nhu cầu hiển thị
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Máy</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả máy (Tổng hợp)</SelectItem>
                    {machines?.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Theme</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark (Nền tối)</SelectItem>
                    <SelectItem value="light">Light (Nền sáng)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tần suất cập nhật (giây)</Label>
                <Input
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  min={10}
                  max={300}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tối thiểu 10 giây, khuyến nghị 30 giây
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chiều rộng (px)</Label>
                  <Input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    min={300}
                    max={1920}
                  />
                </div>
                <div>
                  <Label>Chiều cao (px)</Label>
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min={400}
                    max={1080}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Xem trước</CardTitle>
              <CardDescription>
                Widget sẽ hiển thị như thế này trên màn hình nhà máy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg overflow-hidden mx-auto"
                style={{ width: Math.min(width, 400), height: Math.min(height, 400) }}
              >
                <iframe
                  src={widgetUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="OEE Widget Preview"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Mã nhúng
            </CardTitle>
            <CardDescription>
              Copy mã bên dưới và dán vào trang web hoặc màn hình hiển thị
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL Widget</Label>
              <div className="flex gap-2">
                <Input value={widgetUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={() => copyToClipboard(widgetUrl, 'URL')}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <a href={widgetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <Label>Mã iframe</Label>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  {iframeCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(iframeCode, 'mã iframe')}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Hướng dẫn sử dụng</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Mở URL trực tiếp trên trình duyệt màn hình nhà máy (chế độ toàn màn hình)</li>
                <li>• Hoặc nhúng iframe vào trang web/dashboard nội bộ</li>
                <li>• Widget tự động cập nhật theo tần suất đã cấu hình</li>
                <li>• Sử dụng theme dark cho màn hình trong nhà máy tối</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
