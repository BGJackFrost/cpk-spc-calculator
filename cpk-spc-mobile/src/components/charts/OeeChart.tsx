import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';
import { useOeeHistory, useLatestOee } from '../../hooks/useChartData';

const screenWidth = Dimensions.get('window').width;

interface OeeChartProps {
  lineId?: string;
  days?: number;
  height?: number;
  showGauge?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface OeeChartRef {
  capture: () => Promise<string | null>;
  refetch: () => void;
}

const OeeChart = forwardRef<OeeChartRef, OeeChartProps>(({
  lineId,
  days = 7,
  height = 220,
  showGauge = true,
  autoRefresh = true,
  refreshInterval = 30000,
}, ref) => {
  const viewShotRef = useRef<ViewShot>(null);
  
  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useOeeHistory(
    lineId,
    days,
    { autoRefresh, refreshInterval }
  );

  const { data: latestData, loading: latestLoading, lastUpdated, refetch: refetchLatest } = useLatestOee(
    lineId,
    { autoRefresh, refreshInterval: 10000 }
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
    refetch: () => {
      refetchHistory();
      refetchLatest();
    },
  }));

  const getOeeColor = (oee: number): string => {
    if (oee >= 85) return '#22c55e'; // World class
    if (oee >= 70) return '#84cc16'; // Good
    if (oee >= 60) return '#eab308'; // Average
    if (oee >= 40) return '#f97316'; // Low
    return '#ef4444'; // Critical
  };

  const getOeeStatus = (oee: number): string => {
    if (oee >= 85) return 'World Class';
    if (oee >= 70) return 'Tốt';
    if (oee >= 60) return 'Trung bình';
    if (oee >= 40) return 'Thấp';
    return 'Nguy hiểm';
  };

  const loading = historyLoading || latestLoading;

  if (loading && !historyData && !latestData) {
    return (
      <View style={[styles.container, { height: height + 100 }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const oee = latestData?.oee ?? 0;
  const availability = latestData?.availability ?? 0;
  const performance = latestData?.performance ?? 0;
  const quality = latestData?.quality ?? 0;
  const oeeColor = getOeeColor(oee);

  const gaugeData = {
    labels: ['A', 'P', 'Q'],
    data: [availability / 100, performance / 100, quality / 100],
    colors: ['#3b82f6', '#8b5cf6', '#06b6d4'],
  };

  const chartData = historyData && historyData.length > 0 ? {
    labels: historyData.map((d, i) => i % Math.ceil(historyData.length / 5) === 0 ? d.date.slice(5) : ''),
    datasets: [
      {
        data: historyData.map(d => d.oee),
        color: () => '#3b82f6',
        strokeWidth: 2,
      },
      {
        data: [85, 85],
        color: () => '#22c55e',
        strokeWidth: 1,
        withDots: false,
      },
    ],
  } : null;

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Biểu đồ OEE</Text>
          <View style={[styles.statusBadge, { backgroundColor: oeeColor }]}>
            <Text style={styles.statusText}>{getOeeStatus(oee)}</Text>
          </View>
        </View>

        <View style={styles.oeeValue}>
          <Text style={styles.oeeLabel}>OEE hiện tại:</Text>
          <Text style={[styles.oeeNumber, { color: oeeColor }]}>
            {oee.toFixed(1)}%
          </Text>
        </View>

        {showGauge && (
          <View style={styles.gaugeContainer}>
            <ProgressChart
              data={gaugeData}
              width={screenWidth - 64}
              height={140}
              strokeWidth={16}
              radius={32}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1, index) => {
                  const colors = ['rgba(59, 130, 246, ', 'rgba(139, 92, 246, ', 'rgba(6, 182, 212, '];
                  return `${colors[index ?? 0]}${opacity})`;
                },
                labelColor: () => '#64748b',
              }}
              hideLegend={false}
              style={styles.gauge}
            />
            <View style={styles.gaugeLabels}>
              <View style={styles.gaugeLabelItem}>
                <View style={[styles.gaugeDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.gaugeLabelText}>Availability: {availability.toFixed(1)}%</Text>
              </View>
              <View style={styles.gaugeLabelItem}>
                <View style={[styles.gaugeDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={styles.gaugeLabelText}>Performance: {performance.toFixed(1)}%</Text>
              </View>
              <View style={styles.gaugeLabelItem}>
                <View style={[styles.gaugeDot, { backgroundColor: '#06b6d4' }]} />
                <Text style={styles.gaugeLabelText}>Quality: {quality.toFixed(1)}%</Text>
              </View>
            </View>
          </View>
        )}

        {chartData && (
          <>
            <Text style={styles.chartTitle}>Xu hướng OEE ({days} ngày)</Text>
            <LineChart
              data={chartData}
              width={screenWidth - 32}
              height={height}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#f8fafc',
                decimalPlaces: 1,
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
              yAxisSuffix="%"
              fromZero={false}
            />
          </>
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
  oeeValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  oeeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  oeeNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  gauge: {
    borderRadius: 16,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  gaugeLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  gaugeLabelText: {
    fontSize: 11,
    color: '#64748b',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
});

export default OeeChart;
