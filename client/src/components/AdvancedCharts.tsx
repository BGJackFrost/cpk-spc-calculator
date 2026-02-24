import React, { useMemo, memo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Scatter,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ChartData {
  index: number;
  value: number;
  timestamp?: Date;
}

interface SpcViolation {
  index: number;
  ruleNumber: number;
  ruleName: string;
  description: string;
}

// SPC Rules configuration from plan
interface SpcRulesConfig {
  rule1Enabled?: boolean;
  rule2Enabled?: boolean;
  rule3Enabled?: boolean;
  rule4Enabled?: boolean;
  rule5Enabled?: boolean;
  rule6Enabled?: boolean;
  rule7Enabled?: boolean;
  rule8Enabled?: boolean;
}

interface AdvancedChartsProps {
  xBarData: ChartData[];
  rangeData: ChartData[];
  rawData: { value: number; timestamp: Date }[];
  mean: number;
  ucl: number;
  lcl: number;
  uclR: number;
  lclR: number;
  usl?: number | null;
  lsl?: number | null;
  rulesConfig?: SpcRulesConfig;
  violations?: SpcViolation[];
}

// Check 8 Western Electric SPC Rules
function checkSpcRules(
  data: ChartData[],
  mean: number,
  ucl: number,
  lcl: number,
  rulesConfig?: SpcRulesConfig
): SpcViolation[] {
  const violations: SpcViolation[] = [];
  const sigma = (ucl - mean) / 3;
  const sigma1Up = mean + sigma;
  const sigma1Down = mean - sigma;
  const sigma2Up = mean + 2 * sigma;
  const sigma2Down = mean - 2 * sigma;

  data.forEach((point, idx) => {
    // Rule 1: Point beyond 3σ (UCL/LCL)
    if (rulesConfig?.rule1Enabled !== false && (point.value > ucl || point.value < lcl)) {
      violations.push({
        index: point.index,
        ruleNumber: 1,
        ruleName: "Rule 1: Điểm vượt 3σ",
        description: `Giá trị ${point.value.toFixed(4)} nằm ngoài giới hạn kiểm soát`,
      });
    }

    // Rule 2: 9 consecutive points on same side of center
    if (rulesConfig?.rule2Enabled !== false && idx >= 8) {
      const last9 = data.slice(idx - 8, idx + 1);
      const allAbove = last9.every(p => p.value > mean);
      const allBelow = last9.every(p => p.value < mean);
      if (allAbove || allBelow) {
        violations.push({
          index: point.index,
          ruleNumber: 2,
          ruleName: "Rule 2: 9 điểm liên tiếp cùng phía",
          description: `9 điểm liên tiếp ${allAbove ? "trên" : "dưới"} đường trung bình`,
        });
      }
    }

    // Rule 3: 6 consecutive points trending up or down
    if (rulesConfig?.rule3Enabled !== false && idx >= 5) {
      const last6 = data.slice(idx - 5, idx + 1);
      let allIncreasing = true;
      let allDecreasing = true;
      for (let i = 1; i < last6.length; i++) {
        if (last6[i].value <= last6[i - 1].value) allIncreasing = false;
        if (last6[i].value >= last6[i - 1].value) allDecreasing = false;
      }
      if (allIncreasing || allDecreasing) {
        violations.push({
          index: point.index,
          ruleNumber: 3,
          ruleName: "Rule 3: 6 điểm xu hướng",
          description: `6 điểm liên tiếp ${allIncreasing ? "tăng" : "giảm"}`,
        });
      }
    }

    // Rule 4: 14 consecutive points alternating
    if (rulesConfig?.rule4Enabled !== false && idx >= 13) {
      const last14 = data.slice(idx - 13, idx + 1);
      let alternating = true;
      for (let i = 2; i < last14.length; i++) {
        const prev = last14[i - 1].value - last14[i - 2].value;
        const curr = last14[i].value - last14[i - 1].value;
        if (prev * curr >= 0) {
          alternating = false;
          break;
        }
      }
      if (alternating) {
        violations.push({
          index: point.index,
          ruleNumber: 4,
          ruleName: "Rule 4: 14 điểm dao động",
          description: "14 điểm liên tiếp dao động lên xuống xen kẽ",
        });
      }
    }

    // Rule 5: 2 of 3 consecutive points beyond 2σ
    if (rulesConfig?.rule5Enabled !== false && idx >= 2) {
      const last3 = data.slice(idx - 2, idx + 1);
      const beyond2Sigma = last3.filter(p => p.value > sigma2Up || p.value < sigma2Down).length;
      if (beyond2Sigma >= 2) {
        violations.push({
          index: point.index,
          ruleNumber: 5,
          ruleName: "Rule 5: 2/3 điểm vượt 2σ",
          description: "2 trong 3 điểm liên tiếp nằm ngoài 2σ",
        });
      }
    }

    // Rule 6: 4 of 5 consecutive points beyond 1σ
    if (rulesConfig?.rule6Enabled !== false && idx >= 4) {
      const last5 = data.slice(idx - 4, idx + 1);
      const beyond1Sigma = last5.filter(p => p.value > sigma1Up || p.value < sigma1Down).length;
      if (beyond1Sigma >= 4) {
        violations.push({
          index: point.index,
          ruleNumber: 6,
          ruleName: "Rule 6: 4/5 điểm vượt 1σ",
          description: "4 trong 5 điểm liên tiếp nằm ngoài 1σ",
        });
      }
    }

    // Rule 7: 15 consecutive points within 1σ
    if (rulesConfig?.rule7Enabled !== false && idx >= 14) {
      const last15 = data.slice(idx - 14, idx + 1);
      const allWithin1Sigma = last15.every(p => p.value <= sigma1Up && p.value >= sigma1Down);
      if (allWithin1Sigma) {
        violations.push({
          index: point.index,
          ruleNumber: 7,
          ruleName: "Rule 7: 15 điểm trong 1σ",
          description: "15 điểm liên tiếp nằm trong 1σ (stratification)",
        });
      }
    }

    // Rule 8: 8 consecutive points beyond 1σ on both sides
    if (rulesConfig?.rule8Enabled !== false && idx >= 7) {
      const last8 = data.slice(idx - 7, idx + 1);
      const allBeyond1Sigma = last8.every(p => p.value > sigma1Up || p.value < sigma1Down);
      const hasAbove = last8.some(p => p.value > sigma1Up);
      const hasBelow = last8.some(p => p.value < sigma1Down);
      if (allBeyond1Sigma && hasAbove && hasBelow) {
        violations.push({
          index: point.index,
          ruleNumber: 8,
          ruleName: "Rule 8: 8 điểm ngoài 1σ hai phía",
          description: "8 điểm liên tiếp nằm ngoài 1σ cả hai phía (mixture)",
        });
      }
    }
  });

  // Remove duplicates by index
  const uniqueViolations = violations.reduce((acc, v) => {
    const existing = acc.find(x => x.index === v.index);
    if (!existing) acc.push(v);
    return acc;
  }, [] as SpcViolation[]);

  return uniqueViolations;
}

// Check if point violates USL/LSL
function isOutOfSpec(value: number, usl?: number | null, lsl?: number | null): boolean {
  if (usl !== null && usl !== undefined && value > usl) return true;
  if (lsl !== null && lsl !== undefined && value < lsl) return true;
  return false;
}

/**
 * Histogram component for distribution analysis
 */
function Histogram({ data, title, bins = 10, usl, lsl }: { 
  data: number[]; 
  title: string; 
  bins?: number;
  usl?: number | null;
  lsl?: number | null;
}) {
  if (data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins || 1;

  const binCounts = Array(bins).fill(0);
  const binLabels: string[] = [];

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    binLabels.push(`${binStart.toFixed(2)}`);
  }

  for (const value of data) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    binCounts[binIndex]++;
  }

  const histogramData = binLabels.map((label, index) => {
    const binStart = min + index * binWidth;
    const binEnd = binStart + binWidth;
    const isNG = (usl && binEnd > usl) || (lsl && binStart < lsl);
    return {
      bin: label,
      count: binCounts[index],
      isNG,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Phân bổ tần suất</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bin" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count">
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isNG ? "#ef4444" : "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>NG (Ngoài USL/LSL)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * XBar Chart with control limits and NG points highlighted
 */
function XBarChart({ xBarData, mean, ucl, lcl, usl, lsl, violations }: {
  xBarData: ChartData[];
  mean: number;
  ucl: number;
  lcl: number;
  usl?: number | null;
  lsl?: number | null;
  violations?: SpcViolation[];
}) {
  const violationIndices = new Set(violations?.map(v => v.index) || []);

  const chartData = xBarData.map(d => {
    const isViolation = violationIndices.has(d.index);
    const isOutSpec = isOutOfSpec(d.value, usl, lsl);
    const isNG = isViolation || isOutSpec;
    
    return {
      ...d,
      timestamp: d.timestamp ? new Date(d.timestamp).toLocaleTimeString("vi-VN") : `${d.index}`,
      isNG,
      ngReason: isOutSpec ? "Ngoài USL/LSL" : isViolation ? "Vi phạm SPC Rule" : null,
    };
  });

  const ngCount = chartData.filter(d => d.isNG).length;
  const okCount = chartData.length - ngCount;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">XBar Chart (Trung bình nhóm con)</CardTitle>
            <CardDescription>Biểu đồ kiểm soát giá trị trung bình</CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>OK: {okCount}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>NG: {ngCount}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold">Point #{data.index}</p>
                      <p>Giá trị: {data.value.toFixed(4)}</p>
                      {data.isNG && (
                        <p className="text-red-600 font-medium">
                          NG: {data.ngReason}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine y={mean} stroke="#666" strokeDasharray="5 5" label="Mean" />
            <ReferenceLine y={ucl} stroke="#f97316" strokeDasharray="5 5" label="UCL" />
            <ReferenceLine y={lcl} stroke="#f97316" strokeDasharray="5 5" label="LCL" />
            {usl && <ReferenceLine y={usl} stroke="#dc2626" label="USL" strokeWidth={2} />}
            {lsl && <ReferenceLine y={lsl} stroke="#dc2626" label="LSL" strokeWidth={2} />}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              dot={({ cx, cy, payload }) => {
                const isNG = payload.isNG;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isNG ? 6 : 4}
                    fill={isNG ? "#ef4444" : "#3b82f6"}
                    stroke={isNG ? "#b91c1c" : "#2563eb"}
                    strokeWidth={isNG ? 2 : 1}
                  />
                );
              }}
              name="XBar" 
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700" />
            <span>NG (Vi phạm SPC Rule hoặc USL/LSL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-orange-500" style={{ borderStyle: "dashed" }} />
            <span>UCL/LCL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-red-600" />
            <span>USL/LSL</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * R Chart (Range Chart) with control limits and NG points
 */
function RChart({ rangeData, uclR, lclR }: {
  rangeData: ChartData[];
  uclR: number;
  lclR: number;
}) {
  const chartData = rangeData.map((d, idx) => {
    const isNG = d.value > uclR || d.value < lclR;
    return {
      ...d,
      index: idx + 1,
      isNG,
    };
  });

  const ngCount = chartData.filter(d => d.isNG).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">R Chart (Biên độ)</CardTitle>
            <CardDescription>Biểu đồ kiểm soát biên độ nhóm con</CardDescription>
          </div>
          {ngCount > 0 && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>NG: {ngCount}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={uclR} stroke="#ef4444" strokeDasharray="5 5" label="UCL_R" />
            <ReferenceLine y={lclR} stroke="#ef4444" strokeDasharray="5 5" label="LCL_R" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              dot={({ cx, cy, payload }) => {
                const isNG = payload.isNG;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isNG ? 6 : 4}
                    fill={isNG ? "#ef4444" : "#10b981"}
                    stroke={isNG ? "#b91c1c" : "#059669"}
                    strokeWidth={isNG ? 2 : 1}
                  />
                );
              }}
              name="Range" 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Sample Data Table with NG highlighting and Pagination
 */
function SampleDataTable({ rawData, usl, lsl }: { 
  rawData: { value: number; timestamp: Date }[];
  usl?: number | null;
  lsl?: number | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const totalPages = Math.ceil(rawData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayData = rawData.slice(startIndex, endIndex);
  
  // Count NG items
  const ngCount = rawData.filter(item => isOutOfSpec(item.value, usl, lsl)).length;
  const okCount = rawData.length - ngCount;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bảng dữ liệu mẫu</CardTitle>
            <CardDescription>
              Hiển thị {startIndex + 1}-{Math.min(endIndex, rawData.length)} / {rawData.length} mẫu
              <span className="ml-2">
                (<span className="text-green-600">{okCount} OK</span>, <span className="text-red-600">{ngCount} NG</span>)
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hiển thị:</span>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-sm border rounded-md bg-background"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Thời gian</th>
                <th className="px-3 py-2 text-right font-semibold">Giá trị</th>
                <th className="px-3 py-2 text-center font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                const isNG = isOutOfSpec(item.value, usl, lsl);
                const globalIndex = startIndex + idx + 1;
                return (
                  <tr key={idx} className={`border-b ${isNG ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-muted/50"}`}>
                    <td className="px-3 py-2">{globalIndex}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${isNG ? "text-red-600 font-bold" : ""}`}>
                      {item.value.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isNG ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium dark:bg-red-900/50 dark:text-red-300">
                          <AlertTriangle className="h-3 w-3" />
                          NG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900/50 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * SPC Rule Violations Summary
 */
function ViolationsSummary({ violations }: { violations: SpcViolation[] }) {
  if (violations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Không có vi phạm SPC Rules
          </CardTitle>
          <CardDescription>Quy trình đang trong tầm kiểm soát</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group violations by rule
  const groupedViolations = violations.reduce((acc, v) => {
    if (!acc[v.ruleNumber]) {
      acc[v.ruleNumber] = { ruleName: v.ruleName, count: 0, indices: [] };
    }
    acc[v.ruleNumber].count++;
    acc[v.ruleNumber].indices.push(v.index);
    return acc;
  }, {} as Record<number, { ruleName: string; count: number; indices: number[] }>);

  return (
    <Card className="w-full border-red-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Phát hiện {violations.length} vi phạm SPC Rules
        </CardTitle>
        <CardDescription>Quy trình cần được xem xét và cải tiến</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(groupedViolations).map(([ruleNum, data]) => (
            <div key={ruleNum} className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-800">{data.ruleName}</span>
                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-sm">
                  {data.count} lần
                </span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Tại điểm: {data.indices.slice(0, 5).join(", ")}
                {data.indices.length > 5 && ` và ${data.indices.length - 5} điểm khác`}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main AdvancedCharts component - Memoized for performance
 */
const AdvancedCharts = memo(function AdvancedCharts({
  xBarData,
  rangeData,
  rawData,
  mean,
  ucl,
  lcl,
  uclR,
  lclR,
  usl,
  lsl,
}: AdvancedChartsProps) {
  // Calculate SPC rule violations
  const violations = useMemo(() => {
    return checkSpcRules(xBarData, mean, ucl, lcl);
  }, [xBarData, mean, ucl, lcl]);

  const xBarValues = xBarData.map(d => d.value);
  const rangeValues = rangeData.map(d => d.value);

  return (
    <div className="space-y-6">
      {/* Violations Summary */}
      <ViolationsSummary violations={violations} />

      {/* XBar Chart */}
      <XBarChart 
        xBarData={xBarData} 
        mean={mean} 
        ucl={ucl} 
        lcl={lcl} 
        usl={usl} 
        lsl={lsl}
        violations={violations}
      />

      {/* R Chart */}
      <RChart rangeData={rangeData} uclR={uclR} lclR={lclR} />

      {/* Histograms */}
      <div className="grid md:grid-cols-2 gap-6">
        <Histogram data={xBarValues} title="Phân bổ XBar" usl={usl} lsl={lsl} />
        <Histogram data={rangeValues} title="Phân bổ Range" />
      </div>

      {/* Sample Data Table */}
      <SampleDataTable rawData={rawData} usl={usl} lsl={lsl} />
    </div>
  );
});

export default AdvancedCharts;
