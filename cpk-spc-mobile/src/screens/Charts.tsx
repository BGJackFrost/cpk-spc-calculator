import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CpkChartCard,
  OeeChartCard,
  SpcControlChartCard,
  HistogramChartCard,
} from '../components/ChartCard';

type ChartTab = 'cpk' | 'oee' | 'spc' | 'histogram';

const Charts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChartTab>('cpk');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const tabs: { key: ChartTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'cpk', label: 'CPK', icon: 'analytics' },
    { key: 'oee', label: 'OEE', icon: 'speedometer' },
    { key: 'spc', label: 'SPC', icon: 'pulse' },
    { key: 'histogram', label: 'Histogram', icon: 'bar-chart' },
  ];

  const renderChart = () => {
    switch (activeTab) {
      case 'cpk':
        return (
          <View key={`cpk-${refreshKey}`}>
            <CpkChartCard days={7} showExport={true} />
            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoTitle}>Về biểu đồ CPK</Text>
              <Text style={styles.chartInfoText}>
                CPK (Process Capability Index) đo lường khả năng của quy trình sản xuất 
                trong việc tạo ra sản phẩm nằm trong giới hạn quy định.
              </Text>
              <View style={styles.cpkLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>≥1.67: Xuất sắc</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#84cc16' }]} />
                  <Text style={styles.legendText}>≥1.33: Tốt</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.legendText}>≥1.0: Chấp nhận</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>&lt;1.0: Cần cải tiến</Text>
                </View>
              </View>
            </View>
          </View>
        );
      case 'oee':
        return (
          <View key={`oee-${refreshKey}`}>
            <OeeChartCard days={7} showExport={true} />
            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoTitle}>Về biểu đồ OEE</Text>
              <Text style={styles.chartInfoText}>
                OEE (Overall Equipment Effectiveness) = Availability × Performance × Quality.
                Đây là chỉ số đo lường hiệu quả tổng thể của thiết bị.
              </Text>
              <View style={styles.cpkLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>≥85%: World Class</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#84cc16' }]} />
                  <Text style={styles.legendText}>≥70%: Tốt</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.legendText}>≥60%: Trung bình</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>&lt;60%: Cần cải tiến</Text>
                </View>
              </View>
            </View>
          </View>
        );
      case 'spc':
        return (
          <View key={`spc-${refreshKey}`}>
            <SpcControlChartCard limit={50} showExport={true} />
            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoTitle}>Về biểu đồ SPC Control</Text>
              <Text style={styles.chartInfoText}>
                Biểu đồ kiểm soát SPC hiển thị các điểm dữ liệu theo thời gian cùng với 
                các giới hạn kiểm soát (UCL, LCL) và đường trung tâm (CL).
              </Text>
              <View style={styles.cpkLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>Điểm trong kiểm soát</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Điểm ngoài kiểm soát</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>Đường trung tâm (CL)</Text>
                </View>
              </View>
            </View>
          </View>
        );
      case 'histogram':
        return (
          <View key={`histogram-${refreshKey}`}>
            <HistogramChartCard days={7} showExport={true} />
            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoTitle}>Về biểu đồ Histogram</Text>
              <Text style={styles.chartInfoText}>
                Histogram hiển thị phân bố tần suất của dữ liệu đo lường. Biểu đồ này 
                giúp đánh giá xem dữ liệu có tuân theo phân phối chuẩn hay không.
              </Text>
              <View style={styles.cpkLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>Tần suất dữ liệu</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
                  <Text style={styles.legendText}>Giới hạn USL/LSL</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.legendText}>Giá trị trung bình</Text>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? '#3b82f6' : '#64748b'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderChart()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: '#eff6ff',
  },
  tabLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chartInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  chartInfoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  cpkLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    color: '#475569',
  },
});

export default Charts;
