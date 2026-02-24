import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';
import { useCpkHistory } from '../../hooks/useChartData';

const screenWidth = Dimensions.get('window').width;

interface CpkChartProps {
  productCode?: string;
  stationName?: string;
  days?: number;
  height?: number;
  showLegend?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface CpkChartRef {
  capture: () => Promise<string | null>;
  refetch: () => void;
}

const CpkChart = forwardRef<CpkChartRef, CpkChartProps>(({
  productCode,
  stationName,
  days = 7,
  height = 220,
  showLegend = true,
  autoRefresh = true,
  refreshInterval = 30000,
}, ref) => {
  const viewShotRef = useRef<ViewShot>(null);
  
  const { data, loading, error, lastUpdated, refetch } = useCpkHistory(
    productCode,
    stationName,
    days,
    { autoRefresh, refreshInterval }
  );

  useImperativeHandle(ref, () => ({
    capture: async () => {
      if (viewShotRef.current?.capture) {
        try {
          const uri = await viewShotRef.current.capture();
          return uri;
        } catch (e) {
          console.error('Failed to capture chart:', e);
          return null;
        }
      }
      return null;
    },
    refetch,
  }));

  const getCpkColor = (cpk: number): string => {
    if (cpk >= 1.67) return '#22c55e'; // Green - Excellent
    if (cpk >= 1.33) return '#84cc16'; // Light green - Good
    if (cpk >= 1.0) return '#eab308'; // Yellow - Acceptable
    if (cpk >= 0.67) return '#f97316'; // Orange - Poor
    return '#ef4444'; // Red - Critical
  };

  const getLatestCpk = (): number => {
    if (!data || data.length === 0) return 0;
    return data[data.length - 1].cpk;
  };

  const getCpkStatus = (cpk: number): string => {
    if (cpk >= 1.67) return 'Xuất sắc';
    if (cpk >= 1.33) return 'Tốt';
    if (cpk >= 1.0) return 'Chấp nhận';
    if (cpk >= 0.67) return 'Kém';
    return 'Nguy hiểm';
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, { height }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.errorText}>Lỗi: {error}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>Không có dữ liệu</Text>
      </View>
    );
  }

  const latestCpk = getLatestCpk();
  const cpkColor = getCpkColor(latestCpk);

  const chartData = {
    labels: data.map((d, i) => i % Math.ceil(data.length / 5) === 0 ? d.date.slice(5) : ''),
    datasets: [
      {
        data: data.map(d => d.cpk),
        color: () => '#3b82f6',
        strokeWidth: 2,
      },
      {
        data: [1.33, 1.33], // Target line
        color: () => '#22c55e',
        strokeWidth: 1,
        withDots: false,
      },
      {
        data: [1.0, 1.0], // Warning line
        color: () => '#eab308',
        strokeWidth: 1,
        withDots: false,
      },
    ],
  };

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Biểu đồ CPK</Text>
          <View style={[styles.statusBadge, { backgroundColor: cpkColor }]}>
            <Text style={styles.statusText}>{getCpkStatus(latestCpk)}</Text>
          </View>
        </View>

        <View style={styles.cpkValue}>
          <Text style={styles.cpkLabel}>CPK hiện tại:</Text>
          <Text style={[styles.cpkNumber, { color: cpkColor }]}>
            {latestCpk.toFixed(2)}
          </Text>
        </View>

        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={height}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#f8fafc',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#3b82f6',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#e2e8f0',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
          yAxisInterval={1}
        />

        {showLegend && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>CPK</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.legendText}>Mục tiêu (1.33)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
              <Text style={styles.legendText}>Cảnh báo (1.0)</Text>
            </View>
          </View>
        )}

        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
          </Text>
        )}
      </View>
    </ViewShot>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cpkValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  cpkLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  cpkNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  noDataText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CpkChart;
