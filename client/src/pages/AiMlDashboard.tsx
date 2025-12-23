import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAiPredictionData, useRealtimeData } from '@/hooks/useRealtimeData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  Target,
  Zap,
  Clock,
  BarChart3,
  LineChart,
  Settings,
  Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AiMlDashboard() {
  const [activeTab, setActiveTab] = useState('models');
  const [isCreatingModel, setIsCreatingModel] = useState(false);

  // Real-time AI/ML data subscription
  const { predictions: realtimePredictions, latestPrediction, isConnected, error: sseError } = useAiPredictionData();
  
  // Real-time data for AI/ML channels
  const { messages: aiMessages, lastMessage } = useRealtimeData({
    channels: ['ai:predictions', 'ai:anomalies', 'ai:model_updates'],
    onMessage: (event) => {
      console.log('[AI/ML] Realtime event:', event.type, event.data);
    }
  });

  // Mock AI/ML data
  const mlStats = {
    totalModels: 5,
    readyModels: 3,
    trainingModels: 1,
    totalPredictions: 12450,
    totalAnomalies: 23,
    avgAccuracy: 0.87,
  };

  const models = [
    {
      id: 'model_001',
      name: 'Anomaly Detection v2',
      type: 'anomaly_detection',
      version: '2.1.0',
      status: 'ready',
      accuracy: 0.92,
      trainedAt: '2024-01-15',
      predictions: 5420,
    },
    {
      id: 'model_002',
      name: 'Quality Prediction',
      type: 'quality_prediction',
      version: '1.3.0',
      status: 'ready',
      accuracy: 0.88,
      trainedAt: '2024-01-10',
      predictions: 3210,
    },
    {
      id: 'model_003',
      name: 'Predictive Maintenance',
      type: 'predictive_maintenance',
      version: '1.0.0',
      status: 'training',
      accuracy: null,
      trainedAt: null,
      predictions: 0,
    },
    {
      id: 'model_004',
      name: 'CPK Forecasting',
      type: 'quality_prediction',
      version: '1.1.0',
      status: 'ready',
      accuracy: 0.85,
      trainedAt: '2024-01-08',
      predictions: 3820,
    },
  ];

  const recentPredictions = [
    {
      id: 'pred_001',
      modelName: 'Anomaly Detection v2',
      input: { temperature: 25.4, pressure: 1013 },
      prediction: 'normal',
      confidence: 0.95,
      timestamp: '2 min ago',
    },
    {
      id: 'pred_002',
      modelName: 'Quality Prediction',
      input: { cpk: 1.33, measurement: 50.2 },
      prediction: 'pass',
      confidence: 0.92,
      timestamp: '5 min ago',
    },
    {
      id: 'pred_003',
      modelName: 'Anomaly Detection v2',
      input: { temperature: 32.1, pressure: 1025 },
      prediction: 'anomaly',
      confidence: 0.78,
      timestamp: '10 min ago',
    },
  ];

  const anomalies = [
    {
      id: 'anom_001',
      timestamp: '10 min ago',
      score: 0.85,
      factors: ['temperature', 'vibration'],
      status: 'investigating',
    },
    {
      id: 'anom_002',
      timestamp: '1 hour ago',
      score: 0.72,
      factors: ['pressure'],
      status: 'resolved',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500">Ready</Badge>;
      case 'training':
        return <Badge className="bg-blue-500">Training</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getModelIcon = (type: string) => {
    switch (type) {
      case 'anomaly_detection':
        return <AlertTriangle className="h-5 w-5" />;
      case 'quality_prediction':
        return <Target className="h-5 w-5" />;
      case 'predictive_maintenance':
        return <Clock className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI/ML Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Machine learning models, predictions, and anomaly detection
              </p>
              {/* Realtime Connection Indicator */}
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {realtimePredictions.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {realtimePredictions.length} new predictions
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={isCreatingModel} onOpenChange={setIsCreatingModel}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Model
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Model</DialogTitle>
                  <DialogDescription>
                    Configure and train a new machine learning model
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="modelName">Model Name</Label>
                    <Input id="modelName" placeholder="Anomaly Detection v3" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="modelType">Model Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                        <SelectItem value="quality_prediction">Quality Prediction</SelectItem>
                        <SelectItem value="predictive_maintenance">Predictive Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dataSource">Data Source</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spc_history">SPC Analysis History</SelectItem>
                        <SelectItem value="measurements">Measurements</SelectItem>
                        <SelectItem value="iot_data">IoT Device Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingModel(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreatingModel(false)}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Training
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mlStats.totalModels}</div>
              <p className="text-xs text-muted-foreground">
                {mlStats.readyModels} ready, {mlStats.trainingModels} training
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(mlStats.avgAccuracy * 100).toFixed(1)}%</div>
              <Progress value={mlStats.avgAccuracy * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mlStats.totalPredictions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ~{Math.round(mlStats.totalPredictions / 30)} per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mlStats.totalAnomalies}</div>
              <p className="text-xs text-muted-foreground">
                {anomalies.filter(a => a.status === 'investigating').length} investigating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      {getModelIcon(model.type)}
                      <div>
                        <CardTitle className="text-base">{model.name}</CardTitle>
                        <CardDescription className="text-xs">
                          v{model.version} • {model.type.replace('_', ' ')}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(model.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {model.accuracy && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Accuracy</span>
                            <span>{(model.accuracy * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={model.accuracy * 100} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Predictions:</span>
                          <span className="ml-1 font-medium">{model.predictions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trained:</span>
                          <span className="ml-1 font-medium">{model.trainedAt || 'In progress'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        {model.status === 'ready' ? (
                          <>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Zap className="mr-1 h-3 w-3" />
                              Predict
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="flex-1" disabled>
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            Training...
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Predictions</CardTitle>
                <CardDescription>Latest predictions from ML models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPredictions.map((pred) => (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{pred.modelName}</div>
                          <div className="text-sm text-muted-foreground">
                            Input: {JSON.stringify(pred.input)}
                          </div>
                          <div className="text-xs text-muted-foreground">{pred.timestamp}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={pred.prediction === 'anomaly' || pred.prediction === 'fail' ? 'destructive' : 'default'}
                        >
                          {pred.prediction}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(pred.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>Anomalies detected by ML models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${
                          anomaly.status === 'investigating' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        <div>
                          <div className="font-medium">Anomaly Score: {anomaly.score.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            Contributing factors: {anomaly.factors.join(', ')}
                          </div>
                          <div className="text-xs text-muted-foreground">{anomaly.timestamp}</div>
                        </div>
                      </div>
                      <Badge
                        variant={anomaly.status === 'investigating' ? 'secondary' : 'default'}
                      >
                        {anomaly.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Jobs</CardTitle>
                <CardDescription>Active and recent training jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="font-medium">Predictive Maintenance v1.0.0</span>
                      </div>
                      <Badge className="bg-blue-500">Training</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>65%</span>
                      </div>
                      <Progress value={65} />
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Epoch: 65/100</div>
                        <div>Loss: 0.0234</div>
                        <div>ETA: 15 min</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Anomaly Detection v2.1.0</span>
                      </div>
                      <Badge className="bg-green-500">Completed</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>Accuracy: 92%</div>
                      <div>Duration: 45 min</div>
                      <div>Data points: 50,000</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
