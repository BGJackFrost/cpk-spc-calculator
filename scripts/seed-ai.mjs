import { getDb } from '../server/db.ts';
import { aiTrainingDatasets, aiTrainingJobs, aiTrainingHistory, aiTrainedModels } from '../drizzle/schema.ts';

async function seedAiData() {
  console.log("🌱 Starting AI Data Seeding...");
  const db = await getDb();

  // 1. Seed datasets
  console.log("📊 Seeding AI Training Datasets...");
  const datasets = [
    {
      name: "PCB-001 SPC Data - 6 months",
      description: "Historical SPC data for PCB-001 product",
      filePath: "/datasets/pcb001_spc_6months.csv",
      fileUrl: "https://storage.example.com/datasets/pcb001_spc_6months.csv",
      fileSize: 524288,
      recordCount: 5234,
      features: JSON.stringify(["timestamp", "measurement_value", "cpk"]),
      targetColumn: "cpk",
      dataType: "spc_analysis",
      uploadedBy: 1,
    },
    {
      name: "IC-001 Quality Data",
      description: "Quality control data for IC-001",
      filePath: "/datasets/ic001_quality.csv",
      fileUrl: "https://storage.example.com/datasets/ic001_quality.csv",
      fileSize: 262144,
      recordCount: 2847,
      features: JSON.stringify(["defect_rate", "inspection_result"]),
      targetColumn: "defect_rate",
      dataType: "quality_control",
      uploadedBy: 1,
    },
    {
      name: "OEE Historical Data",
      description: "OEE data for all production lines",
      filePath: "/datasets/oee_historical.csv",
      fileUrl: "https://storage.example.com/datasets/oee_historical.csv",
      fileSize: 1048576,
      recordCount: 8920,
      features: JSON.stringify(["availability", "performance", "quality"]),
      targetColumn: "oee",
      dataType: "oee_analysis",
      uploadedBy: 1,
    },
    {
      name: "Defect Prediction Dataset",
      description: "Machine sensor data for defect prediction",
      filePath: "/datasets/defect_prediction.csv",
      fileUrl: "https://storage.example.com/datasets/defect_prediction.csv",
      fileSize: 2097152,
      recordCount: 15678,
      features: JSON.stringify(["temperature", "pressure", "vibration"]),
      targetColumn: "has_defect",
      dataType: "defect_prediction",
      uploadedBy: 1,
    },
    {
      name: "CPK Forecast Dataset",
      description: "Historical CPK values for forecasting",
      filePath: "/datasets/cpk_forecast.csv",
      fileUrl: "https://storage.example.com/datasets/cpk_forecast.csv",
      fileSize: 786432,
      recordCount: 6543,
      features: JSON.stringify(["date", "cpk", "shift", "operator"]),
      targetColumn: "cpk",
      dataType: "cpk_forecast",
      uploadedBy: 1,
    },
  ];

  await db.insert(aiTrainingDatasets).values(datasets).onConflictDoNothing();
  console.log(`✅ Seeded ${datasets.length} datasets`);

  // 2. Seed training jobs
  console.log("🎯 Seeding AI Training Jobs...");
  const jobs = [
    {
      datasetId: 1,
      modelType: "cpk_forecast",
      modelName: "PCB-001 CPK Predictor",
      hyperparameters: JSON.stringify({ epochs: 100, batch_size: 32, learning_rate: 0.001 }),
      status: "completed",
      progress: 100,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000),
      trainedBy: 1,
    },
    {
      datasetId: 2,
      modelType: "quality_prediction",
      modelName: "IC-001 Quality Classifier",
      hyperparameters: JSON.stringify({ epochs: 50, batch_size: 16 }),
      status: "running",
      progress: 65,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      trainedBy: 1,
    },
    {
      datasetId: 3,
      modelType: "oee_forecast",
      modelName: "OEE Forecaster",
      hyperparameters: JSON.stringify({ epochs: 80, batch_size: 64 }),
      status: "completed",
      progress: 100,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 7200000),
      trainedBy: 1,
    },
    {
      datasetId: 4,
      modelType: "defect_detection",
      modelName: "Defect Detector v1",
      hyperparameters: JSON.stringify({ epochs: 120, batch_size: 32 }),
      status: "failed",
      progress: 45,
      errorMessage: "Insufficient training data for convergence",
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1800000),
      trainedBy: 1,
    },
    {
      datasetId: 5,
      modelType: "cpk_forecast",
      modelName: "CPK Trend Analyzer",
      hyperparameters: JSON.stringify({ epochs: 100, batch_size: 32 }),
      status: "pending",
      progress: 0,
      trainedBy: 1,
    },
  ];

  await db.insert(aiTrainingJobs).values(jobs).onConflictDoNothing();
  console.log(`✅ Seeded ${jobs.length} training jobs`);

  // 3. Seed training history (batch insert)
  console.log("📈 Seeding Training History...");
  const history = [];
  
  // Job 1: Completed (100 epochs)
  for (let epoch = 1; epoch <= 100; epoch++) {
    history.push({
      jobId: 1,
      epoch,
      loss: 0.5 - (epoch * 0.004),
      accuracy: 0.5 + (epoch * 0.004),
      valLoss: 0.52 - (epoch * 0.0038),
      valAccuracy: 0.48 + (epoch * 0.0042),
      learningRate: 0.001,
      duration: 35 + Math.random() * 10,
    });
  }

  // Job 2: Running (65 epochs so far)
  for (let epoch = 1; epoch <= 65; epoch++) {
    history.push({
      jobId: 2,
      epoch,
      loss: 0.6 - (epoch * 0.005),
      accuracy: 0.45 + (epoch * 0.006),
      valLoss: 0.62 - (epoch * 0.0048),
      valAccuracy: 0.43 + (epoch * 0.0062),
      learningRate: 0.001,
      duration: 28 + Math.random() * 8,
    });
  }

  // Job 3: Completed (80 epochs)
  for (let epoch = 1; epoch <= 80; epoch++) {
    history.push({
      jobId: 3,
      epoch,
      loss: 0.55 - (epoch * 0.0045),
      accuracy: 0.48 + (epoch * 0.005),
      valLoss: 0.57 - (epoch * 0.0042),
      valAccuracy: 0.46 + (epoch * 0.0052),
      learningRate: 0.001,
      duration: 42 + Math.random() * 12,
    });
  }

  // Job 4: Failed (45 epochs before failure)
  for (let epoch = 1; epoch <= 45; epoch++) {
    history.push({
      jobId: 4,
      epoch,
      loss: 0.7 - (epoch * 0.002),
      accuracy: 0.4 + (epoch * 0.003),
      valLoss: 0.75 - (epoch * 0.0015),
      valAccuracy: 0.38 + (epoch * 0.0025),
      learningRate: 0.001,
      duration: 38 + Math.random() * 10,
    });
  }

  // Batch insert (split into chunks of 100)
  const chunkSize = 100;
  for (let i = 0; i < history.length; i += chunkSize) {
    const chunk = history.slice(i, i + chunkSize);
    await db.insert(aiTrainingHistory).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ Seeded ${history.length} training history records`);

  // 4. Seed trained models
  console.log("🤖 Seeding Trained Models...");
  const models = [
    {
      jobId: 1,
      modelName: "PCB-001 CPK Predictor v1.0",
      modelType: "cpk_forecast",
      modelPath: "/models/pcb001_cpk_predictor_v1.h5",
      modelUrl: "https://storage.example.com/models/pcb001_cpk_predictor_v1.h5",
      modelSize: 5242880,
      accuracy: 0.96,
      loss: 0.12,
      valAccuracy: 0.94,
      valLoss: 0.15,
      metrics: JSON.stringify({ mse: 0.023, mae: 0.12, r2: 0.94 }),
      status: "active",
      version: "1.0.0",
      trainedBy: 1,
    },
    {
      jobId: 3,
      modelName: "OEE Forecaster v1.0",
      modelType: "oee_forecast",
      modelPath: "/models/oee_forecaster_v1.h5",
      modelUrl: "https://storage.example.com/models/oee_forecaster_v1.h5",
      modelSize: 7340032,
      accuracy: 0.92,
      loss: 0.19,
      valAccuracy: 0.90,
      valLoss: 0.22,
      metrics: JSON.stringify({ mse: 0.034, mae: 0.15, r2: 0.91 }),
      status: "active",
      version: "1.0.0",
      trainedBy: 1,
    },
    {
      jobId: 1,
      modelName: "PCB-001 CPK Predictor v1.1",
      modelType: "cpk_forecast",
      modelPath: "/models/pcb001_cpk_predictor_v1.1.h5",
      modelUrl: "https://storage.example.com/models/pcb001_cpk_predictor_v1.1.h5",
      modelSize: 5500000,
      accuracy: 0.97,
      loss: 0.10,
      valAccuracy: 0.95,
      valLoss: 0.13,
      metrics: JSON.stringify({ mse: 0.020, mae: 0.10, r2: 0.95 }),
      status: "archived",
      version: "1.1.0",
      trainedBy: 1,
    },
    {
      jobId: 2,
      modelName: "IC-001 Quality Classifier v1.0",
      modelType: "quality_prediction",
      modelPath: "/models/ic001_quality_v1.h5",
      modelUrl: "https://storage.example.com/models/ic001_quality_v1.h5",
      modelSize: 6200000,
      accuracy: 0.89,
      loss: 0.25,
      valAccuracy: 0.87,
      valLoss: 0.28,
      metrics: JSON.stringify({ precision: 0.88, recall: 0.86, f1: 0.87 }),
      status: "testing",
      version: "1.0.0",
      trainedBy: 1,
    },
    {
      jobId: 3,
      modelName: "OEE Forecaster v2.0",
      modelType: "oee_forecast",
      modelPath: "/models/oee_forecaster_v2.h5",
      modelUrl: "https://storage.example.com/models/oee_forecaster_v2.h5",
      modelSize: 8100000,
      accuracy: 0.94,
      loss: 0.16,
      valAccuracy: 0.92,
      valLoss: 0.19,
      metrics: JSON.stringify({ mse: 0.028, mae: 0.13, r2: 0.93 }),
      status: "active",
      version: "2.0.0",
      trainedBy: 1,
    },
  ];

  await db.insert(aiTrainedModels).values(models).onConflictDoNothing();
  console.log(`✅ Seeded ${models.length} trained models`);

  console.log("🎉 AI Data Seeding completed successfully!");
}

seedAiData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
