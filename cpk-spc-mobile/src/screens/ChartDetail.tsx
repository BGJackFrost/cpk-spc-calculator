import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import {
  CpkChartCard,
  OeeChartCard,
  SpcControlChartCard,
  HistogramChartCard,
} from '../components/ChartCard';

type ChartDetailRouteProp = RouteProp<RootStackParamList, 'ChartDetail'>;

const ChartDetail: React.FC = () => {
  const route = useRoute<ChartDetailRouteProp>();
  const { chartType, title } = route.params;

  const renderChart = () => {
    switch (chartType) {
      case 'cpk':
        return <CpkChartCard days={30} showExport={true} />;
      case 'oee':
        return <OeeChartCard days={30} showExport={true} />;
      case 'spc':
        return <SpcControlChartCard limit={100} showExport={true} />;
      case 'histogram':
        return <HistogramChartCard days={30} showExport={true} />;
      default:
        return <Text style={styles.errorText}>Loại biểu đồ không hợp lệ</Text>;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {renderChart()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#ef4444',
    fontSize: 16,
    marginTop: 32,
  },
});

export default ChartDetail;
