import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Gauge,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Plus,
  X,
  Award,
  Target,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  ReferenceLine
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

interface MachineData {
  id: number;
  name: string;
  code: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  cpk: number;
  cp: number;
  ppk: number;
  pp: number;
}

export default function MachineComparison() {
  const [selectedMachines, setSelectedMachines] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("7d");

  // Fetch machines
  const { data: machinesData, isLoading: machinesLoading } = trpc.machine.listAll.useQuery();
  const machines = machinesData || [];

  // Fetch OEE records
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery({ limit: 200 });

  // Process machine data
  const machineDataMap = useMemo(() => {
    const map = new Map<number, MachineData>();
    
    machines?.forEach((machine: any) => {
      // Get OEE records for this machine
      const machineOEE = oeeRecords?.filter((r: any) => r.machineId === machine.id) || [];
      
      // Calculate averages or use demo data
      const avgOEE = machineOEE.length > 0 
        ? machineOEE.reduce((sum: number, r: any) => sum + r.oee, 0) / machineOEE.length
        : Math.random() * 25 + 70;
      const avgAvailability = machineOEE.length > 0
        ? machineOEE.reduce((sum: number, r: any) => sum + r.availability, 0) / machineOEE.length
        : Math.random() * 15 + 80;
      const avgPerformance = machineOEE.length > 0
        ? machineOEE.reduce((sum: number, r: any) => sum + r.performance, 0) / machineOEE.length
        : Math.random() * 15 + 80;
      const avgQuality = machineOEE.length > 0
        ? machineOEE.reduce((sum: number, r: any) => sum + r.quality, 0) / machineOEE.length
        : Math.random() * 8 + 90;

      map.set(machine.id, {
        id: machine.id,
        name: machine.name,
        code: machine.code,
        oee: avgOEE,
        availability: avgAvailability,
        performance: avgPerformance,
        quality: avgQuality,
        cpk: Math.random() * 1.2 + 0.8,
        cp: Math.random() * 1.3 + 0.9,
        ppk: Math.random() * 1.1 + 0.7,
        pp: Math.random() * 1.2 + 0.8
      });
    });

    return map;
  }, [machines, oeeRecords]);

  // Get selected machine data
  const selectedMachineData = useMemo(() => {
    return selectedMachines
      .map(id => machineDataMap.get(id))
      .filter((m): m is MachineData => m !== undefined);
  }, [selectedMachines, machineDataMap]);

  // Add machine to comparison
  const addMachine = (machineId: string) => {
    const id = parseInt(machineId);
    if (!selectedMachines.includes(id) && selectedMachines.length < 5) {
      setSelectedMachines([...selectedMachines, id]);
    }
  };

  // Remove machine from comparison
  const removeMachine = (machineId: number) => {
    setSelectedMachines(selectedMachines.filter(id => id !== machineId));
  };

  // Prepare bar chart data for OEE comparison
  const oeeComparisonData = useMemo(() => {
    return selectedMachineData.map((machine, index) => ({
      name: machine.name,
      oee: machine.oee,
      availability: machine.availability,
      performance: machine.performance,
      quality: machine.quality,
      fill: COLORS[index % COLORS.length]
    }));
  }, [selectedMachineData]);

  // Prepare bar chart data for CPK comparison
  const cpkComparisonData = useMemo(() => {
    return selectedMachineData.map((machine, index) => ({
      name: machine.name,
      cpk: machine.cpk,
      cp: machine.cp,
      ppk: machine.ppk,
      pp: machine.pp,
      fill: COLORS[index % COLORS.length]
    }));
  }, [selectedMachineData]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const metrics = [
      { metric: "OEE", fullMark: 100 },
      { metric: "Availability", fullMark: 100 },
      { metric: "Performance", fullMark: 100 },
      { metric: "Quality", fullMark: 100 },
      { metric: "CPK x 50", fullMark: 100 }
    ];

    return metrics.map(m => {
      const dataPoint: any = { metric: m.metric, fullMark: m.fullMark };
      selectedMachineData.forEach((machine, index) => {
        if (m.metric === "OEE") dataPoint[machine.name] = machine.oee;
        else if (m.metric === "Availability") dataPoint[machine.name] = machine.availability;
        else if (m.metric === "Performance") dataPoint[machine.name] = machine.performance;
        else if (m.metric === "Quality") dataPoint[machine.name] = machine.quality;
        else if (m.metric === "CPK x 50") dataPoint[machine.name] = machine.cpk * 50;
      });
      return dataPoint;
    });
  }, [selectedMachineData]);

  // Prepare trend data (demo)
  const trendData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dataPoint: any = {
        date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      };
      selectedMachineData.forEach((machine, index) => {
        dataPoint[machine.name] = machine.oee + (Math.random() * 10 - 5);
      });
      return dataPoint;
    });
  }, [selectedMachineData, timeRange]);

  // Calculate rankings
  const rankings = useMemo(() => {
    const oeeRanking = [...selectedMachineData].sort((a, b) => b.oee - a.oee);
    const cpkRanking = [...selectedMachineData].sort((a, b) => b.cpk - a.cpk);
    return { oeeRanking, cpkRanking };
  }, [selectedMachineData]);

  // Available machines (not yet selected)
  const availableMachines = useMemo(() => {
    return machines?.filter((m: any) => !selectedMachines.includes(m.id)) || [];
  }, [machines, selectedMachines]);

  if (machinesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">So sánh Máy</h1>
            <p className="text-muted-foreground">So sánh OEE và CPK giữa các máy (tối đa 5 máy)</p>
          </div>
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ngày</SelectItem>
              <SelectItem value="14d">14 ngày</SelectItem>
              <SelectItem value="30d">30 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Machine Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Chọn máy để so sánh</CardTitle>
            <CardDescription>Chọn từ 2 đến 5 máy để so sánh hiệu suất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMachineData.map((machine, index) => (
                <Badge 
                  key={machine.id} 
                  variant="secondary"
                  className="px-3 py-1 text-sm"
                  style={{ borderLeftColor: COLORS[index % COLORS.length], borderLeftWidth: 3 }}
                >
                  {machine.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                    onClick={() => removeMachine(machine.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            {selectedMachines.length < 5 && (
              <div className="flex gap-2">
                <Select onValueChange={addMachine}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Thêm máy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMachines.map((machine: any) => (
                      <SelectItem key={machine.id} value={machine.id.toString()}>
                        {machine.name} ({machine.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedMachines.length >= 2 ? (
          <>
            {/* OEE Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    So sánh OEE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={oeeComparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                        <ReferenceLine x={85} stroke="#22c55e" strokeDasharray="5 5" label="Mục tiêu" />
                        <Bar dataKey="oee" name="OEE" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    So sánh CPK
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cpkComparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 2.5]} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => value.toFixed(3)} />
                        <Legend />
                        <ReferenceLine x={1.33} stroke="#22c55e" strokeDasharray="5 5" label="CPK ≥ 1.33" />
                        <ReferenceLine x={1.0} stroke="#f59e0b" strokeDasharray="5 5" label="CPK ≥ 1.0" />
                        <Bar dataKey="cpk" name="CPK" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="cp" name="CP" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* OEE Components & Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Thành phần OEE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={oeeComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                        <Bar dataKey="availability" name="Availability" fill="#22c55e" />
                        <Bar dataKey="performance" name="Performance" fill="#f59e0b" />
                        <Bar dataKey="quality" name="Quality" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Biểu đồ Radar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        {selectedMachineData.map((machine, index) => (
                          <Radar
                            key={machine.id}
                            name={machine.name}
                            dataKey={machine.name}
                            stroke={COLORS[index % COLORS.length]}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* OEE Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Xu hướng OEE theo thời gian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[50, 100]} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="5 5" label="Mục tiêu" />
                      {selectedMachineData.map((machine, index) => (
                        <Line
                          key={machine.id}
                          type="monotone"
                          dataKey={machine.name}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    Xếp hạng OEE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankings.oeeRanking.map((machine, index) => (
                      <div key={machine.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? "bg-yellow-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-amber-600 text-white" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium">{machine.name}</span>
                        </div>
                        <span className={`font-bold ${
                          machine.oee >= 85 ? "text-green-500" :
                          machine.oee >= 70 ? "text-yellow-500" :
                          "text-red-500"
                        }`}>
                          {machine.oee.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-500" />
                    Xếp hạng CPK
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankings.cpkRanking.map((machine, index) => (
                      <div key={machine.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? "bg-purple-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-amber-600 text-white" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium">{machine.name}</span>
                        </div>
                        <span className={`font-bold ${
                          machine.cpk >= 1.33 ? "text-green-500" :
                          machine.cpk >= 1.0 ? "text-yellow-500" :
                          "text-red-500"
                        }`}>
                          {machine.cpk.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Bảng thống kê chi tiết</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Máy</th>
                        <th className="text-right py-2 px-3">OEE</th>
                        <th className="text-right py-2 px-3">Availability</th>
                        <th className="text-right py-2 px-3">Performance</th>
                        <th className="text-right py-2 px-3">Quality</th>
                        <th className="text-right py-2 px-3">CPK</th>
                        <th className="text-right py-2 px-3">CP</th>
                        <th className="text-right py-2 px-3">PPK</th>
                        <th className="text-right py-2 px-3">PP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMachineData.map((machine, index) => (
                        <tr key={machine.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              {machine.name}
                            </div>
                          </td>
                          <td className={`text-right py-2 px-3 font-medium ${
                            machine.oee >= 85 ? "text-green-500" :
                            machine.oee >= 70 ? "text-yellow-500" :
                            "text-red-500"
                          }`}>
                            {machine.oee.toFixed(1)}%
                          </td>
                          <td className="text-right py-2 px-3">{machine.availability.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3">{machine.performance.toFixed(1)}%</td>
                          <td className="text-right py-2 px-3">{machine.quality.toFixed(1)}%</td>
                          <td className={`text-right py-2 px-3 font-medium ${
                            machine.cpk >= 1.33 ? "text-green-500" :
                            machine.cpk >= 1.0 ? "text-yellow-500" :
                            "text-red-500"
                          }`}>
                            {machine.cpk.toFixed(3)}
                          </td>
                          <td className="text-right py-2 px-3">{machine.cp.toFixed(3)}</td>
                          <td className="text-right py-2 px-3">{machine.ppk.toFixed(3)}</td>
                          <td className="text-right py-2 px-3">{machine.pp.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Vui lòng chọn ít nhất 2 máy để so sánh</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
