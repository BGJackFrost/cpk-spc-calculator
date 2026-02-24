/**
 * ImageUploader Component - Upload hình ảnh vào S3
 */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  category: "golden_sample" | "inspection" | "defect";
  onUploadComplete?: (url: string, fileKey: string) => void;
  onError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export default function ImageUploader({
  category,
  onUploadComplete,
  onError,
  maxSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.aoiAvi.uploadImage.useMutation({
    onSuccess: (data) => {
      setUploading(false);
      setProgress(100);
      onUploadComplete?.(data.url, data.fileKey);
    },
    onError: (error) => {
      setUploading(false);
      setProgress(0);
      onError?.(error.message);
    },
  });

  const handleFile = async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      onError?.(`Loại file không hợp lệ. Chỉ chấp nhận: ${acceptedTypes.join(", ")}`);
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      onError?.(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    setProgress(10);

    const base64Reader = new FileReader();
    base64Reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      setProgress(30);
      
      uploadMutation.mutate({
        fileName: file.name,
        fileData: base64,
        contentType: file.type,
        category,
      });
      setProgress(70);
    };
    base64Reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-contain rounded-lg bg-muted"
            />
            {!uploading && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Đang tải lên...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              {isDragging ? (
                <Upload className="h-10 w-10 text-primary" />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-sm">
                <span className="font-medium text-primary">Nhấp để chọn</span>
                <span className="text-muted-foreground"> hoặc kéo thả hình ảnh</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {acceptedTypes.map(t => t.split("/")[1].toUpperCase()).join(", ")} • Tối đa {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}

        {(uploading || progress === 100) && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {progress === 100 ? "Hoàn tất!" : `${progress}%`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
