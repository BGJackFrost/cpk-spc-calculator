/**
 * CPK Radar Comparison Component
 * Task: DSH-05
 * Dashboard so sánh CPK đa chiều với Radar chart
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Target, TrendingUp, TrendingDown, BarChart3, 
  RefreshCw, Download, Filter
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from "recharts";

interface ProcessCapability {
  id: number;
  name: string;
  cpk: number;
  cp: number;
  pp: number;
  ppk: number;
  ca: number; // Capability Accuracy
  cr: number; // Capability Ratio
}

interface CpkRadarComparisonProps {
  processes?: ProcessCapability[];
  onProcessSelect?: (processId: number) => void;
}

// Color palette for different processes
const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"
];

export default function CpkRadarComparison({
  processes,
  onProcessSelect,
}: CpkRadarComparisonProps) {
  const [selectedProcesses, setSelectedProcesses] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"radar" | "bar">("radar");

  // Mock data if not provided
  const mockProcesses: ProcessCapability[] = useMemo(() => {
    if (processes) return processes;
    
    return [
      { id: 1, name: "Dây chuyền A", cpk: 1.45, cp: 1.52, pp: 1.48, ppk: 1.42, ca: 0.95, cr: 0.66 },
      { id: 2, name: "Dây chuyền B", cpk: 1.28, cp: 1.35, pp: 1.30, ppk: 1.25, ca: 0.92, cr: 0.74 },
      { id: 3, name: "Dây chuyền C", cpk: 1.62, cp: 1.68, pp: 1.65, ppk: 1.58, ca: 0.97, cr: 0.60 },
      { id: 4, name: "Dây chuyền D", cpk: 1.15, cp: 1.22, pp: 1.18, ppk: 1.12, ca: 0.88, cr: 0.82 },
      { id: 5, name: "Dây chuyền E", cpk: 1.38, cp: 1.45, pp: 1.40, ppk: 1.35, ca: 0.93, cr: 0.69 },
    ];
  }, [processes]);

  // Initialize selected processes
  useState(() => {
    if (selectedProcesses.length === 0 && mockProcesses.length > 0) {
      setSelectedProcesses(mockProcesses.slice(0, 3).map(p => p.id));
    }
  });

  // Filter selected processes
  const filteredProcesses = mockProcesses.filter(p => 
    selectedProcesses.length === 0 || selectedProcesses.includes(p.id)
  );

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const metrics = ["CPK", "CP", "PP", "PPK", "CA", "CR"];
    
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      
      filteredProcesses.forEach(process => {
        const key = metric.toLowerCase() as keyof ProcessCapability;
        let value = process[key] as number;
        
        // Normalize values for radar chart (0-2 scale)
        if (metric === "CA") value = value * 2; // CA is 0-1, scale to 0-2
        if (metric === "CR") value = (1 - value) * 2; // CR lower is better, invert
        
        dataPoint[process.name] = value;
      });
      
      return dataPoint;
    });
  }, [filteredProcesses]);

  // Prepare bar chart data
  const barData = useMemo(() => {
    return filteredProcesses.map(process => ({
      name: process.name,
      cpk: process.cpk,
      cp: process.cp,
      pp: process.pp,
      ppk: process.ppk,
    }));
  }, [filteredProcesses]);

  // Toggle process selection
  const toggleProcess = (processId: number) => {
    setSelectedProcesses(prev => 
      prev.includes(processId)
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    );
  };

  // Get CPK status color
  const getCpkColor = (cpk: number) => {
    if (cpk >= 1.67) return "text-green-600";
    if (cpk >= 1.33) return "text-blue-600";
    if (cpk >= 1.0) return "text-yellow-600";
    return "text-red-600";
  };

  const getCpkBadge = (cpk: number) => {
    if (cpk >= 1.67) return { label: "Xuất sắc", variant: "default" as const };
    if (cpk >= 1.33) return { label: "Tốt", variant: "secondary" as const };
    if (cpk >= 1.0) return { label: "Đạt", variant: "outline" as const };
    return { label: "Không đạt", variant: "destructive" as const };
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredProcesses.length === 0) return null;
    
    const avgCpk = filteredProcesses.reduce((sum, p) => sum + p.cpk, 0) / filteredProcesses.length;
    const maxCpk = Math.max(...filteredProcesses.map(p => p.cpk));
    const minCpk = Math.min(...filteredProcesses.map(p => p.cpk));
    const bestProcess = filteredProcesses.find(p => p.cpk === maxCpk);
    const worstProcess = filteredProcesses.find(p => p.cpk === minCpk);
    
    return {
      avgCpk,
      maxCpk,
      minCpk,
      bestProcess,
      worstProcess,
      spread: maxCpk - minCpk,
    };
  }, [filteredProcesses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            So sánh CPK Đa chiều
          </h3>
          <p className="text-sm text-muted-foreground">
            So sánh CPK, CP, PP, PPK giữa các dây chuyền
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "radar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("radar")}
          >
            Radar
          </Button>
          <Button
            variant={viewMode === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("bar")}
          >
            Bar
          </Button>
        </div>
      </div>

      {/* Process Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Chọn dây chuyền để so sánh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {mockProcesses.map((process, index) => (
              <div 
                key={process.id}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`process-${process.id}`}
                  checked={selectedProcesses.includes(process.id)}
                  onCheckedChange={() => toggleProcess(process.id)}
                />
                <Label 
                  htmlFor={`process-${process.id}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{process.name}</span>
                  <Badge variant={getCpkBadge(process.cpk).variant} className="text-xs">
                    {process.cpk.toFixed(2)}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${getCpkColor(stats.avgCpk)}`}>
                {stats.avgCpk.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">CPK Trung bình</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.maxCpk.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Cao nhất ({stats.bestProcess?.name})
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${getCpkColor(stats.minCpk)}`}>
                {stats.minCpk.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Thấp nhất ({stats.worstProcess?.name})
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.spread.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Độ chênh lệch</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Biểu đồ Radar đa chiều</CardTitle>
            <CardDescription className="text-xs">
              So sánh 6 chỉ số năng lực quy trình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 2]} tick={{ fontSize: 10 }} />
                {filteredProcesses.map((process, index) => (
                  <Radar
                    key={process.id}
                    name={process.name}
                    dataKey={process.name}
                    stroke={COLORS[mockProcesses.findIndex(p => p.id === process.id) % COLORS.length]}
                    fill={COLORS[mockProcesses.findIndex(p => p.id === process.id) % COLORS.length]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">So sánh CPK/CP/PP/PPK</CardTitle>
            <CardDescription className="text-xs">
              Biểu đồ cột so sánh các chỉ số chính
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 2]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cpk" fill="#3b82f6" name="CPK" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cp" fill="#22c55e" name="CP" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pp" fill="#f59e0b" name="PP" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ppk" fill="#8b5cf6" name="PPK" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Chi tiết các chỉ số</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Dây chuyền</th>
                  <th className="text-center py-2 px-3">CPK</th>
                  <th className="text-center py-2 px-3">CP</th>
                  <th className="text-center py-2 px-3">PP</th>
                  <th className="text-center py-2 px-3">PPK</th>
                  <th className="text-center py-2 px-3">CA</th>
                  <th className="text-center py-2 px-3">CR</th>
                  <th className="text-center py-2 px-3">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((process, index) => (
                  <tr key={process.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[mockProcesses.findIndex(p => p.id === process.id) % COLORS.length] }}
                      />
                      {process.name}
                    </td>
                    <td className={`text-center py-2 px-3 font-bold ${getCpkColor(process.cpk)}`}>
                      {process.cpk.toFixed(2)}
                    </td>
                    <td className="text-center py-2 px-3">{process.cp.toFixed(2)}</td>
                    <td className="text-center py-2 px-3">{process.pp.toFixed(2)}</td>
                    <td className="text-center py-2 px-3">{process.ppk.toFixed(2)}</td>
                    <td className="text-center py-2 px-3">{(process.ca * 100).toFixed(0)}%</td>
                    <td className="text-center py-2 px-3">{(process.cr * 100).toFixed(0)}%</td>
                    <td className="text-center py-2 px-3">
                      <Badge variant={getCpkBadge(process.cpk).variant}>
                        {getCpkBadge(process.cpk).label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
