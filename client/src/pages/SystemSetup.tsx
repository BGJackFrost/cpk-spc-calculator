import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { 
  Database, Building2, UserCog, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, Server, Shield, ArrowRight
} from "lucide-react";

type SetupStep = "welcome" | "database" | "company" | "admin" | "complete";

export default function SystemSetup() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [isLoading, setIsLoading] = useState(false);

  // Database config
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("3306");
  const [dbName, setDbName] = useState("spc_calculator");
  const [dbUser, setDbUser] = useState("root");
  const [dbPassword, setDbPassword] = useState("");
  const [dbType, setDbType] = useState("mysql");

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Admin account
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Check if system is already initialized
  const { data: setupStatus, isLoading: checkingStatus } = trpc.system.getSetupStatus.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const saveConfigMutation = trpc.system.saveSetupConfig.useMutation({
    onSuccess: () => {
      toast.success("Cấu hình đã được lưu");
    },
    onError: (error) => {
      toast.error(error.message || "Không thể lưu cấu hình");
    },
  });

  const saveCompanyMutation = trpc.system.saveCompanyInfo.useMutation({
    onSuccess: () => {
      toast.success("Thông tin công ty đã được lưu");
    },
    onError: (error) => {
      toast.error(error.message || "Không thể lưu thông tin công ty");
    },
  });

  const createAdminMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Tài khoản Admin đã được tạo");
    },
    onError: (error) => {
      toast.error(error.message || "Không thể tạo tài khoản Admin");
    },
  });

  const completeSetupMutation = trpc.system.completeSetup.useMutation({
    onSuccess: () => {
      toast.success("Khởi tạo hệ thống hoàn tất!");
      setCurrentStep("complete");
    },
    onError: (error) => {
      toast.error(error.message || "Không thể hoàn tất khởi tạo");
    },
  });

  useEffect(() => {
    if (setupStatus?.isInitialized) {
      setLocation("/dashboard");
    }
  }, [setupStatus, setLocation]);

  const steps: { key: SetupStep; title: string; icon: React.ReactNode }[] = [
    { key: "welcome", title: "Chào mừng", icon: <Server className="h-5 w-5" /> },
    { key: "database", title: "Database", icon: <Database className="h-5 w-5" /> },
    { key: "company", title: "Công ty", icon: <Building2 className="h-5 w-5" /> },
    { key: "admin", title: "Admin", icon: <UserCog className="h-5 w-5" /> },
    { key: "complete", title: "Hoàn tất", icon: <CheckCircle2 className="h-5 w-5" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const handleNext = async () => {
    setIsLoading(true);
    try {
      if (currentStep === "database") {
        // Save database config
        const connectionString = `${dbType}://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
        await saveConfigMutation.mutateAsync({
          configs: [
            { key: "db_host", value: dbHost, type: "string" },
            { key: "db_port", value: dbPort, type: "string" },
            { key: "db_name", value: dbName, type: "string" },
            { key: "db_user", value: dbUser, type: "string" },
            { key: "db_type", value: dbType, type: "string" },
            { key: "db_connection_string", value: connectionString, type: "string", encrypted: true },
          ]
        });
        setCurrentStep("company");
      } else if (currentStep === "company") {
        // Save company info
        await saveCompanyMutation.mutateAsync({
          companyName,
          companyCode: companyCode || undefined,
          address: companyAddress || undefined,
          phone: companyPhone || undefined,
          email: companyEmail || undefined,
          industry: industry || undefined,
          contactPerson: contactPerson || undefined,
          contactPhone: contactPhone || undefined,
        });
        setCurrentStep("admin");
      } else if (currentStep === "admin") {
        // Validate passwords
        if (adminPassword !== adminConfirmPassword) {
          toast.error("Mật khẩu xác nhận không khớp");
          setIsLoading(false);
          return;
        }
        if (adminPassword.length < 6) {
          toast.error("Mật khẩu phải có ít nhất 6 ký tự");
          setIsLoading(false);
          return;
        }
        // Create admin account
        await createAdminMutation.mutateAsync({
          username: adminUsername,
          password: adminPassword,
          name: adminName || undefined,
          email: adminEmail || undefined,
        });
        // Complete setup
        await completeSetupMutation.mutateAsync();
      } else if (currentStep === "welcome") {
        setCurrentStep("database");
      }
    } catch (error) {
      console.error("Setup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentStep === "database") setCurrentStep("welcome");
    else if (currentStep === "company") setCurrentStep("database");
    else if (currentStep === "admin") setCurrentStep("company");
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Khởi tạo Hệ thống SPC/CPK Calculator
          </h1>
          <p className="text-gray-600">
            Hoàn thành các bước sau để cấu hình hệ thống
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    index <= currentStepIndex
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      index < currentStepIndex ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStepIndex]?.icon}
              {steps[currentStepIndex]?.title}
            </CardTitle>
            <CardDescription>
              {currentStep === "welcome" && "Chào mừng bạn đến với trình cài đặt hệ thống"}
              {currentStep === "database" && "Cấu hình kết nối database local"}
              {currentStep === "company" && "Nhập thông tin công ty/khách hàng"}
              {currentStep === "admin" && "Tạo tài khoản quản trị viên"}
              {currentStep === "complete" && "Hệ thống đã sẵn sàng sử dụng"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Welcome Step */}
            {currentStep === "welcome" && (
              <div className="text-center py-8">
                <Shield className="h-20 w-20 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Chào mừng đến với SPC/CPK Calculator</h2>
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  Hệ thống quản lý chất lượng và phân tích SPC/CPK chuyên nghiệp.
                  Vui lòng hoàn thành các bước cấu hình để bắt đầu sử dụng.
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Database className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="font-medium">Database</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Building2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="font-medium">Công ty</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <UserCog className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="font-medium">Admin</p>
                  </div>
                </div>
              </div>
            )}

            {/* Database Step */}
            {currentStep === "database" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Loại Database</Label>
                    <Select value={dbType} onValueChange={setDbType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mysql">MySQL</SelectItem>
                        <SelectItem value="mariadb">MariaDB</SelectItem>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Host</Label>
                    <Input value={dbHost} onChange={(e) => setDbHost(e.target.value)} placeholder="localhost" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Port</Label>
                    <Input value={dbPort} onChange={(e) => setDbPort(e.target.value)} placeholder="3306" />
                  </div>
                  <div>
                    <Label>Tên Database</Label>
                    <Input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="spc_calculator" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input value={dbUser} onChange={(e) => setDbUser(e.target.value)} placeholder="root" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Lưu ý:</strong> Đảm bảo database đã được tạo và user có đủ quyền truy cập.
                    Thông tin này sẽ được lưu để sử dụng cho các kết nối local.
                  </p>
                </div>
              </div>
            )}

            {/* Company Step */}
            {currentStep === "company" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tên công ty <span className="text-red-500">*</span></Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Công ty TNHH ABC" />
                  </div>
                  <div>
                    <Label>Mã công ty</Label>
                    <Input value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} placeholder="ABC" />
                  </div>
                </div>
                <div>
                  <Label>Địa chỉ</Label>
                  <Textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Số điện thoại</Label>
                    <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="028-1234-5678" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ngành nghề</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngành nghề" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Điện tử</SelectItem>
                        <SelectItem value="automotive">Ô tô</SelectItem>
                        <SelectItem value="manufacturing">Sản xuất</SelectItem>
                        <SelectItem value="pharmaceutical">Dược phẩm</SelectItem>
                        <SelectItem value="food">Thực phẩm</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Người liên hệ</Label>
                    <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Nguyễn Văn A" />
                  </div>
                </div>
                <div>
                  <Label>SĐT người liên hệ</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0901-234-567" />
                </div>
              </div>
            )}

            {/* Admin Step */}
            {currentStep === "admin" && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tạo tài khoản Admin:</strong> Đây là tài khoản quản trị viên chính của hệ thống.
                    Hãy ghi nhớ thông tin đăng nhập này.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tên đăng nhập <span className="text-red-500">*</span></Label>
                    <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="admin" />
                  </div>
                  <div>
                    <Label>Họ tên</Label>
                    <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Quản trị viên" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mật khẩu <span className="text-red-500">*</span></Label>
                    <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Xác nhận mật khẩu <span className="text-red-500">*</span></Label>
                    <Input type="password" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === "complete" && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-20 w-20 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-4 text-green-700">Khởi tạo hoàn tất!</h2>
                <p className="text-gray-600 mb-6">
                  Hệ thống đã được cấu hình thành công. Bạn có thể bắt đầu sử dụng ngay bây giờ.
                </p>
                <Button onClick={() => setLocation("/local-login")} size="lg">
                  Đăng nhập ngay <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        {currentStep !== "complete" && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === "welcome" || isLoading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === "admin" ? "Hoàn tất" : "Tiếp tục"}
              {currentStep !== "admin" && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
