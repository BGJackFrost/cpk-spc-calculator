// Android Widget Configuration for CPK/OEE Display
// This file contains the React Native component that renders widget content
// The actual Android widget implementation requires native code in android/app/src/main/java

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WidgetData } from '../WidgetService';

interface CpkWidgetProps {
  data: WidgetData | null;
  size: 'small' | 'medium' | 'large';
}

export const CpkWidget: React.FC<CpkWidgetProps> = ({ data, size }) => {
  if (!data) {
    return (
      <View style={[styles.container, styles[size]]}>
        <Text style={styles.title}>CPK/SPC</Text>
        <Text style={styles.noData}>No data configured</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <View style={[styles.container, styles[size]]}>
      <Text style={styles.title}>{data.lineName}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>CPK</Text>
          <Text style={[styles.metricValue, { color: getStatusColor(data.status) }]}>
            {data.cpk.toFixed(2)}
          </Text>
        </View>
        {size !== 'small' && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>OEE</Text>
            <Text style={styles.metricValue}>{(data.oee * 100).toFixed(1)}%</Text>
          </View>
        )}
      </View>
      {size === 'large' && (
        <Text style={styles.lastUpdated}>
          Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
  },
  small: {
    width: 110,
    height: 110,
  },
  medium: {
    width: 230,
    height: 110,
  },
  large: {
    width: 230,
    height: 230,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  noData: {
    color: '#9ca3af',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  lastUpdated: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CpkWidget;
