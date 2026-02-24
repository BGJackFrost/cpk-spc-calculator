import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';
import { useHistogramData } from '../../hooks/useChartData';

const screenWidth = Dimensions.get('window').width;

interface HistogramChartProps {
  productCode?: string;
  stationName?: string;
  days?: number;
  height?: number;
  showStats?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface HistogramChartRef {
  capture: () => Promise<string | null>;
  refetch: () => void;
}

const HistogramChart = forwardRef<HistogramChartRef, HistogramChartProps>(({
  productCode,
  stationName,
  days = 7,
  height = 220,
  showStats = true,
  autoRefresh = false,
  refreshInterval = 60000,
}, ref) => {
  const viewShotRef = useRef<ViewShot>(null);
  
  const { data, loading, error, lastUpdated, refetch } = useHistogramData(
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
    if (cpk >= 1.67) return '#22c55e';
    if (cpk >= 1.33) return '#84cc16';
    if (cpk >= 1.0) return '#eab308';
    if (cpk >= 0.67) return '#f97316';
    return '#ef4444';
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, { height: height + 100 }]}>
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

  if (!data || !data.bins || data.bins.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>Không có dữ liệu</Text>
      </View>
    );
  }

  const { bins, frequencies, mean, stdDev, usl, lsl, cp, cpk } = data;
  const cpkColor = cpk ? getCpkColor(cpk) : '#64748b';

  // Create labels for bins (show every nth label to avoid crowding)
  const binLabels = bins.map((bin, i) => {
    if (i % Math.ceil(bins.length / 6) === 0) {
      return bin.toFixed(2);
    }
    return '';
  });

  const chartData = {
    labels: binLabels,
    datasets: [
      {
        data: frequencies,
      },
    ],
  };

  const totalSamples = frequencies.reduce((a, b) => a + b, 0);

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Histogram</Text>
          {cpk !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: cpkColor }]}>
              <Text style={styles.statusText}>CPK: {cpk.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Statistics */}
        {showStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Mean (μ)</Text>
                <Text style={styles.statValue}>{mean.toFixed(4)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Std Dev (σ)</Text>
                <Text style={styles.statValue}>{stdDev.toFixed(4)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Số mẫu</Text>
                <Text style={styles.statValue}>{totalSamples}</Text>
              </View>
            </View>
            {(usl !== undefined || lsl !== undefined || cp !== undefined) && (
              <View style={styles.statsRow}>
                {lsl !== undefined && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>LSL</Text>
                    <Text style={styles.statValue}>{lsl.toFixed(3)}</Text>
                  </View>
                )}
                {usl !== undefined && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>USL</Text>
                    <Text style={styles.statValue}>{usl.toFixed(3)}</Text>
                  </View>
                )}
                {cp !== undefined && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>CP</Text>
                    <Text style={styles.statValue}>{cp.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={height}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#f8fafc',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.8,
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#e2e8f0',
            },
          }}
          style={styles.chart}
          showBarTops={false}
          fromZero={true}
        />

        {/* Specification Limits Indicators */}
        {(usl !== undefined || lsl !== undefined) && (
          <View style={styles.limitsIndicator}>
            {lsl !== undefined && (
              <View style={styles.limitItem}>
                <View style={[styles.limitLine, { backgroundColor: '#f97316' }]} />
                <Text style={styles.limitLabel}>LSL: {lsl.toFixed(3)}</Text>
              </View>
            )}
            <View style={styles.limitItem}>
              <View style={[styles.limitLine, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.limitLabel}>Mean: {mean.toFixed(3)}</Text>
            </View>
            {usl !== undefined && (
              <View style={styles.limitItem}>
                <View style={[styles.limitLine, { backgroundColor: '#f97316' }]} />
                <Text style={styles.limitLabel}>USL: {usl.toFixed(3)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Distribution Info */}
        <View style={styles.distributionInfo}>
          <Text style={styles.distributionText}>
            Phân bố: μ ± 3σ = [{(mean - 3 * stdDev).toFixed(3)}, {(mean + 3 * stdDev).toFixed(3)}]
          </Text>
        </View>

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
  statsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  limitsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitLine: {
    width: 16,
    height: 3,
    marginRight: 6,
    borderRadius: 1,
  },
  limitLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  distributionInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  distributionText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
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
    textAlign: 'center',
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

export default HistogramChart;
