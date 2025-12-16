import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Package, AlertTriangle, CheckCircle2 } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: any) => void;
  title?: string;
  description?: string;
}

export default function QRScanner({ 
  open, 
  onOpenChange, 
  onScanSuccess,
  title = "Quét mã QR",
  description = "Đưa mã QR vào vùng quét để tra cứu"
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !scannerRef.current) {
      // Initialize scanner when dialog opens
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    return () => {
      // Cleanup when component unmounts
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [open]);

  const startScanning = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    setError(null);
    setScannedData(null);

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // On successful scan
          try {
            const data = JSON.parse(decodedText);
            setScannedData(data);
            setIsScanning(false);
            scannerRef.current?.stop().catch(console.error);
            onScanSuccess(data);
          } catch (e) {
            // If not JSON, treat as plain text
            setScannedData({ raw: decodedText });
            setIsScanning(false);
            scannerRef.current?.stop().catch(console.error);
          }
        },
        (errorMessage) => {
          // Ignore continuous scan errors
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      setError(err.message || "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanning();
    setScannedData(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Area */}
          <div 
            id="qr-reader" 
            ref={containerRef}
            className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
            style={{ display: isScanning ? 'block' : 'none' }}
          />

          {/* Placeholder when not scanning */}
          {!isScanning && !scannedData && (
            <div className="w-full aspect-square bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
              <Camera className="w-16 h-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Nhấn nút bên dưới để bắt đầu quét
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Scanned Result */}
          {scannedData && (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Đã quét thành công
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scannedData.partNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã PT:</span>
                    <span className="font-mono font-bold">{scannedData.partNumber}</span>
                  </div>
                )}
                {scannedData.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tên:</span>
                    <span className="font-medium">{scannedData.name}</span>
                  </div>
                )}
                {scannedData.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Danh mục:</span>
                    <Badge variant="outline">{scannedData.category}</Badge>
                  </div>
                )}
                {scannedData.stock !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tồn kho:</span>
                    <span className="font-bold">{scannedData.stock}</span>
                  </div>
                )}
                {scannedData.raw && (
                  <div className="text-sm text-muted-foreground break-all">
                    {scannedData.raw}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                {scannedData ? "Quét lại" : "Bắt đầu quét"}
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1">
                <CameraOff className="w-4 h-4 mr-2" />
                Dừng quét
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
