import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  Bell, 
  FileSpreadsheet, 
  Brain,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  const features = [
    {
      icon: TrendingUp,
      title: "Phân tích SPC/CPK",
      description: "Tính toán tự động các chỉ số Cp, Cpk, UCL, LCL từ dữ liệu kiểm tra",
    },
    {
      icon: BarChart3,
      title: "Control Charts",
      description: "Biểu đồ X-bar và R-chart trực quan để theo dõi xu hướng",
    },
    {
      icon: Database,
      title: "Kết nối Database động",
      description: "Cấu hình linh hoạt connection string và mapping bảng dữ liệu",
    },
    {
      icon: Bell,
      title: "Cảnh báo thông minh",
      description: "Thông báo tự động khi CPK vượt ngưỡng cho phép",
    },
    {
      icon: FileSpreadsheet,
      title: "Xuất báo cáo",
      description: "Xuất kết quả phân tích ra PDF hoặc Excel để lưu trữ",
    },
    {
      icon: Brain,
      title: "Phân tích AI",
      description: "Sử dụng LLM để đưa ra nhận xét và khuyến nghị cải tiến",
    },
  ];

  const benefits = [
    "Giảm thời gian phân tích dữ liệu kiểm tra",
    "Phát hiện sớm các bất thường trong quy trình",
    "Cải thiện năng lực quy trình sản xuất",
    "Đưa ra quyết định dựa trên dữ liệu",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">SPC/CPK Calculator</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>
              Đăng nhập
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Hệ thống phân tích SPC/CPK thông minh
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Kiểm soát chất lượng{" "}
              <span className="gradient-text">quy trình sản xuất</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Phân tích dữ liệu kiểm tra máy, tính toán chỉ số CPK và theo dõi xu hướng 
              quy trình sản xuất với biểu đồ Control Chart trực quan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>
                  Bắt đầu ngay
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline">
                Tìm hiểu thêm
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tính năng nổi bật</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hệ thống cung cấp đầy đủ công cụ để phân tích và kiểm soát chất lượng quy trình sản xuất
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="elegant-card p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Tại sao chọn hệ thống SPC/CPK của chúng tôi?
              </h2>
              <p className="text-muted-foreground mb-8">
                Hệ thống được thiết kế để giúp bạn dễ dàng theo dõi và cải thiện 
                năng lực quy trình sản xuất thông qua phân tích dữ liệu thống kê.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-chart-3 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="elegant-card p-8 bg-gradient-to-br from-primary/5 to-chart-2/5">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                  <span className="text-muted-foreground">Cpk hiện tại</span>
                  <span className="text-2xl font-bold text-chart-3">1.45</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                  <span className="text-muted-foreground">Số mẫu phân tích</span>
                  <span className="text-2xl font-bold">1,234</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className="flex items-center gap-2 text-chart-3 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    Đạt yêu cầu
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Sẵn sàng cải thiện quy trình sản xuất?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Đăng nhập ngay để bắt đầu phân tích dữ liệu kiểm tra và theo dõi chỉ số CPK
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href={getLoginUrl()}>
              Đăng nhập ngay
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-muted-foreground">
          <p>© 2024 SPC/CPK Calculator. Hệ thống phân tích chất lượng quy trình sản xuất.</p>
        </div>
      </footer>
    </div>
  );
}
