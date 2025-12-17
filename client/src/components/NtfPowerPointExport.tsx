import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, FileType, Loader2 } from "lucide-react";
import PptxGenJS from "pptxgenjs";

interface NtfPowerPointExportProps {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function NtfPowerPointExport({ variant = "outline", size = "default" }: NtfPowerPointExportProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeSuppliers, setIncludeSuppliers] = useState(true);
  const [includeProducts, setIncludeProducts] = useState(true);

  const exportMutation = trpc.ceoDashboard.exportPowerPoint.useMutation({
    onSuccess: async (data) => {
      try {
        await generatePowerPoint(data);
        toast.success("Đã xuất báo cáo PowerPoint thành công");
        setIsOpen(false);
      } catch (error) {
        toast.error("Lỗi khi tạo file PowerPoint");
        console.error(error);
      } finally {
        setIsExporting(false);
      }
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
      setIsExporting(false);
    },
  });

  const generatePowerPoint = async (data: any) => {
    const pptx = new PptxGenJS();
    pptx.author = "SPC/CPK Calculator";
    pptx.title = `Báo cáo NTF ${data.year}`;
    pptx.subject = "NTF Analysis Report";

    // Slide 1: Title
    const slide1 = pptx.addSlide();
    slide1.addText("BÁO CÁO PHÂN TÍCH NTF", {
      x: 0.5, y: 2, w: 9, h: 1,
      fontSize: 36, bold: true, color: "1e3a8a",
      align: "center"
    });
    slide1.addText(`Năm ${data.year}`, {
      x: 0.5, y: 3, w: 9, h: 0.5,
      fontSize: 24, color: "64748b",
      align: "center"
    });
    slide1.addText(`Ngày tạo: ${new Date(data.generatedAt).toLocaleDateString('vi-VN')}`, {
      x: 0.5, y: 4, w: 9, h: 0.5,
      fontSize: 14, color: "94a3b8",
      align: "center"
    });

    // Slide 2: YTD Summary
    const slide2 = pptx.addSlide();
    slide2.addText("TỔNG QUAN NĂM", {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: "1e3a8a"
    });

    const ytdData = [
      ["Chỉ số", "Giá trị"],
      ["Tổng lỗi phát hiện", data.ytd.total.toLocaleString()],
      ["NTF (Không phải lỗi)", data.ytd.ntfCount.toLocaleString()],
      ["NTF Rate", `${data.ytd.ntfRate.toFixed(1)}%`],
    ];

    slide2.addTable(ytdData, {
      x: 0.5, y: 1.2, w: 4,
      fontSize: 14,
      border: { pt: 1, color: "e2e8f0" },
      fill: { color: "f8fafc" },
      fontFace: "Arial"
    });

    // Add NTF Rate indicator
    const ntfRateColor = data.ytd.ntfRate <= 15 ? "22c55e" : data.ytd.ntfRate <= 25 ? "f59e0b" : "ef4444";
    slide2.addText(`${data.ytd.ntfRate.toFixed(1)}%`, {
      x: 5.5, y: 1.5, w: 3.5, h: 1.5,
      fontSize: 48, bold: true, color: ntfRateColor,
      align: "center"
    });
    slide2.addText("NTF Rate", {
      x: 5.5, y: 3, w: 3.5, h: 0.5,
      fontSize: 16, color: "64748b",
      align: "center"
    });

    // Slide 3: Quarterly Analysis
    const slide3 = pptx.addSlide();
    slide3.addText("PHÂN TÍCH THEO QUÝ", {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: "1e3a8a"
    });

    const quarterlyData = [
      ["Quý", "Tổng lỗi", "NTF", "NTF Rate"],
      ...data.quarterly.map((q: any) => [
        q.quarter,
        q.total.toLocaleString(),
        q.ntfCount.toLocaleString(),
        `${q.ntfRate.toFixed(1)}%`
      ])
    ];

    slide3.addTable(quarterlyData, {
      x: 0.5, y: 1.2, w: 9,
      fontSize: 14,
      border: { pt: 1, color: "e2e8f0" },
      fill: { color: "f8fafc" },
      fontFace: "Arial",
      colW: [2, 2.5, 2.5, 2]
    });

    // Add chart data as text (simplified)
    const chartData = data.quarterly.map((q: any) => `${q.quarter}: ${q.ntfRate.toFixed(1)}%`).join(" | ");
    slide3.addText(chartData, {
      x: 0.5, y: 4, w: 9, h: 0.5,
      fontSize: 12, color: "64748b",
      align: "center"
    });

    // Slide 4: Top Suppliers (if included)
    if (includeSuppliers && data.topSuppliers?.length > 0) {
      const slide4 = pptx.addSlide();
      slide4.addText("NTF THEO NHÀ CUNG CẤP", {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 28, bold: true, color: "1e3a8a"
      });

      const supplierData = [
        ["Nhà cung cấp", "Tổng lỗi", "NTF", "NTF Rate"],
        ...data.topSuppliers.map((s: any) => [
          s.name,
          s.total.toLocaleString(),
          s.ntfCount.toLocaleString(),
          `${s.ntfRate.toFixed(1)}%`
        ])
      ];

      slide4.addTable(supplierData, {
        x: 0.5, y: 1.2, w: 9,
        fontSize: 14,
        border: { pt: 1, color: "e2e8f0" },
        fill: { color: "f8fafc" },
        fontFace: "Arial",
        colW: [3.5, 2, 2, 1.5]
      });
    }

    // Slide 5: Top Products (if included)
    if (includeProducts && data.topProducts?.length > 0) {
      const slide5 = pptx.addSlide();
      slide5.addText("NTF THEO SẢN PHẨM", {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 28, bold: true, color: "1e3a8a"
      });

      const productData = [
        ["Sản phẩm", "Tổng lỗi", "NTF", "NTF Rate"],
        ...data.topProducts.map((p: any) => [
          p.name,
          p.total.toLocaleString(),
          p.ntfCount.toLocaleString(),
          `${p.ntfRate.toFixed(1)}%`
        ])
      ];

      slide5.addTable(productData, {
        x: 0.5, y: 1.2, w: 9,
        fontSize: 14,
        border: { pt: 1, color: "e2e8f0" },
        fill: { color: "f8fafc" },
        fontFace: "Arial",
        colW: [3.5, 2, 2, 1.5]
      });
    }

    // Slide 6: Recommendations
    const slideRec = pptx.addSlide();
    slideRec.addText("KHUYẾN NGHỊ", {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 28, bold: true, color: "1e3a8a"
    });

    const recommendations = [
      "1. Tập trung cải thiện các nguyên nhân NTF hàng đầu",
      "2. Rà soát định kỳ các thiết bị đo và cảm biến",
      "3. Đào tạo nhân viên về phân loại lỗi chính xác",
      "4. Thiết lập ngưỡng cảnh báo NTF tự động",
      "5. Theo dõi và đánh giá nhà cung cấp có NTF cao"
    ];

    recommendations.forEach((rec, i) => {
      slideRec.addText(rec, {
        x: 0.5, y: 1.2 + i * 0.7, w: 9, h: 0.6,
        fontSize: 16, color: "334155"
      });
    });

    // Download
    pptx.writeFile({ fileName: `NTF_Report_${data.year}.pptx` });
  };

  const handleExport = () => {
    setIsExporting(true);
    exportMutation.mutate({ year });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <FileType className="w-4 h-4 mr-2" />
          Export PowerPoint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Báo cáo NTF ra PowerPoint</DialogTitle>
          <DialogDescription>Chọn năm và nội dung muốn xuất</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Năm báo cáo</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nội dung bao gồm</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="suppliers" 
                  checked={includeSuppliers} 
                  onCheckedChange={(c) => setIncludeSuppliers(!!c)} 
                />
                <label htmlFor="suppliers" className="text-sm">Phân tích theo Nhà cung cấp</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="products" 
                  checked={includeProducts} 
                  onCheckedChange={(c) => setIncludeProducts(!!c)} 
                />
                <label htmlFor="products" className="text-sm">Phân tích theo Sản phẩm</label>
              </div>
            </div>
          </div>

          <Button onClick={handleExport} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Xuất PowerPoint
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
