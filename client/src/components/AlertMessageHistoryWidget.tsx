/**
 * AlertMessageHistoryWidget - Widget hiển thị lịch sử gửi alert qua Telegram/Slack
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Hash,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface AlertMessageHistoryWidgetProps {
  className?: string;
  maxItems?: number;
}

export default function AlertMessageHistoryWidget({
  className = '',
  maxItems = 20,
}: AlertMessageHistoryWidgetProps) {
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');

  // Calculate date range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    return { startDate, endDate };
  }, [timeRange]);

  // Fetch alert message history
  const { data: history, isLoading, refetch } = trpc.iotDashboard.getAlertMessageHistory.useQuery({
    channel: channelFilter === 'all' ? undefined : channelFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: maxItems,
  });

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'slack':
        return <Hash className="h-4 w-4 text-purple-500" />;
      case 'email':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã gửi
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Thất bại
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Đang chờ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!history) return { total: 0, sent: 0, failed: 0, telegram: 0, slack: 0 };
    return {
      total: history.length,
      sent: history.filter((h: any) => h.status === 'sent').length,
      failed: history.filter((h: any) => h.status === 'failed').length,
      telegram: history.filter((h: any) => h.channelType === 'telegram').length,
      slack: history.filter((h: any) => h.channelType === 'slack').length,
    };
  }, [history]);

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Lịch sử gửi Alert
            </CardTitle>
            <CardDescription>
              Theo dõi các thông báo đã gửi qua Telegram/Slack
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 mt-4">
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Tổng</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-xs text-muted-foreground">Đã gửi</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Thất bại</div>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.telegram}</div>
            <div className="text-xs text-muted-foreground">Telegram</div>
          </div>
          <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.slack}</div>
            <div className="text-xs text-muted-foreground">Slack</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Kênh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kênh</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="sent">Đã gửi</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
              <SelectItem value="pending">Đang chờ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24 giờ</SelectItem>
              <SelectItem value="7d">7 ngày</SelectItem>
              <SelectItem value="30d">30 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    {getChannelIcon(item.channelType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.alertTitle || item.messageType || 'Alert'}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {item.alertMessage || item.content || 'Không có nội dung'}
                    </p>
                    {item.errorMessage && (
                      <p className="text-xs text-red-500 truncate">
                        Lỗi: {item.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                    <div>{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
            <p>Không có lịch sử gửi alert</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
