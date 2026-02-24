import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import ChartExport from './ChartExport';
import CpkChart, { CpkChartRef } from './charts/CpkChart';
import OeeChart, { OeeChartRef } from './charts/OeeChart';
import SpcControlChart, { SpcControlChartRef } from './charts/SpcControlChart';
import HistogramChart, { HistogramChartRef } from './charts/HistogramChart';

// CPK Chart Card
interface CpkChartCardProps {
  productCode?: string;
  stationName?: string;
  days?: number;
  showExport?: boolean;
}

export const CpkChartCard: React.FC<CpkChartCardProps> = ({
  productCode,
  stationName,
  days = 7,
  showExport = true,
}) => {
  const chartRef = useRef<CpkChartRef>(null);

  return (
    <View style={styles.container}>
      {showExport && (
        <View style={styles.exportContainer}>
          <ChartExport
            chartRef={chartRef}
            chartName="CPK_Chart"
            size="small"
            showLabels={false}
          />
        </View>
      )}
      <CpkChart
        ref={chartRef}
        productCode={productCode}
        stationName={stationName}
        days={days}
      />
    </View>
  );
};

// OEE Chart Card
interface OeeChartCardProps {
  lineId?: string;
  days?: number;
  showExport?: boolean;
}

export const OeeChartCard: React.FC<OeeChartCardProps> = ({
  lineId,
  days = 7,
  showExport = true,
}) => {
  const chartRef = useRef<OeeChartRef>(null);

  return (
    <View style={styles.container}>
      {showExport && (
        <View style={styles.exportContainer}>
          <ChartExport
            chartRef={chartRef}
            chartName="OEE_Chart"
            size="small"
            showLabels={false}
          />
        </View>
      )}
      <OeeChart
        ref={chartRef}
        lineId={lineId}
        days={days}
      />
    </View>
  );
};

// SPC Control Chart Card
interface SpcControlChartCardProps {
  planId?: string;
  limit?: number;
  showExport?: boolean;
}

export const SpcControlChartCard: React.FC<SpcControlChartCardProps> = ({
  planId,
  limit = 50,
  showExport = true,
}) => {
  const chartRef = useRef<SpcControlChartRef>(null);

  return (
    <View style={styles.container}>
      {showExport && (
        <View style={styles.exportContainer}>
          <ChartExport
            chartRef={chartRef}
            chartName="SPC_Control_Chart"
            size="small"
            showLabels={false}
          />
        </View>
      )}
      <SpcControlChart
        ref={chartRef}
        planId={planId}
        limit={limit}
      />
    </View>
  );
};

// Histogram Chart Card
interface HistogramChartCardProps {
  productCode?: string;
  stationName?: string;
  days?: number;
  showExport?: boolean;
}

export const HistogramChartCard: React.FC<HistogramChartCardProps> = ({
  productCode,
  stationName,
  days = 7,
  showExport = true,
}) => {
  const chartRef = useRef<HistogramChartRef>(null);

  return (
    <View style={styles.container}>
      {showExport && (
        <View style={styles.exportContainer}>
          <ChartExport
            chartRef={chartRef}
            chartName="Histogram_Chart"
            size="small"
            showLabels={false}
          />
        </View>
      )}
      <HistogramChart
        ref={chartRef}
        productCode={productCode}
        stationName={stationName}
        days={days}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
  },
  exportContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
});

export default {
  CpkChartCard,
  OeeChartCard,
  SpcControlChartCard,
  HistogramChartCard,
};
