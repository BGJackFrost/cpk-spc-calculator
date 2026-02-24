import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Play, Pause, RefreshCw, Calendar, Mail, AlertTriangle, Trash2, FileText, Bell, Database } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleDisplay: string;
  lastRun: Date | null;
  nextRun: Date;
  status: "active" | "paused" | "error";
  type: "shift_report" | "alert_check" | "license_check" | "data_cleanup" | "webhook_retry";
}

const defaultJobs: ScheduledJob[] = [
  {
    id: "shift_morning",
    name: "Báo cáo ca sáng",
    description: "Tự động tạo và gửi báo cáo OEE/SPC cuối ca sáng",
    schedule: "0 0 14 * * *",
    scheduleDisplay: "14:00 hàng ngày",
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 22 * 60 * 60 * 1000),
    status: "active",
    type: "shift_report",
  },
  {
    id: "shift_afternoon",
    name: "Báo cáo ca chiều",
    description: "Tự động tạo và gửi báo cáo OEE/SPC cuối ca chiều",
    schedule: "0 0 22 * * *",
    scheduleDisplay: "22:00 hàng ngày",
    lastRun: new Date(Date.now() - 10 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 14 * 60 * 60 * 1000),
    status: "active",
    type: "shift_report",
  },
  {
    id: "shift_night",
    name: "Báo cáo ca đêm",
    description: "Tự động tạo và gửi báo cáo OEE/SPC cuối ca đêm",
    schedule: "0 0 6 * * *",
    scheduleDisplay: "06:00 hàng ngày",
    lastRun: new Date(Date.now() - 18 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 6 * 60 * 60 * 1000),
    status: "active",
    type: "shift_report",
  },
  {
    id: "alert_check",
    name: "Kiểm tra cảnh báo",
    description: "Kiểm tra và gửi thông báo cho các cảnh báo mới",
    schedule: "0 */5 * * * *",
    scheduleDisplay: "Mỗi 5 phút",
    lastRun: new Date(Date.now() - 3 * 60 * 1000),
    nextRun: new Date(Date.now() + 2 * 60 * 1000),
    status: "active",
    type: "alert_check",
  },
  {
    id: "license_check",
    name: "Kiểm tra License",
    description: "Kiểm tra license sắp hết hạn và gửi email nhắc nhở",
    schedule: "0 0 8 * * *",
    scheduleDisplay: "08:00 hàng ngày",
    lastRun: new Date(Date.now() - 4 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 20 * 60 * 60 * 1000),
    status: "active",
    type: "license_check",
  },
  {
    id: "license_email",
    name: "Email gia hạn License",
    description: "Gửi email nhắc nhở gia hạn license",
    schedule: "0 0 9 * * *",
    scheduleDisplay: "09:00 hàng ngày",
    lastRun: new Date(Date.now() - 3 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 21 * 60 * 60 * 1000),
    status: "active",
    type: "license_check",
  },
  {
    id: "data_cleanup",
    name: "Dọn dẹp dữ liệu",
    description: "Xóa dữ liệu cũ (logs, alerts đã xử lý > 30 ngày)",
    schedule: "0 0 2 * * *",
    scheduleDisplay: "02:00 hàng ngày",
    lastRun: new Date(Date.now() - 26 * 60 * 60 * 1000),
    nextRun: new Date(Date.now() + 22 * 60 * 60 * 1000),
    status: "active",
    type: "data_cleanup",
  },
  {
    id: "webhook_retry",
    name: "Retry Webhook",
    description: "Thử lại các webhook thất bại",
    schedule: "0 * * * * *",
    scheduleDisplay: "Mỗi phút",
    lastRun: new Date(Date.now() - 30 * 1000),
    nextRun: new Date(Date.now() + 30 * 1000),
    status: "active",
    type: "webhook_retry",
  },
];

export default function ScheduledJobsManagement() {
  const { language } = useLanguage();
  const [jobs, setJobs] = useState<ScheduledJob[]>(defaultJobs);

  const toggleJob = (id: string) => {
    setJobs(jobs.map((job) => 
      job.id === id 
        ? { ...job, status: job.status === "active" ? "paused" : "active" }
        : job
    ));
    const job = jobs.find((j) => j.id === id);
    if (job) {
      toast.success(
        job.status === "active" 
          ? (language === "vi" ? `Đã tạm dừng: ${job.name}` : `Paused: ${job.name}`)
          : (language === "vi" ? `Đã kích hoạt: ${job.name}` : `Activated: ${job.name}`)
      );
    }
  };

  const runNow = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job) {
      toast.success(language === "vi" ? `Đang chạy: ${job.name}` : `Running: ${job.name}`);
      setJobs(jobs.map((j) => 
        j.id === id ? { ...j, lastRun: new Date() } : j
      ));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "shift_report": return <FileText className="h-4 w-4" />;
      case "alert_check": return <Bell className="h-4 w-4" />;
      case "license_check": return <Mail className="h-4 w-4" />;
      case "data_cleanup": return <Database className="h-4 w-4" />;
      case "webhook_retry": return <RefreshCw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">{language === "vi" ? "Hoạt động" : "Active"}</Badge>;
      case "paused":
        return <Badge variant="secondary">{language === "vi" ? "Tạm dừng" : "Paused"}</Badge>;
      case "error":
        return <Badge variant="destructive">{language === "vi" ? "Lỗi" : "Error"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeCount = jobs.filter((j) => j.status === "active").length;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === "vi" ? "Quản lý Scheduled Jobs" : "Scheduled Jobs Management"}
            </h1>
            <p className="text-muted-foreground">
              {language === "vi" 
                ? "Quản lý các tác vụ tự động chạy theo lịch" 
                : "Manage automated scheduled tasks"}
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            {activeCount}/{jobs.length} {language === "vi" ? "đang hoạt động" : "active"}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter((j) => j.status === "active").length}</p>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Đang hoạt động" : "Active"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Pause className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter((j) => j.status === "paused").length}</p>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Tạm dừng" : "Paused"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter((j) => j.type === "shift_report").length}</p>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Báo cáo ca" : "Shift Reports"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobs.filter((j) => j.type === "alert_check").length}</p>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Kiểm tra cảnh báo" : "Alert Checks"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "vi" ? "Danh sách Scheduled Jobs" : "Scheduled Jobs List"}</CardTitle>
            <CardDescription>
              {language === "vi" 
                ? "Tất cả các tác vụ tự động được cấu hình trong hệ thống" 
                : "All automated tasks configured in the system"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "vi" ? "Tên Job" : "Job Name"}</TableHead>
                  <TableHead>{language === "vi" ? "Lịch chạy" : "Schedule"}</TableHead>
                  <TableHead>{language === "vi" ? "Lần chạy cuối" : "Last Run"}</TableHead>
                  <TableHead>{language === "vi" ? "Lần chạy tiếp" : "Next Run"}</TableHead>
                  <TableHead>{language === "vi" ? "Trạng thái" : "Status"}</TableHead>
                  <TableHead className="text-right">{language === "vi" ? "Thao tác" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          {getTypeIcon(job.type)}
                        </div>
                        <div>
                          <p className="font-medium">{job.name}</p>
                          <p className="text-sm text-muted-foreground">{job.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{job.scheduleDisplay}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(job.lastRun)}</TableCell>
                    <TableCell>{formatDate(job.nextRun)}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => runNow(job.id)}
                          title={language === "vi" ? "Chạy ngay" : "Run now"}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Switch 
                          checked={job.status === "active"}
                          onCheckedChange={() => toggleJob(job.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
