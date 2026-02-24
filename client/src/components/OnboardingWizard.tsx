import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  Database,
  Factory,
  Settings,
  BarChart3,
  Users,
  Bell,
  Rocket,
  X
} from "lucide-react";
import { Link } from "wouter";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  completed: boolean;
  optional?: boolean;
}

const ONBOARDING_STORAGE_KEY = "cpk_onboarding_completed";
const ONBOARDING_DISMISSED_KEY = "cpk_onboarding_dismissed";

export function OnboardingWizard() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Load saved state
  useEffect(() => {
    const savedCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const savedDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    
    if (savedCompleted) {
      setCompletedSteps(JSON.parse(savedCompleted));
    }
    if (savedDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Save completed steps
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedSteps));
  }, [completedSteps]);

  const steps: OnboardingStep[] = [
    {
      id: "database",
      title: "Kết nối Database",
      description: "Cấu hình kết nối đến database máy móc để lấy dữ liệu đo lường",
      icon: <Database className="h-6 w-6" />,
      link: "/database-settings",
      completed: completedSteps.includes("database"),
    },
    {
      id: "production-line",
      title: "Thiết lập Dây chuyền",
      description: "Tạo dây chuyền sản xuất, công trạm và máy móc",
      icon: <Factory className="h-6 w-6" />,
      link: "/production-lines",
      completed: completedSteps.includes("production-line"),
    },
    {
      id: "products",
      title: "Quản lý Sản phẩm",
      description: "Thêm sản phẩm và cấu hình tiêu chuẩn USL/LSL",
      icon: <Settings className="h-6 w-6" />,
      link: "/products",
      completed: completedSteps.includes("products"),
    },
    {
      id: "mapping",
      title: "Mapping Dữ liệu",
      description: "Liên kết sản phẩm với bảng dữ liệu trong database",
      icon: <BarChart3 className="h-6 w-6" />,
      link: "/mappings",
      completed: completedSteps.includes("mapping"),
    },
    {
      id: "spc-plan",
      title: "Tạo SPC Plan",
      description: "Thiết lập kế hoạch lấy mẫu và phân tích SPC tự động",
      icon: <Rocket className="h-6 w-6" />,
      link: "/spc-plans",
      completed: completedSteps.includes("spc-plan"),
    },
    {
      id: "users",
      title: "Quản lý Người dùng",
      description: "Thêm người dùng và phân quyền truy cập",
      icon: <Users className="h-6 w-6" />,
      link: "/users",
      completed: completedSteps.includes("users"),
      optional: true,
    },
    {
      id: "notifications",
      title: "Cấu hình Thông báo",
      description: "Thiết lập email và cảnh báo khi CPK vượt ngưỡng",
      icon: <Bell className="h-6 w-6" />,
      link: "/email-settings",
      completed: completedSteps.includes("notifications"),
      optional: true,
    },
  ];

  const progress = (completedSteps.length / steps.length) * 100;
  const allRequiredCompleted = steps
    .filter(s => !s.optional)
    .every(s => completedSteps.includes(s.id));

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  };

  const handleReset = () => {
    setCompletedSteps([]);
    setCurrentStep(0);
    setDismissed(false);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  };

  // Don't show if dismissed or all required steps completed
  if (dismissed || allRequiredCompleted) {
    return null;
  }

  // Only show for admin users
  if (user?.role !== "admin") {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Hướng dẫn thiết lập
            </Badge>
            <span className="text-sm text-muted-foreground">
              {completedSteps.length}/{steps.length} bước hoàn thành
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {currentStepData.icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {currentStepData.title}
              {currentStepData.optional && (
                <Badge variant="outline" className="text-xs">Tùy chọn</Badge>
              )}
              {currentStepData.completed && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {currentStepData.description}
            </CardDescription>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1 mt-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary"
                  : completedSteps.includes(step.id)
                  ? "bg-green-500"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Sau
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          {!currentStepData.completed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markStepCompleted(currentStepData.id)}
            >
              Đánh dấu hoàn thành
            </Button>
          )}
          <Link href={currentStepData.link}>
            <Button size="sm">
              Đi đến
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

// Hook to check onboarding status
export function useOnboardingStatus() {
  const [status, setStatus] = useState({
    completed: false,
    dismissed: false,
    progress: 0,
  });

  useEffect(() => {
    const savedCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const savedDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    
    const completedSteps = savedCompleted ? JSON.parse(savedCompleted) : [];
    const totalSteps = 7;
    
    setStatus({
      completed: completedSteps.length >= 5, // 5 required steps
      dismissed: savedDismissed === "true",
      progress: (completedSteps.length / totalSteps) * 100,
    });
  }, []);

  return status;
}

// Button to reset onboarding (for Settings page)
export function ResetOnboardingButton() {
  const handleReset = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    window.location.reload();
  };

  return (
    <Button variant="outline" onClick={handleReset}>
      Xem lại hướng dẫn thiết lập
    </Button>
  );
}
