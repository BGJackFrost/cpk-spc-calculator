import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<any> = {
  prefixes: [prefix, 'cpkspc://', 'https://cpk-spc.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Charts: 'charts',
          Alerts: 'alerts',
          Settings: 'settings',
          WidgetSettings: 'widget-settings',
        },
      },
      AlertDetail: 'alert/:id',
      ChartDetail: 'chart/:lineId/:productId',
      ProductionLine: 'line/:id',
    },
  },
};

// Deep link handlers
export const handleDeepLink = (url: string, navigation: any) => {
  const parsed = Linking.parse(url);
  
  if (parsed.path?.startsWith('alert/')) {
    const alertId = parsed.path.replace('alert/', '');
    navigation.navigate('AlertDetail', { id: alertId });
  } else if (parsed.path?.startsWith('chart/')) {
    const [lineId, productId] = parsed.path.replace('chart/', '').split('/');
    navigation.navigate('ChartDetail', { lineId, productId });
  } else if (parsed.path === 'alerts') {
    navigation.navigate('Main', { screen: 'Alerts' });
  } else if (parsed.path === 'dashboard') {
    navigation.navigate('Main', { screen: 'Dashboard' });
  }
};

export default linking;
