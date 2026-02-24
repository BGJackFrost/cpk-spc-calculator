import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

interface ChartExportProps {
  chartRef: React.RefObject<{ capture: () => Promise<string | null> }>;
  chartName: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ChartExport: React.FC<ChartExportProps> = ({
  chartRef,
  chartName,
  showLabels = true,
  size = 'medium',
}) => {
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const getIconSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 28;
      default: return 22;
    }
  };

  const getButtonPadding = () => {
    switch (size) {
      case 'small': return 6;
      case 'large': return 12;
      default: return 8;
    }
  };

  const captureChart = useCallback(async (): Promise<string | null> => {
    if (!chartRef.current?.capture) {
      Alert.alert('Lỗi', 'Không thể capture biểu đồ');
      return null;
    }

    try {
      const uri = await chartRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Lỗi', 'Không thể capture biểu đồ');
      return null;
    }
  }, [chartRef]);

  const handleSaveToGallery = useCallback(async () => {
    setSaving(true);
    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để lưu biểu đồ');
        return;
      }

      const uri = await captureChart();
      if (!uri) return;

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${chartName}_${timestamp}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Copy to document directory first
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      // Create album if needed
      const album = await MediaLibrary.getAlbumAsync('CPK SPC Charts');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('CPK SPC Charts', asset, false);
      }

      Alert.alert('Thành công', 'Đã lưu biểu đồ vào thư viện ảnh');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Lỗi', 'Không thể lưu biểu đồ');
    } finally {
      setSaving(false);
    }
  }, [captureChart, chartName]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Không khả dụng', 'Chức năng chia sẻ không khả dụng trên thiết bị này');
        return;
      }

      const uri = await captureChart();
      if (!uri) return;

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${chartName}_${timestamp}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Copy to document directory
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `Chia sẻ ${chartName}`,
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ biểu đồ');
    } finally {
      setSharing(false);
    }
  }, [captureChart, chartName]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const uri = await captureChart();
      if (!uri) return;

      // For PDF export, we'll create a simple HTML wrapper and convert
      // This is a simplified version - in production, use a proper PDF library
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${chartName}_${timestamp}`;
      
      // Read the image as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${chartName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            h1 {
              color: #1e293b;
              margin-bottom: 20px;
            }
            img {
              max-width: 100%;
              height: auto;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
            }
            .footer {
              margin-top: 20px;
              color: #64748b;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>${chartName}</h1>
          <img src="data:image/png;base64,${base64}" alt="${chartName}" />
          <div class="footer">
            Xuất từ CPK SPC Calculator - ${new Date().toLocaleString('vi-VN')}
          </div>
        </body>
        </html>
      `;

      // Save HTML file
      const htmlUri = `${FileSystem.documentDirectory}${filename}.html`;
      await FileSystem.writeAsStringAsync(htmlUri, htmlContent);

      // Share HTML file (can be opened in browser and printed to PDF)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(htmlUri, {
          mimeType: 'text/html',
          dialogTitle: `Xuất ${chartName}`,
        });
      }

      Alert.alert(
        'Thông tin',
        'File HTML đã được tạo. Bạn có thể mở trong trình duyệt và in thành PDF.'
      );
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Lỗi', 'Không thể xuất PDF');
    } finally {
      setExporting(false);
    }
  }, [captureChart, chartName]);

  const iconSize = getIconSize();
  const buttonPadding = getButtonPadding();
  const isLoading = exporting || saving || sharing;

  return (
    <View style={styles.container}>
      {/* Save to Gallery */}
      <TouchableOpacity
        style={[styles.button, { padding: buttonPadding }]}
        onPress={handleSaveToGallery}
        disabled={isLoading}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <Ionicons name="download-outline" size={iconSize} color="#3b82f6" />
        )}
        {showLabels && <Text style={styles.buttonText}>Lưu</Text>}
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        style={[styles.button, { padding: buttonPadding }]}
        onPress={handleShare}
        disabled={isLoading}
      >
        {sharing ? (
          <ActivityIndicator size="small" color="#22c55e" />
        ) : (
          <Ionicons name="share-outline" size={iconSize} color="#22c55e" />
        )}
        {showLabels && <Text style={styles.buttonText}>Chia sẻ</Text>}
      </TouchableOpacity>

      {/* Export PDF/HTML */}
      <TouchableOpacity
        style={[styles.button, { padding: buttonPadding }]}
        onPress={handleExportPDF}
        disabled={isLoading}
      >
        {exporting ? (
          <ActivityIndicator size="small" color="#f97316" />
        ) : (
          <Ionicons name="document-outline" size={iconSize} color="#f97316" />
        )}
        {showLabels && <Text style={styles.buttonText}>PDF</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    gap: 4,
  },
  buttonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default ChartExport;
