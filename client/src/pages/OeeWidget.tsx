import { useEffect, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { RefreshCw } from 'lucide-react';

// OEE Widget for embedding in factory displays
export default function OeeWidget() {
  const params = useParams<{ machineId: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const machineId = params.machineId ? parseInt(params.machineId) : undefined;
  const theme = searchParams.get('theme') || 'dark';
  const refreshInterval = parseInt(searchParams.get('refresh') || '30') * 1000;

  const { data: oeeData, refetch, isLoading } = trpc.machineIntegration.getLatestOee.useQuery(
    { machineId },
    { refetchInterval: refreshInterval }
  );

  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (oeeData) {
      setLastUpdate(new Date());
    }
  }, [oeeData]);

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return { bg: 'bg-green-500', text: 'text-green-500', ring: 'ring-green-500' };
    if (oee >= 70) return { bg: 'bg-amber-500', text: 'text-amber-500', ring: 'ring-amber-500' };
    return { bg: 'bg-red-500', text: 'text-red-500', ring: 'ring-red-500' };
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500';

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <RefreshCw className={`h-12 w-12 animate-spin ${mutedClass}`} />
      </div>
    );
  }

  if (!oeeData) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <div className={`text-center ${mutedClass}`}>
          <p className="text-2xl">Không có dữ liệu OEE</p>
          <p className="text-sm mt-2">Machine ID: {machineId || 'Tất cả'}</p>
        </div>
      </div>
    );
  }

  const oee = oeeData.oee;
  const colors = getOeeColor(oee);

  return (
    <div className={`min-h-screen ${bgClass} p-6 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>
            {oeeData.machineName || 'Tổng hợp'}
          </h1>
          <p className={`text-sm ${mutedClass}`}>
            Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${colors.bg} text-white`}>
          {oee >= 85 ? 'Tốt' : oee >= 70 ? 'Trung bình' : 'Cần cải thiện'}
        </div>
      </div>

      {/* Main OEE Gauge */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Circular gauge background */}
          <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={isDark ? '#374151' : '#e5e7eb'}
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={oee >= 85 ? '#22c55e' : oee >= 70 ? '#f59e0b' : '#ef4444'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${oee * 2.83} 283`}
              className="transition-all duration-1000"
            />
          </svg>
          {/* OEE Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold ${colors.text}`}>
              {oee.toFixed(1)}
            </span>
            <span className={`text-xl ${mutedClass}`}>%</span>
            <span className={`text-sm ${mutedClass} mt-1`}>OEE</span>
          </div>
        </div>
      </div>

      {/* A/P/Q Breakdown */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
          <div className={`text-3xl font-bold ${textClass}`}>
            {oeeData.availability?.toFixed(1) || '-'}%
          </div>
          <div className={`text-sm ${mutedClass}`}>Availability</div>
          <div className="mt-2 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${oeeData.availability || 0}%` }}
            />
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
          <div className={`text-3xl font-bold ${textClass}`}>
            {oeeData.performance?.toFixed(1) || '-'}%
          </div>
          <div className={`text-sm ${mutedClass}`}>Performance</div>
          <div className="mt-2 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${oeeData.performance || 0}%` }}
            />
          </div>
        </div>
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} text-center`}>
          <div className={`text-3xl font-bold ${textClass}`}>
            {oeeData.quality?.toFixed(1) || '-'}%
          </div>
          <div className={`text-sm ${mutedClass}`}>Quality</div>
          <div className="mt-2 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${oeeData.quality || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`mt-6 text-center text-xs ${mutedClass}`}>
        Auto-refresh: {refreshInterval / 1000}s | Theme: {theme}
      </div>
    </div>
  );
}
