import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  RefreshCw,
  Download,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  LineChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Lightbulb,
} from "lucide-react";

// Types
interface DataPoint {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType?: "spike" | "dip" | "trend" | "pattern";
}

interface AnomalyAlert {
  id: string;
  timestamp: Date;
  machine: string;
  parameter: string;
  value: number;
  expectedRange: { min: number; max: number };
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "acknowledged" | "resolved";
  rootCause?: string;
  recommendation?: string;
}

interface TrendPrediction {
  timestamp: Date;
  predicted: number;
  lower: number;
  upper: number;
}

// Mock data generator
function generateMockData(): {
  dataPoints: DataPoint[];
  alerts: AnomalyAlert[];
  predictions: TrendPrediction[];
  stats: {
    totalDataPoints: number;
    anomaliesDetected: number;
    anomalyRate: number;
    avgAnomalyScore: number;
    trendDirection: "up" | "down" | "stable";
    cpkTrend: number;
  };
} {
  const now = new Date();
  const dataPoints: DataPoint[] = [];
  const alerts: AnomalyAlert[] = [];
  const predictions: TrendPrediction[] = [];

  // Generate historical data with some anomalies
  for (let i = 100; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const baseValue = 50 + Math.sin(i / 10) * 10;
    const noise = (Math.random() - 0.5) * 5;
    
    // Inject some anomalies
    let value = baseValue + noise;
    let isAnomaly = false;
    let anomalyScore = Math.random() * 0.3;
    let anomalyType: DataPoint["anomalyType"] = undefined;

    if (i === 25 || i === 50 || i === 75) {
      // Spike anomaly
      value = baseValue + 30 + Math.random() * 10;
      isAnomaly = true;
      anomalyScore = 0.85 + Math.random() * 0.15;
      anomalyType = "spike";
    } else if (i === 35 || i === 60) {
      // Dip anomaly
      value = baseValue - 25 - Math.random() * 10;
      isAnomaly = true;
      anomalyScore = 0.75 + Math.random() * 0.2;
      anomalyType = "dip";
    }

    dataPoints.push({ timestamp, value, isAnomaly, anomalyScore, anomalyType });
  }

  // Generate alerts
  const machines = ["CNC-001", "CNC-002", "SMT-001", "AOI-001", "Reflow-001"];
  const parameters = ["Temperature", "Pressure", "Speed", "Vibration", "CPK"];
  const severities: AnomalyAlert["severity"][] = ["low", "medium", "high", "critical"];

  for (let i = 0; i < 8; i++) {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    alerts.push({
      id: `alert-${i}`,
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      machine: machines[Math.floor(Math.random() * machines.length)],
      parameter: parameters[Math.floor(Math.random() * parameters.length)],
      value: 50 + Math.random() * 50,
      expectedRange: { min: 40, max: 60 },
      severity,
      status: i < 3 ? "active" : i < 5 ? "acknowledged" : "resolved",
      rootCause: i % 2 === 0 ? "Tool wear detected" : "Environmental temperature fluctuation",
      recommendation: i % 2 === 0 ? "Schedule tool replacement" : "Check HVAC system",
    });
  }

  // Generate predictions
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    const predicted = 50 + Math.sin((100 + i) / 10) * 10 + i * 0.1;
    predictions.push({
      timestamp,
      predicted,
      lower: predicted - 5 - Math.random() * 3,
      upper: predicted + 5 + Math.random() * 3,
    });
  }

  return {
    dataPoints,
    alerts,
    predictions,
    stats: {
      totalDataPoints: dataPoints.length,
      anomaliesDetected: dataPoints.filter(d => d.isAnomaly).length,
      anomalyRate: (dataPoints.filter(d => d.isAnomaly).length / dataPoints.length) * 100,
      avgAnomalyScore: dataPoints.reduce((sum, d) => sum + d.anomalyScore, 0) / dataPoints.length,
      trendDirection: "up",
      cpkTrend: 1.45,
    },
  };
}

// Z-Score calculation
function calculateZScore(values: number[]): { zScores: number[]; mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  const zScores = values.map(v => (v - mean) / (std || 1));
  return { zScores, mean, std };
}

// IQR calculation
function calculateIQR(values: number[]): { q1: number; q3: number; iqr: number; lowerBound: number; upperBound: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return {
    q1,
    q3,
    iqr,
    lowerBound: q1 - 1.5 * iqr,
    upperBound: q3 + 1.5 * iqr,
  };
}

// Moving Average calculation
function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export default function AnomalyDetection() {
  const { translate } = useLanguage();
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [selectedParameter, setSelectedParameter] = useState<string>("all");
  const [detectionMethod, setDetectionMethod] = useState<"zscore" | "iqr" | "ml">("zscore");
  const [sensitivity, setSensitivity] = useState([2.5]); // Z-score threshold
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);

  // Generate mock data
  const mockData = useMemo(() => generateMockData(), []);

  // Calculate statistics
  const analysisResults = useMemo(() => {
    const values = mockData.dataPoints.map(d => d.value);
    const zScoreResult = calculateZScore(values);
    const iqrResult = calculateIQR(values);
    const movingAvg = calculateMovingAverage(values, 10);

    return {
      zScore: zScoreResult,
      iqr: iqrResult,
      movingAverage: movingAvg,
    };
  }, [mockData]);

  const activeAlerts = mockData.alerts.filter(a => a.status === "active");
  const criticalAlerts = mockData.alerts.filter(a => a.severity === "critical" && a.status === "active");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Anomaly Detection
            </h1>
            <p className="text-muted-foreground mt-1">
              Phát hiện bất thường tự động và dự đoán xu hướng cho SPC/CPK
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Anomalies Detected!</AlertTitle>
            <AlertDescription>
              {criticalAlerts.length} critical anomalies require immediate attention.
              {criticalAlerts.map(a => ` ${a.machine}: ${a.parameter}`).join(", ")}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Data Points Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.stats.totalDataPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anomalies Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{mockData.stats.anomaliesDetected}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {mockData.stats.anomalyRate.toFixed(2)}% anomaly rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
              <div className="flex gap-1 mt-1">
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalAlerts.length} Critical
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CPK Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{mockData.stats.cpkTrend.toFixed(2)}</span>
                <ArrowUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Trending up</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="alerts">Alerts ({activeAlerts.length})</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Real-time Chart Placeholder */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Real-time Anomaly Detection
                  </CardTitle>
                  <CardDescription>
                    Live monitoring with anomaly highlighting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed">
                    <div className="text-center text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Real-time chart visualization</p>
                      <p className="text-sm">Showing {mockData.dataPoints.length} data points</p>
                      <p className="text-sm text-orange-600 mt-2">
                        {mockData.stats.anomaliesDetected} anomalies detected (highlighted in red)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detection Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Detection Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Z-Score Method</span>
                      <span className="text-green-600">Active</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Threshold: ±{sensitivity[0]} σ
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>IQR Method</span>
                      <span className="text-muted-foreground">Standby</span>
                    </div>
                    <Progress value={0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Bounds: [{analysisResults.iqr.lowerBound.toFixed(1)}, {analysisResults.iqr.upperBound.toFixed(1)}]
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ML Model</span>
                      <span className="text-blue-600">Training</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Accuracy: 94.5%
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Statistics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mean</span>
                        <span>{analysisResults.zScore.mean.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Std Dev</span>
                        <span>{analysisResults.zScore.std.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Q1 / Q3</span>
                        <span>{analysisResults.iqr.q1.toFixed(1)} / {analysisResults.iqr.q3.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Recent Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Root Cause</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.alerts.slice(0, 5).map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-sm">
                          {alert.timestamp.toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-medium">{alert.machine}</TableCell>
                        <TableCell>{alert.parameter}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {alert.value.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.expectedRange.min} - {alert.expectedRange.max}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.severity === "critical" ? "destructive" :
                              alert.severity === "high" ? "destructive" :
                              alert.severity === "medium" ? "default" : "secondary"
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.status === "active" ? (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Active
                            </Badge>
                          ) : alert.status === "acknowledged" ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Resolved
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {alert.rootCause || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Anomaly Alerts</CardTitle>
                <CardDescription>
                  Manage and respond to detected anomalies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-sm">
                          {alert.timestamp.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{alert.machine}</TableCell>
                        <TableCell>{alert.parameter}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {alert.value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.severity === "critical" ? "destructive" :
                              alert.severity === "high" ? "destructive" :
                              alert.severity === "medium" ? "default" : "secondary"
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.status === "active" ? (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Active
                            </Badge>
                          ) : alert.status === "acknowledged" ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Resolved
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-yellow-600" />
                            {alert.recommendation || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {alert.status === "active" && (
                              <Button variant="outline" size="sm">
                                Acknowledge
                              </Button>
                            )}
                            {alert.status === "acknowledged" && (
                              <Button variant="outline" size="sm">
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Z-Score Analysis</CardTitle>
                  <CardDescription>
                    Statistical deviation from mean
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Mean (μ)</p>
                      <p className="text-2xl font-bold">{analysisResults.zScore.mean.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Std Dev (σ)</p>
                      <p className="text-2xl font-bold">{analysisResults.zScore.std.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Detection Threshold (σ)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={sensitivity}
                        onValueChange={setSensitivity}
                        min={1}
                        max={4}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="font-mono w-12 text-right">{sensitivity[0]}σ</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Values beyond ±{sensitivity[0]}σ will be flagged as anomalies
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>IQR Analysis</CardTitle>
                  <CardDescription>
                    Interquartile range method
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Q1</p>
                      <p className="text-xl font-bold">{analysisResults.iqr.q1.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">IQR</p>
                      <p className="text-xl font-bold">{analysisResults.iqr.iqr.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Q3</p>
                      <p className="text-xl font-bold">{analysisResults.iqr.q3.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium">Outlier Bounds</p>
                    <p className="text-lg">
                      [{analysisResults.iqr.lowerBound.toFixed(2)}, {analysisResults.iqr.upperBound.toFixed(2)}]
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Values outside this range are considered outliers
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trend Prediction (Next 24 Hours)
                </CardTitle>
                <CardDescription>
                  AI-powered forecasting using moving average and pattern recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Prediction chart visualization</p>
                    <p className="text-sm">Showing {mockData.predictions.length} predicted data points</p>
                    <p className="text-sm text-blue-600 mt-2">
                      Confidence interval: 95%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Predicted Trend</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ArrowUp className="h-5 w-5 text-green-600" />
                      <span className="text-xl font-bold text-green-600">Upward</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Expected CPK (24h)</p>
                    <p className="text-xl font-bold">1.52 ± 0.08</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Anomaly Probability</p>
                    <p className="text-xl font-bold text-yellow-600">12%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Preventive Action Suggested</AlertTitle>
                    <AlertDescription>
                      Based on trend analysis, CNC-001 may require tool calibration within 48 hours to maintain CPK above 1.33.
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Process Stability</AlertTitle>
                    <AlertDescription>
                      SMT-001 shows excellent stability. Current process capability is well above target.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detection Settings</CardTitle>
                <CardDescription>
                  Configure anomaly detection parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Detection Method</Label>
                  <Select value={detectionMethod} onValueChange={(v: any) => setDetectionMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zscore">Z-Score (Statistical)</SelectItem>
                      <SelectItem value="iqr">IQR (Interquartile Range)</SelectItem>
                      <SelectItem value="ml">Machine Learning (AI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sensitivity Threshold</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={sensitivity}
                      onValueChange={setSensitivity}
                      min={1}
                      max={4}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="font-mono w-16 text-right">{sensitivity[0]}σ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Predictions</Label>
                    <p className="text-sm text-muted-foreground">Display trend predictions on charts</p>
                  </div>
                  <Switch
                    checked={showPredictions}
                    onCheckedChange={setShowPredictions}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Refresh</Label>
                    <p className="text-sm text-muted-foreground">Automatically update data every 30 seconds</p>
                  </div>
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                </div>

                <Button className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
