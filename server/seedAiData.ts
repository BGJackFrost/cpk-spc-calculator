import { getDb } from "./db";
import { aiTrainingDatasets, aiTrainingJobs, aiTrainingHistory, aiTrainedModels } from "../drizzle/schema";

/**
 * Seed AI Training Datasets
 */
async function seedAiDatasets() {
  console.log("🌱 Seeding AI Training Datasets...");
  const db = await getDb();

  const datasets = [
    {
      name: "PCB-001 SPC Data - 6 months",
      description: "Historical SPC data for PCB-001 product over 6 months period. Contains 5000+ measurement points from Solder Paste Printing station.",
      filePath: "/datasets/pcb001_spc_6months.csv",
      fileUrl: "https://storage.example.com/datasets/pcb001_spc_6months.csv",
      fileSize: 524288, // 512 KB
      recordCount: 5234,
      features: JSON.stringify(["timestamp", "measurement_value", "usl", "lsl", "target", "cpk", "mean", "std_dev"]),
      targetColumn: "cpk",
      dataType: "spc_analysis",
      uploadedBy: 1,
    },
    {
      name: "IC-001 Quality Data - 3 months",
      description: "Quality control data for IC-001 component. Includes defect rates, inspection results, and process parameters.",
      filePath: "/datasets/ic001_quality_3months.csv",
      fileUrl: "https://storage.example.com/datasets/ic001_quality_3months.csv",
      fileSize: 262144, // 256 KB
      recordCount: 2847,
      features: JSON.stringify(["timestamp", "defect_rate", "inspection_pass", "temperature", "humidity", "pressure"]),
      targetColumn: "defect_rate",
      dataType: "quality_control",
      uploadedBy: 1,
    },
    {
      name: "OEE Multi-Line Dataset",
      description: "OEE data from 5 production lines over 90 days. Useful for predictive maintenance and performance optimization.",
      filePath: "/datasets/oee_multiline_90days.csv",
      fileUrl: "https://storage.example.com/datasets/oee_multiline_90days.csv",
      fileSize: 1048576, // 1 MB
      recordCount: 10800,
      features: JSON.stringify(["line_id", "timestamp", "availability", "performance", "quality", "oee", "downtime_minutes"]),
      targetColumn: "oee",
      dataType: "oee_analysis",
      uploadedBy: 1,
    },
    {
      name: "Defect Prediction Training Set",
      description: "Labeled dataset for training defect prediction models. Contains sensor data, process parameters, and defect outcomes.",
      filePath: "/datasets/defect_prediction_train.csv",
      fileUrl: "https://storage.example.com/datasets/defect_prediction_train.csv",
      fileSize: 2097152, // 2 MB
      recordCount: 15000,
      features: JSON.stringify(["sensor_1", "sensor_2", "sensor_3", "temperature", "speed", "pressure", "has_defect"]),
      targetColumn: "has_defect",
      dataType: "defect_prediction",
      uploadedBy: 1,
    },
    {
      name: "CPK Forecast Dataset - All Products",
      description: "Time series data of CPK values across all products and stations. Suitable for trend analysis and forecasting.",
      filePath: "/datasets/cpk_forecast_all.csv",
      fileUrl: "https://storage.example.com/datasets/cpk_forecast_all.csv",
      fileSize: 786432, // 768 KB
      recordCount: 8500,
      features: JSON.stringify(["product_code", "station_name", "date", "cpk", "cp", "mean", "std_dev", "sample_size"]),
      targetColumn: "cpk",
      dataType: "time_series",
      uploadedBy: 1,
    },
  ];

  for (const dataset of datasets) {
    await db.insert(aiTrainingDatasets).values(dataset);
  }

  console.log(`✅ Created ${datasets.length} AI training datasets`);
}

/**
 * Seed AI Training Jobs
 */
async function seedAiTrainingJobs() {
  console.log("🌱 Seeding AI Training Jobs...");
  const db = await getDb();

  const jobs = [
    {
      jobId: `job_${Date.now()}_1`,
      name: "PCB-001 CPK Prediction Model",
      description: "Train a regression model to predict CPK values based on process parameters",
      datasetId: 1,
      modelType: "cpk_forecast",
      algorithm: "linear_regression",
      hyperparameters: JSON.stringify({
        learning_rate: 0.001,
        epochs: 100,
        batch_size: 32,
        optimizer: "adam",
      }),
      status: "completed",
      progress: 100,
      currentEpoch: 100,
      totalEpochs: 100,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      metrics: JSON.stringify({
        final_loss: 0.0234,
        final_accuracy: 0.9567,
        mae: 0.0456,
        rmse: 0.0678,
        r2_score: 0.9234,
      }),
      createdBy: 1,
    },
    {
      jobId: `job_${Date.now()}_2`,
      name: "Defect Detection Neural Network",
      description: "Deep learning model for automated defect detection from sensor data",
      datasetId: 4,
      modelType: "anomaly_detection",
      algorithm: "neural_network",
      hyperparameters: JSON.stringify({
        learning_rate: 0.0001,
        epochs: 200,
        batch_size: 64,
        hidden_layers: [128, 64, 32],
        dropout: 0.3,
        optimizer: "adam",
      }),
      status: "running",
      progress: 65,
      currentEpoch: 130,
      totalEpochs: 200,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      metrics: JSON.stringify({
        current_loss: 0.1234,
        current_accuracy: 0.8945,
        val_loss: 0.1456,
        val_accuracy: 0.8723,
      }),
      createdBy: 1,
    },
    {
      jobId: `job_${Date.now()}_3`,
      name: "OEE Forecasting Model",
      description: "Time series forecasting model for predicting OEE trends",
      datasetId: 3,
      modelType: "quality_prediction",
      algorithm: "random_forest",
      hyperparameters: JSON.stringify({
        n_estimators: 100,
        max_depth: 10,
        min_samples_split: 5,
        random_state: 42,
      }),
      status: "completed",
      progress: 100,
      currentEpoch: 100,
      totalEpochs: 100,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 mins later
      metrics: JSON.stringify({
        final_loss: 0.0456,
        final_accuracy: 0.9234,
        mae: 0.0234,
        rmse: 0.0345,
        feature_importance: {
          availability: 0.35,
          performance: 0.28,
          quality: 0.22,
          downtime: 0.15,
        },
      }),
      createdBy: 1,
    },
    {
      jobId: `job_${Date.now()}_4`,
      name: "Quality Control Classifier",
      description: "Classification model for quality control pass/fail prediction",
      datasetId: 2,
      modelType: "quality_prediction",
      algorithm: "gradient_boosting",
      hyperparameters: JSON.stringify({
        learning_rate: 0.01,
        n_estimators: 150,
        max_depth: 8,
        subsample: 0.8,
      }),
      status: "failed",
      progress: 45,
      currentEpoch: 45,
      totalEpochs: 100,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 mins later
      errorMessage: "Training diverged: loss increased to NaN. Try reducing learning rate.",
      createdBy: 1,
    },
    {
      jobId: `job_${Date.now()}_5`,
      name: "CPK Trend Analysis - All Products",
      description: "Multi-product CPK trend analysis and forecasting model",
      datasetId: 5,
      modelType: "cpk_forecast",
      algorithm: "lstm",
      hyperparameters: JSON.stringify({
        learning_rate: 0.001,
        epochs: 150,
        batch_size: 32,
        lstm_units: [64, 32],
        dropout: 0.2,
        sequence_length: 30,
      }),
      status: "pending",
      progress: 0,
      currentEpoch: 0,
      totalEpochs: 150,
      createdBy: 1,
    },
  ];

  for (const job of jobs) {
    await db.insert(aiTrainingJobs).values(job);
  }

  console.log(`✅ Created ${jobs.length} AI training jobs`);
}

/**
 * Seed AI Training History
 */
async function seedAiTrainingHistory() {
  console.log("🌱 Seeding AI Training History...");
  const db = await getDb();

  // History for completed job (job 1)
  const job1History = [];
  for (let epoch = 1; epoch <= 100; epoch++) {
    const loss = 0.5 * Math.exp(-epoch / 20) + 0.02 + Math.random() * 0.01;
    const accuracy = 0.95 - 0.3 * Math.exp(-epoch / 15) + Math.random() * 0.02;
    job1History.push({
      trainingJobId: 1,
      epoch,
      loss: parseFloat(loss.toFixed(4)),
      accuracy: parseFloat(accuracy.toFixed(4)),
      valLoss: parseFloat((loss * 1.1 + Math.random() * 0.01).toFixed(4)),
      valAccuracy: parseFloat((accuracy * 0.98 + Math.random() * 0.01).toFixed(4)),
      learningRate: 0.001,
      duration: Math.floor(5 + Math.random() * 3), // 5-8 seconds per epoch
    });
  }

  // History for running job (job 2)
  const job2History = [];
  for (let epoch = 1; epoch <= 130; epoch++) {
    const loss = 0.8 * Math.exp(-epoch / 30) + 0.12 + Math.random() * 0.02;
    const accuracy = 0.92 - 0.4 * Math.exp(-epoch / 25) + Math.random() * 0.03;
    job2History.push({
      trainingJobId: 2,
      epoch,
      loss: parseFloat(loss.toFixed(4)),
      accuracy: parseFloat(accuracy.toFixed(4)),
      valLoss: parseFloat((loss * 1.15 + Math.random() * 0.02).toFixed(4)),
      valAccuracy: parseFloat((accuracy * 0.97 + Math.random() * 0.02).toFixed(4)),
      learningRate: 0.0001,
      duration: Math.floor(8 + Math.random() * 4), // 8-12 seconds per epoch
    });
  }

  // History for completed job (job 3)
  const job3History = [];
  for (let epoch = 1; epoch <= 100; epoch++) {
    const loss = 0.4 * Math.exp(-epoch / 18) + 0.045 + Math.random() * 0.01;
    const accuracy = 0.93 - 0.25 * Math.exp(-epoch / 12) + Math.random() * 0.015;
    job3History.push({
      trainingJobId: 3,
      epoch,
      loss: parseFloat(loss.toFixed(4)),
      accuracy: parseFloat(accuracy.toFixed(4)),
      learningRate: 0.01,
      duration: Math.floor(3 + Math.random() * 2), // 3-5 seconds per epoch
    });
  }

  // History for failed job (job 4) - diverged at epoch 45
  const job4History = [];
  for (let epoch = 1; epoch <= 45; epoch++) {
    let loss, accuracy;
    if (epoch < 40) {
      loss = 0.6 * Math.exp(-epoch / 20) + 0.08 + Math.random() * 0.02;
      accuracy = 0.88 - 0.3 * Math.exp(-epoch / 15) + Math.random() * 0.03;
    } else {
      // Divergence starts
      loss = 0.2 * Math.exp((epoch - 40) / 2) + Math.random() * 0.5;
      accuracy = 0.88 - (epoch - 40) * 0.05 + Math.random() * 0.1;
    }
    job4History.push({
      trainingJobId: 4,
      epoch,
      loss: epoch === 45 ? NaN : parseFloat(loss.toFixed(4)),
      accuracy: parseFloat(Math.max(0, accuracy).toFixed(4)),
      learningRate: 0.01,
      duration: Math.floor(4 + Math.random() * 2),
    });
  }

  const allHistory = [...job1History, ...job2History, ...job3History, ...job4History];

  // Batch insert for better performance
  const batchSize = 50;
  for (let i = 0; i < allHistory.length; i += batchSize) {
    const batch = allHistory.slice(i, i + batchSize);
    await db.insert(aiTrainingHistory).values(batch);
    console.log(`   Inserted ${Math.min(i + batchSize, allHistory.length)}/${allHistory.length} records`);
  }

  console.log(`✅ Created ${allHistory.length} training history records`);
}

/**
 * Seed AI Trained Models
 */
async function seedAiTrainedModels() {
  console.log("🌱 Seeding AI Trained Models...");
  const db = await getDb();

  const models = [
    {
      modelId: `model_${Date.now()}_1`,
      trainingJobId: 1,
      name: "PCB-001 CPK Predictor v1.0",
      description: "Production-ready CPK prediction model for PCB-001",
      modelType: "cpk_forecast",
      algorithm: "linear_regression",
      version: "1.0.0",
      status: "active",
      accuracy: 0.9567,
      metrics: JSON.stringify({
        mae: 0.0456,
        rmse: 0.0678,
        r2_score: 0.9234,
        test_accuracy: 0.9512,
        training_time_seconds: 300,
      }),
      modelPath: "/models/pcb001_cpk_v1.0.h5",
      modelSize: 2048576, // 2 MB
      inputFeatures: JSON.stringify(["measurement_value", "usl", "lsl", "target", "mean", "std_dev"]),
      outputFormat: JSON.stringify({ type: "regression", unit: "cpk_value" }),
      deployedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    },
    {
      modelId: `model_${Date.now()}_2`,
      trainingJobId: 3,
      name: "OEE Forecaster v2.1",
      description: "Random Forest model for OEE trend forecasting",
      modelType: "quality_prediction",
      algorithm: "random_forest",
      version: "2.1.0",
      status: "active",
      accuracy: 0.9234,
      metrics: JSON.stringify({
        mae: 0.0234,
        rmse: 0.0345,
        mape: 2.45,
        feature_importance: {
          availability: 0.35,
          performance: 0.28,
          quality: 0.22,
          downtime: 0.15,
        },
        training_time_seconds: 1800,
      }),
      modelPath: "/models/oee_forecast_v2.1.pkl",
      modelSize: 5242880, // 5 MB
      inputFeatures: JSON.stringify(["availability", "performance", "quality", "downtime_minutes"]),
      outputFormat: JSON.stringify({ type: "time_series", horizon: "7_days" }),
      deployedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    },
    {
      modelId: `model_${Date.now()}_3`,
      trainingJobId: 2,
      name: "Defect Detection CNN v1.5",
      description: "Convolutional Neural Network for visual defect detection",
      modelType: "defect_detection",
      algorithm: "cnn",
      version: "1.5.0",
      status: "active",
      accuracy: 0.9678,
      metrics: JSON.stringify({
        precision: 0.9456,
        recall: 0.9234,
        f1_score: 0.9344,
        confusion_matrix: [[850, 50], [70, 830]],
        training_time_seconds: 3600,
      }),
      modelPath: "/models/defect_cnn_v1.5.h5",
      modelSize: 15728640, // 15 MB
      inputFeatures: JSON.stringify(["image_data", "brightness", "contrast", "resolution"]),
      outputFormat: JSON.stringify({ type: "classification", classes: ["ok", "defect"] }),
      deployedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    },
    {
      modelId: `model_${Date.now()}_4`,
      trainingJobId: 4,
      name: "Anomaly Detector LSTM v3.0",
      description: "LSTM-based anomaly detection for time series data",
      modelType: "anomaly_detection",
      algorithm: "lstm",
      version: "3.0.0",
      status: "active",
      accuracy: 0.8912,
      metrics: JSON.stringify({
        precision: 0.8756,
        recall: 0.8634,
        f1_score: 0.8695,
        false_positive_rate: 0.045,
        training_time_seconds: 2400,
      }),
      modelPath: "/models/anomaly_lstm_v3.0.h5",
      modelSize: 8388608, // 8 MB
      inputFeatures: JSON.stringify(["sequence_data", "timestamp", "sensor_values"]),
      outputFormat: JSON.stringify({ type: "binary_classification", threshold: 0.5 }),
      deployedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    },
    {
      modelId: `model_${Date.now()}_5`,
      trainingJobId: 5,
      name: "Production Optimizer XGBoost v2.0",
      description: "XGBoost model for production line optimization",
      modelType: "cpk_forecast",
      algorithm: "xgboost",
      version: "2.0.0",
      status: "testing",
      accuracy: 0.9123,
      metrics: JSON.stringify({
        mae: 0.0567,
        rmse: 0.0789,
        r2_score: 0.8956,
        feature_importance: {
          temperature: 0.28,
          pressure: 0.24,
          speed: 0.22,
          humidity: 0.15,
          material_quality: 0.11,
        },
        training_time_seconds: 600,
      }),
      modelPath: "/models/production_xgboost_v2.0.pkl",
      modelSize: 3145728, // 3 MB
      inputFeatures: JSON.stringify(["temperature", "pressure", "speed", "humidity", "material_quality"]),
      outputFormat: JSON.stringify({ type: "regression", unit: "cpk_value" }),
      deployedAt: null,
      createdBy: 1,
    },
  ];

  for (const model of models) {
    await db.insert(aiTrainedModels).values(model);
  }

  console.log(`✅ Created ${models.length} trained AI models`);
}

/**
 * Main seed function
 */
export async function seedAiData() {
  try {
    console.log("🚀 Starting AI data seeding...\n");

    await seedAiDatasets();
    await seedAiTrainingJobs();
    await seedAiTrainingHistory();
    await seedAiTrainedModels();

    console.log("\n✅ AI data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding AI data:", error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAiData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
