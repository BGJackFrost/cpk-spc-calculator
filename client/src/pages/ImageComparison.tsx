import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Upload, 
  ArrowLeftRight, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Columns
} from "lucide-react";
import { SNImageComparison } from "@/components/SNImageComparison";

export default function ImageComparison() {
  const [activeTab, setActiveTab] = useState("upload");
  const [beforeImage, setBeforeImage] = useState<{ file: File | null; preview: string; id?: number }>({ file: null, preview: "" });
  const [afterImage, setAfterImage] = useState<{ file: File | null; preview: string; id?: number }>({ file: null, preview: "" });
  const [productCode, setProductCode] = useState("");
  const [comparisonType, setComparisonType] = useState<"quality_improvement" | "defect_fix" | "process_change" | "before_after">("before_after");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const { data: imagesData, refetch: refetchImages } = trpc.qualityImage.getImages.useQuery({ limit: 100 });
  const { data: comparisonsData, refetch: refetchComparisons } = trpc.qualityImage.getComparisons.useQuery({ limit: 50 });

  const uploadMutation = trpc.qualityImage.uploadImage.useMutation({
    onSuccess: () => refetchImages(),
  });

  const createComparisonMutation = trpc.qualityImage.createComparison.useMutation({
    onSuccess: (data) => {
      refetchComparisons();
      if (data.status === "completed") toast.success("So sánh hoàn tất!");
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      if (type === "before") setBeforeImage({ file, preview });
      else setAfterImage({ file, preview });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadAndCompare = async () => {
    if (!beforeImage.file || !afterImage.file) {
      toast.error("Vui lòng chọn cả 2 hình ảnh trước và sau");
      return;
    }

    setIsUploading(true);
    try {
      const beforeBase64 = beforeImage.preview.split(",")[1];
      const beforeResult = await uploadMutation.mutateAsync({
        imageBase64: beforeBase64,
        filename: beforeImage.file.name,
        mimeType: beforeImage.file.type,
        imageType: "before",
        productCode: productCode || undefined,
        analyzeWithAi: true,
      });

      const afterBase64 = afterImage.preview.split(",")[1];
      const afterResult = await uploadMutation.mutateAsync({
        imageBase64: afterBase64,
        filename: afterImage.file.name,
        mimeType: afterImage.file.type,
        imageType: "after",
        productCode: productCode || undefined,
        analyzeWithAi: true,
      });

      setIsUploading(false);
      setIsComparing(true);

      await createComparisonMutation.mutateAsync({
        beforeImageId: beforeResult.id,
        afterImageId: afterResult.id,
        comparisonType,
        productCode: productCode || undefined,
        notes: notes || undefined,
      });

      setIsComparing(false);
      setBeforeImage({ file: null, preview: "" });
      setAfterImage({ file: null, preview: "" });
      setProductCode("");
      setNotes("");
      setActiveTab("history");
    } catch {
      setIsUploading(false);
      setIsComparing(false);
      toast.error("Có lỗi xảy ra khi xử lý");
    }
  };

  const handleSelectExistingImage = (imageId: number, imageUrl: string, type: "before" | "after") => {
    if (type === "before") setBeforeImage({ file: null, preview: imageUrl, id: imageId });
    else setAfterImage({ file: null, preview: imageUrl, id: imageId });
    toast.success(`Đã chọn hình ảnh ${type === "before" ? "trước" : "sau"}`);
  };

  const handleCompareExisting = async () => {
    if (!beforeImage.id || !afterImage.id) {
      toast.error("Vui lòng chọn cả 2 hình ảnh từ thư viện");
      return;
    }
    setIsComparing(true);
    try {
      await createComparisonMutation.mutateAsync({
        beforeImageId: beforeImage.id,
        afterImageId: afterImage.id,
        comparisonType,
        productCode: productCode || undefined,
        notes: notes || undefined,
      });
      setIsComparing(false);
      setActiveTab("history");
    } catch {
      setIsComparing(false);
    }
  };

  const images = imagesData?.images || [];
  const comparisons = comparisonsData?.comparisons || [];

  const getImprovementIcon = (score: number | null) => {
    if (score === null) return <Minus className="h-4 w-4" />;
    if (score > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">So sánh Hình ảnh Trước/Sau</h1>
          <p className="text-muted-foreground">Upload và so sánh hình ảnh để theo dõi tiến độ cải thiện chất lượng với AI</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upload">Upload & So sánh</TabsTrigger>
            <TabsTrigger value="sn-compare" className="flex items-center gap-1">
              <Columns className="h-4 w-4" />
              So sánh theo SN
            </TabsTrigger>
            <TabsTrigger value="library">Thư viện hình ảnh</TabsTrigger>
            <TabsTrigger value="history">Lịch sử so sánh</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Hình ảnh TRƯỚC</CardTitle>
                  <CardDescription>Hình ảnh trước khi cải thiện</CardDescription>
                </CardHeader>
                <CardContent>
                  <input ref={beforeInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "before")} />
                  {beforeImage.preview ? (
                    <div className="relative">
                      <img src={beforeImage.preview} alt="Before" className="w-full h-64 object-contain rounded-lg border" />
                      <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setBeforeImage({ file: null, preview: "" })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => beforeInputRef.current?.click()}>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Click để upload hình ảnh</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Hình ảnh SAU</CardTitle>
                  <CardDescription>Hình ảnh sau khi cải thiện</CardDescription>
                </CardHeader>
                <CardContent>
                  <input ref={afterInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "after")} />
                  {afterImage.preview ? (
                    <div className="relative">
                      <img src={afterImage.preview} alt="After" className="w-full h-64 object-contain rounded-lg border" />
                      <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setAfterImage({ file: null, preview: "" })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => afterInputRef.current?.click()}>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Click để upload hình ảnh</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Thông tin so sánh</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã sản phẩm</Label>
                    <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="VD: SP001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại so sánh</Label>
                    <Select value={comparisonType} onValueChange={(v: typeof comparisonType) => setComparisonType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before_after">Trước/Sau chung</SelectItem>
                        <SelectItem value="quality_improvement">Cải thiện chất lượng</SelectItem>
                        <SelectItem value="defect_fix">Sửa lỗi</SelectItem>
                        <SelectItem value="process_change">Thay đổi quy trình</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mô tả thêm về so sánh này..." rows={3} />
                </div>
                <Button onClick={handleUploadAndCompare} disabled={!beforeImage.preview || !afterImage.preview || isUploading || isComparing} className="w-full">
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang upload...</> : isComparing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI đang phân tích...</> : <><ArrowLeftRight className="h-4 w-4 mr-2" />Upload & So sánh với AI</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sn-compare" className="space-y-4">
            <SNImageComparison maxSlots={4} initialMode="side-by-side" />
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thư viện hình ảnh</CardTitle>
                <CardDescription>Chọn hình ảnh từ thư viện để so sánh</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img src={image.imageUrl} alt={`Image ${image.id}`} className="w-full h-32 object-cover rounded-lg border" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleSelectExistingImage(image.id, image.imageUrl, "before")}>Trước</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleSelectExistingImage(image.id, image.imageUrl, "after")}>Sau</Button>
                      </div>
                      <Badge className="absolute top-1 left-1" variant={image.imageType === "before" ? "outline" : "default"}>{image.imageType}</Badge>
                    </div>
                  ))}
                </div>
                {images.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có hình ảnh nào. Upload hình ảnh mới để bắt đầu.</p>
                  </div>
                )}
                {(beforeImage.id || afterImage.id) && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Hình ảnh đã chọn:</h4>
                    <div className="flex gap-4 items-center">
                      {beforeImage.id && <div className="flex-1"><p className="text-sm text-muted-foreground mb-2">Trước:</p><img src={beforeImage.preview} alt="Before" className="h-24 object-contain rounded" /></div>}
                      {afterImage.id && <div className="flex-1"><p className="text-sm text-muted-foreground mb-2">Sau:</p><img src={afterImage.preview} alt="After" className="h-24 object-contain rounded" /></div>}
                    </div>
                    <Button className="mt-4 w-full" onClick={handleCompareExisting} disabled={!beforeImage.id || !afterImage.id || isComparing}>
                      {isComparing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang so sánh...</> : <><ArrowLeftRight className="h-4 w-4 mr-2" />So sánh với AI</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử so sánh</CardTitle>
                <CardDescription>Các so sánh đã thực hiện</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparisons.map((comparison) => (
                    <div key={comparison.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={comparison.status === "completed" ? "default" : "secondary"}>
                            {comparison.status === "completed" ? <><CheckCircle className="h-3 w-3 mr-1" />Hoàn tất</> : comparison.status === "analyzing" ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Đang phân tích</> : <><XCircle className="h-3 w-3 mr-1" />Thất bại</>}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{new Date(comparison.createdAt!).toLocaleString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getImprovementIcon(comparison.improvementScore ? parseFloat(comparison.improvementScore) : null)}
                          <span className="font-medium">{comparison.improvementScore ? `${parseFloat(comparison.improvementScore) > 0 ? "+" : ""}${comparison.improvementScore}` : "N/A"}</span>
                        </div>
                      </div>
                      {comparison.summary && <p className="text-sm text-muted-foreground mb-4">{comparison.summary}</p>}
                      <div className="flex gap-4">
                        <div className="flex-1"><p className="text-xs text-muted-foreground">Điểm trước: {comparison.beforeScore || "N/A"}</p></div>
                        <div className="flex-1"><p className="text-xs text-muted-foreground">Điểm sau: {comparison.afterScore || "N/A"}</p></div>
                      </div>
                    </div>
                  ))}
                  {comparisons.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có so sánh nào. Tạo so sánh mới để bắt đầu.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
