import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';
import { useSpcControlData } from '../../hooks/useChartData';

const screenWidth = Dimensions.get('window').width;

interface SpcControlChartProps {
  planId?: string;
  limit?: number;
  height?: number;
  showLimits?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface SpcControlChartRef {
  capture: () => Promise<string | null>;
  refetch: () => void;
}

const SpcControlChart = forwardRef<SpcControlChartRef, SpcControlChartProps>(({
  planId,
  limit = 50,
  height = 250,
  showLimits = true,
  autoRefresh = true,
  refreshInterval = 15000,
}, ref) => {
  const viewShotRef = useRef<ViewShot>(null);
  
  const { data, loading, error, lastUpdated, refetch } = useSpcControlData(
    planId,
    limit,
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

  if (!data || !data.data || data.data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>Không có dữ liệu</Text>
      </View>
    );
  }

  const { data: chartPoints, ucl, lcl, cl, usl, lsl } = data;
  
  // Count out of control points
  const outOfControlCount = chartPoints.filter(p => p.isOutOfControl).length;
  const inControlRate = ((chartPoints.length - outOfControlCount) / chartPoints.length * 100).toFixed(1);

  // Prepare chart data
  const values = chartPoints.map(p => p.value);
  const minValue = Math.min(...values, lcl, lsl ?? lcl);
  const maxValue = Math.max(...values, ucl, usl ?? ucl);

  const chartData = {
    labels: chartPoints.map((_, i) => i % Math.ceil(chartPoints.length / 6) === 0 ? `${i + 1}` : ''),
    datasets: [
      {
        data: values,
        color: () => '#3b82f6',
        strokeWidth: 2,
      },
      // UCL line
      {
        data: Array(chartPoints.length).fill(ucl),
        color: () => '#ef4444',
        strokeWidth: 1,
        withDots: false,
      },
      // LCL line
      {
        data: Array(chartPoints.length).fill(lcl),
        color: () => '#ef4444',
        strokeWidth: 1,
        withDots: false,
      },
      // CL line
      {
        data: Array(chartPoints.length).fill(cl),
        color: () => '#22c55e',
        strokeWidth: 1,
        withDots: false,
      },
    ],
  };

  // Add USL/LSL if available
  if (usl !== undefined) {
    chartData.datasets.push({
      data: Array(chartPoints.length).fill(usl),
      color: () => '#f97316',
      strokeWidth: 1,
      withDots: false,
    });
  }
  if (lsl !== undefined) {
    chartData.datasets.push({
      data: Array(chartPoints.length).fill(lsl),
      color: () => '#f97316',
      strokeWidth: 1,
      withDots: false,
    });
  }

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SPC Control Chart</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: outOfControlCount === 0 ? '#22c55e' : '#ef4444' }
          ]}>
            <Text style={styles.statusText}>
              {outOfControlCount === 0 ? 'Ổn định' : `${outOfControlCount} vi phạm`}
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Số mẫu</Text>
            <Text style={styles.statValue}>{chartPoints.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tỷ lệ OK</Text>
            <Text style={[styles.statValue, { color: parseFloat(inControlRate) >= 95 ? '#22c55e' : '#ef4444' }]}>
              {inControlRate}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CL</Text>
            <Text style={styles.statValue}>{cl.toFixed(3)}</Text>
          </View>
        </View>

        {/* Control Limits */}
        {showLimits && (
          <View style={styles.limitsContainer}>
            <View style={styles.limitRow}>
              <View style={[styles.limitDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.limitText}>UCL: {ucl.toFixed(3)}</Text>
              <View style={[styles.limitDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.limitText}>LCL: {lcl.toFixed(3)}</Text>
            </View>
            {(usl !== undefined || lsl !== undefined) && (
              <View style={styles.limitRow}>
                {usl !== undefined && (
                  <>
                    <View style={[styles.limitDot, { backgroundColor: '#f97316' }]} />
                    <Text style={styles.limitText}>USL: {usl.toFixed(3)}</Text>
                  </>
                )}
                {lsl !== undefined && (
                  <>
                    <View style={[styles.limitDot, { backgroundColor: '#f97316' }]} />
                    <Text style={styles.limitText}>LSL: {lsl.toFixed(3)}</Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(screenWidth - 32, chartPoints.length * 15)}
            height={height}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#f8fafc',
              decimalPlaces: 3,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '3',
                strokeWidth: '1',
                stroke: '#3b82f6',
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#e2e8f0',
              },
            }}
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
            getDotColor={(dataPoint, dataPointIndex) => {
              const point = chartPoints[dataPointIndex];
              if (point?.isOutOfControl) {
                return '#ef4444';
              }
              return '#3b82f6';
            }}
          />
        </ScrollView>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Giá trị</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>CL</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>UCL/LCL</Text>
          </View>
          {(usl !== undefined || lsl !== undefined) && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
              <Text style={styles.legendText}>USL/LSL</Text>
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  limitsContainer: {
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  limitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  limitText: {
    fontSize: 12,
    color: '#64748b',
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

export default SpcControlChart;
