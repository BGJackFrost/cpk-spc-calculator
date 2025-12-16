import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Package, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, 
  QrCode, Printer, Mail, AlertTriangle, ShoppingCart, Building2,
  ChevronRight, CheckCircle2, Info, Lightbulb
} from "lucide-react";
import { Link } from "wouter";

export default function SparePartsGuide() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              Hướng dẫn sử dụng Quản lý Phụ tùng
            </h1>
            <p className="text-muted-foreground">Tài liệu chi tiết về xuất/nhập/kiểm kê kho phụ tùng</p>
          </div>
          <Link href="/spare-parts">
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Đi đến Quản lý Phụ tùng
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="import">Nhập kho</TabsTrigger>
            <TabsTrigger value="export">Xuất kho</TabsTrigger>
            <TabsTrigger value="inventory">Kiểm kê</TabsTrigger>
            <TabsTrigger value="features">Tính năng khác</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Giới thiệu hệ thống</CardTitle>
                <CardDescription>Tổng quan về module Quản lý Phụ tùng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Module Quản lý Phụ tùng giúp bạn theo dõi và quản lý toàn bộ kho phụ tùng, 
                  từ việc nhập hàng, xuất kho sử dụng, đến kiểm kê định kỳ.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Quản lý phụ tùng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>• Thêm/sửa/xóa phụ tùng</p>
                      <p>• Phân loại theo danh mục</p>
                      <p>• Thiết lập mức tồn tối thiểu/tối đa</p>
                      <p>• Quản lý nhà cung cấp</p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowDownToLine className="w-5 h-5 text-green-500" />
                        Nhập kho
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>• Nhập từ đơn đặt hàng</p>
                      <p>• Nhập điều chỉnh</p>
                      <p>• Ghi nhận đơn giá</p>
                      <p>• Lịch sử giao dịch đầy đủ</p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowUpFromLine className="w-5 h-5 text-red-500" />
                        Xuất kho
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>• Xuất cho Work Order</p>
                      <p>• Xuất điều chỉnh</p>
                      <p>• Kiểm tra tồn kho trước xuất</p>
                      <p>• Tự động tính giá trị</p>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-purple-500" />
                        Kiểm kê
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>• Tạo phiếu kiểm kê</p>
                      <p>• Nhập số lượng thực tế</p>
                      <p>• So sánh chênh lệch</p>
                      <p>• Điều chỉnh tồn kho tự động</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Quy trình làm việc cơ bản
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="py-2 px-3">1. Thêm phụ tùng</Badge>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="outline" className="py-2 px-3">2. Thêm NCC</Badge>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="outline" className="py-2 px-3">3. Tạo đơn đặt hàng</Badge>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="outline" className="py-2 px-3">4. Nhập kho</Badge>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="outline" className="py-2 px-3">5. Xuất kho sử dụng</Badge>
                  <ChevronRight className="w-4 h-4" />
                  <Badge variant="outline" className="py-2 px-3">6. Kiểm kê định kỳ</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-green-500" />
                  Hướng dẫn Nhập kho
                </CardTitle>
                <CardDescription>Các cách nhập phụ tùng vào kho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 1: Nhập nhanh (+1)</h3>
                  <div className="pl-4 border-l-2 border-green-500 space-y-2">
                    <p>1. Vào tab <strong>Kho phụ tùng</strong></p>
                    <p>2. Tìm phụ tùng cần nhập</p>
                    <p>3. Nhấn nút <Badge variant="outline">+1</Badge> ở cột Thao tác</p>
                    <p>4. Hệ thống tự động ghi nhận +1 vào tồn kho</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 2: Nhập từ Đơn đặt hàng</h3>
                  <div className="pl-4 border-l-2 border-green-500 space-y-2">
                    <p>1. Vào tab <strong>Đơn đặt hàng</strong></p>
                    <p>2. Tìm đơn hàng có trạng thái "Đã đặt" hoặc "Đã duyệt"</p>
                    <p>3. Nhấn <Badge variant="outline">Nhận hàng</Badge></p>
                    <p>4. Nhập số lượng thực nhận cho từng phụ tùng</p>
                    <p>5. Xác nhận để cập nhật tồn kho</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 3: Nhập điều chỉnh</h3>
                  <div className="pl-4 border-l-2 border-green-500 space-y-2">
                    <p>1. Sử dụng khi cần điều chỉnh số lượng (không qua đơn hàng)</p>
                    <p>2. Vào chi tiết phụ tùng</p>
                    <p>3. Chọn <strong>Nhập kho</strong></p>
                    <p>4. Nhập số lượng và lý do</p>
                  </div>
                </div>

                <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="flex gap-2">
                      <Info className="w-5 h-5 text-yellow-600 shrink-0" />
                      <div>
                        <p className="font-medium">Lưu ý quan trọng:</p>
                        <ul className="text-sm mt-1 space-y-1">
                          <li>• Mọi giao dịch nhập kho đều được ghi lại trong Lịch sử giao dịch</li>
                          <li>• Nên nhập đơn giá để theo dõi giá trị tồn kho chính xác</li>
                          <li>• Ghi rõ lý do nhập để dễ tra cứu sau này</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-red-500" />
                  Hướng dẫn Xuất kho
                </CardTitle>
                <CardDescription>Các cách xuất phụ tùng khỏi kho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 1: Xuất nhanh (-1)</h3>
                  <div className="pl-4 border-l-2 border-red-500 space-y-2">
                    <p>1. Vào tab <strong>Kho phụ tùng</strong></p>
                    <p>2. Tìm phụ tùng cần xuất</p>
                    <p>3. Nhấn nút <Badge variant="outline">-1</Badge> ở cột Thao tác</p>
                    <p>4. Hệ thống kiểm tra tồn kho và trừ 1</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 2: Xuất cho Work Order</h3>
                  <div className="pl-4 border-l-2 border-red-500 space-y-2">
                    <p>1. Khi hoàn thành Work Order trong module Bảo trì</p>
                    <p>2. Chọn phụ tùng đã sử dụng</p>
                    <p>3. Nhập số lượng</p>
                    <p>4. Hệ thống tự động xuất kho và liên kết với Work Order</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cách 3: Quét QR để xuất</h3>
                  <div className="pl-4 border-l-2 border-red-500 space-y-2">
                    <p>1. Nhấn nút <Badge variant="outline">Quét QR</Badge> ở header</p>
                    <p>2. Đưa mã QR của phụ tùng vào camera</p>
                    <p>3. Hệ thống hiển thị thông tin phụ tùng</p>
                    <p>4. Nhấn <Badge variant="outline">-1 Xuất</Badge> để xuất kho</p>
                  </div>
                </div>

                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      <div>
                        <p className="font-medium">Cảnh báo:</p>
                        <ul className="text-sm mt-1 space-y-1">
                          <li>• Không thể xuất khi tồn kho = 0</li>
                          <li>• Hệ thống sẽ cảnh báo khi tồn kho xuống dưới mức tối thiểu</li>
                          <li>• Nên kiểm tra tồn kho trước khi xuất số lượng lớn</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-purple-500" />
                  Hướng dẫn Kiểm kê
                </CardTitle>
                <CardDescription>Quy trình kiểm kê kho định kỳ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Bước 1: Tạo phiếu kiểm kê</h3>
                  <div className="pl-4 border-l-2 border-purple-500 space-y-2">
                    <p>1. Vào module Quản lý Phụ tùng</p>
                    <p>2. Nhấn <Badge variant="outline">Kiểm kê</Badge></p>
                    <p>3. Chọn loại kiểm kê:</p>
                    <ul className="pl-4 space-y-1">
                      <li>• <strong>Toàn bộ:</strong> Kiểm kê tất cả phụ tùng</li>
                      <li>• <strong>Theo danh mục:</strong> Chỉ kiểm kê 1 danh mục</li>
                      <li>• <strong>Theo vị trí:</strong> Kiểm kê theo khu vực kho</li>
                    </ul>
                    <p>4. Nhấn <strong>Tạo phiếu</strong></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Bước 2: Nhập số lượng thực tế</h3>
                  <div className="pl-4 border-l-2 border-purple-500 space-y-2">
                    <p>1. Mở phiếu kiểm kê vừa tạo</p>
                    <p>2. Với mỗi phụ tùng, nhập số lượng đếm được thực tế</p>
                    <p>3. Hệ thống tự động tính chênh lệch</p>
                    <p>4. Ghi chú nếu có bất thường</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Bước 3: Hoàn thành kiểm kê</h3>
                  <div className="pl-4 border-l-2 border-purple-500 space-y-2">
                    <p>1. Kiểm tra lại các mục có chênh lệch</p>
                    <p>2. Chọn <strong>Hoàn thành kiểm kê</strong></p>
                    <p>3. Tùy chọn: <strong>Điều chỉnh tồn kho</strong> để cập nhật số liệu</p>
                    <p>4. Hệ thống ghi nhận và lưu lịch sử</p>
                  </div>
                </div>

                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                  <CardContent className="pt-4">
                    <div className="flex gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <p className="font-medium">Khuyến nghị:</p>
                        <ul className="text-sm mt-1 space-y-1">
                          <li>• Kiểm kê toàn bộ: Hàng tháng hoặc hàng quý</li>
                          <li>• Kiểm kê theo danh mục: Hàng tuần cho phụ tùng quan trọng</li>
                          <li>• Kiểm kê đột xuất: Khi phát hiện bất thường</li>
                          <li>• Nên có 2 người cùng kiểm kê để đối chiếu</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Quét mã QR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Sử dụng camera để quét mã QR trên phụ tùng:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Nhấn nút <strong>Quét QR</strong> ở header</li>
                    <li>Cho phép truy cập camera</li>
                    <li>Đưa mã QR vào vùng quét</li>
                    <li>Xem thông tin và thao tác nhanh</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    In nhãn QR hàng loạt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>In nhiều nhãn QR cùng lúc để dán lên kệ:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Vào tab <strong>Kho phụ tùng</strong></li>
                    <li>Tick chọn các phụ tùng cần in</li>
                    <li>Nhấn <strong>In X nhãn QR</strong></li>
                    <li>Xem trước và in</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Cảnh báo email tự động
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Nhận thông báo khi tồn kho thấp:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Thiết lập mức tồn tối thiểu cho phụ tùng</li>
                    <li>Khi tồn kho xuống dưới mức này</li>
                    <li>Nhấn icon <Mail className="w-4 h-4 inline" /> để gửi cảnh báo</li>
                    <li>Hoặc hệ thống tự động gửi định kỳ</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Đề xuất đặt hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Hệ thống tự động đề xuất đặt hàng:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Vào tab <strong>Đề xuất đặt hàng</strong></li>
                    <li>Xem danh sách phụ tùng cần đặt</li>
                    <li>Chọn và tạo đơn hàng nhanh</li>
                    <li>Gửi cho nhà cung cấp</li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Quản lý Nhà cung cấp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Quản lý thông tin nhà cung cấp phụ tùng:</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Thêm NCC</p>
                    <p className="text-sm text-muted-foreground">Nhấn "Thêm NCC" ở header</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Sửa thông tin</p>
                    <p className="text-sm text-muted-foreground">Tab Nhà cung cấp → Menu → Sửa</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Liên kết phụ tùng</p>
                    <p className="text-sm text-muted-foreground">Chọn NCC khi thêm phụ tùng</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
