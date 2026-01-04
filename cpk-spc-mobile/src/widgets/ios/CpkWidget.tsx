// iOS Widget Configuration for CPK/OEE Display
// This file contains the React Native component that renders widget content
// The actual iOS widget implementation requires WidgetKit in native Swift code

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WidgetData } from '../WidgetService';

interface CpkWidgetProps {
  data: WidgetData | null;
  family: 'systemSmall' | 'systemMedium' | 'systemLarge';
}

export const CpkWidget: React.FC<CpkWidgetProps> = ({ data, family }) => {
  if (!data) {
    return (
      <View style={[styles.container, styles[family]]}>
        <Text style={styles.title}>CPK/SPC Monitor</Text>
        <Text style={styles.noData}>Configure in app settings</Text>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#34d399';
      case 'warning': return '#fbbf24';
      case 'critical': return '#f87171';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✓';
      case 'warning': return '⚠';
      case 'critical': return '✕';
      default: return '?';
    }
  };

  return (
    <View style={[styles.container, styles[family]]}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.lineName}</Text>
        <Text style={[styles.statusIcon, { color: getStatusColor(data.status) }]}>
          {getStatusIcon(data.status)}
        </Text>
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>CPK</Text>
          <Text style={[styles.metricValue, { color: getStatusColor(data.status) }]}>
            {data.cpk.toFixed(2)}
          </Text>
        </View>
        
        {family !== 'systemSmall' && (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>OEE</Text>
            <Text style={styles.metricValue}>{(data.oee * 100).toFixed(1)}%</Text>
          </View>
        )}
      </View>

      {family === 'systemLarge' && (
        <>
          <View style={styles.divider} />
          <Text style={styles.productName}>{data.productName}</Text>
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
  },
  systemSmall: {
    width: 155,
    height: 155,
  },
  systemMedium: {
    width: 329,
    height: 155,
  },
  systemLarge: {
    width: 329,
    height: 345,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noData: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
    alignItems: 'center',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  productName: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  lastUpdated: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default CpkWidget;
