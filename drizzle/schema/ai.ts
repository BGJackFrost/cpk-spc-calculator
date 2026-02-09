import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


// === AI Domain Tables ===

export const aiAbTestResults = mysqlTable("ai_ab_test_results", {
	id: int().autoincrement().notNull(),
	testId: int("test_id").notNull(),
	modelId: int("model_id").notNull(),
	predictionId: int("prediction_id"),
	inputData: json("input_data"),
	predictedValue: decimal("predicted_value", { precision: 15, scale: 6 }),
	actualValue: decimal("actual_value", { precision: 15, scale: 6 }),
	error: decimal({ precision: 15, scale: 6 }),
	errorPercent: decimal("error_percent", { precision: 10, scale: 4 }),
	responseTime: int("response_time"),
	isCorrect: int("is_correct"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_test_model").on(table.testId, table.modelId),
	index("idx_created_at").on(table.createdAt),
]);


export const aiAbTestStats = mysqlTable("ai_ab_test_stats", {
	id: int().autoincrement().notNull(),
	testId: int("test_id").notNull(),
	modelId: int("model_id").notNull(),
	totalPredictions: int("total_predictions").default(0).notNull(),
	correctPredictions: int("correct_predictions").default(0).notNull(),
	accuracy: decimal({ precision: 10, scale: 6 }),
	meanError: decimal("mean_error", { precision: 15, scale: 6 }),
	meanAbsoluteError: decimal("mean_absolute_error", { precision: 15, scale: 6 }),
	rootMeanSquaredError: decimal("root_mean_squared_error", { precision: 15, scale: 6 }),
	avgResponseTime: int("avg_response_time"),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_test_model_unique").on(table.testId, table.modelId),
]);


export const aiAbTests = mysqlTable("ai_ab_tests", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	modelAId: int("model_a_id").notNull(),
	modelBId: int("model_b_id").notNull(),
	trafficSplitA: int("traffic_split_a").default(50).notNull(),
	trafficSplitB: int("traffic_split_b").default(50).notNull(),
	status: mysqlEnum(['draft','running','paused','completed','cancelled']).default('draft').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	winnerModelId: int("winner_model_id"),
	winnerReason: text("winner_reason"),
	minSampleSize: int("min_sample_size").default(100).notNull(),
	confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }).default('0.95'),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const aiAnomalyModels = mysqlTable("ai_anomaly_models", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	modelType: mysqlEnum("model_type", ['isolation_forest','autoencoder','lstm','statistical','ensemble']).notNull(),
	targetMetric: varchar("target_metric", { length: 100 }).default('cpk'),
	productionLineId: int("production_line_id"),
	machineId: int("machine_id"),
	parameters: text(),
	trainingData: text("training_data"),
	accuracy: decimal({ precision: 5, scale: 2 }),
	precisionScore: decimal("precision_score", { precision: 5, scale: 2 }),
	recallVal: decimal("recall_val", { precision: 5, scale: 2 }),
	f1Score: decimal("f1_score", { precision: 5, scale: 2 }),
	version: varchar({ length: 20 }).default('1.0').notNull(),
	status: mysqlEnum(['training','active','inactive','deprecated']).default('inactive').notNull(),
	lastTrainedAt: timestamp("last_trained_at", { mode: 'string' }),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	trainedAt: datetime("trained_at", { mode: 'string'}),
});


export const aiAutoScalingConfigs = mysqlTable("ai_auto_scaling_configs", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	enabled: int().default(0).notNull(),
	algorithm: mysqlEnum(['moving_average','percentile','std_deviation','adaptive']).default('adaptive').notNull(),
	windowSize: int("window_size").default(100).notNull(),
	sensitivityFactor: decimal("sensitivity_factor", { precision: 5, scale: 2 }).default('1.00').notNull(),
	minThreshold: decimal("min_threshold", { precision: 5, scale: 4 }).default('0.0100').notNull(),
	maxThreshold: decimal("max_threshold", { precision: 5, scale: 4 }).default('0.5000').notNull(),
	updateFrequency: mysqlEnum("update_frequency", ['hourly','daily','weekly']).default('daily').notNull(),
	lastCalculatedThresholds: json("last_calculated_thresholds"),
	lastUpdated: timestamp("last_updated", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const aiDriftAlerts = mysqlTable("ai_drift_alerts", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	modelVersionId: int("model_version_id"),
	alertType: mysqlEnum("alert_type", ['accuracy_drop','data_drift','concept_drift','prediction_drift','feature_drift','performance_degradation']).notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	currentValue: decimal("current_value", { precision: 15, scale: 6 }),
	baselineValue: decimal("baseline_value", { precision: 15, scale: 6 }),
	threshold: decimal({ precision: 15, scale: 6 }),
	changePercent: decimal("change_percent", { precision: 10, scale: 4 }),
	affectedFeatures: json("affected_features"),
	driftScore: decimal("drift_score", { precision: 10, scale: 6 }),
	pValue: decimal("p_value", { precision: 10, scale: 8 }),
	sampleSize: int("sample_size"),
	windowStart: timestamp("window_start", { mode: 'string' }),
	windowEnd: timestamp("window_end", { mode: 'string' }),
	status: mysqlEnum(['new','acknowledged','investigating','resolved','ignored']).default('new').notNull(),
	resolvedBy: int("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolution: text(),
	autoRetrainTriggered: int("auto_retrain_triggered").default(0).notNull(),
	retrainJobId: int("retrain_job_id"),
	notificationSent: int("notification_sent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_model_status").on(table.modelId, table.status),
	index("idx_severity").on(table.severity),
	index("idx_created_at").on(table.createdAt),
]);


export const aiDriftConfigs = mysqlTable("ai_drift_configs", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	isEnabled: int("is_enabled").default(1).notNull(),
	accuracyDropThreshold: decimal("accuracy_drop_threshold", { precision: 10, scale: 4 }).default('0.05'),
	accuracyDropWindow: int("accuracy_drop_window").default(24).notNull(),
	dataDriftThreshold: decimal("data_drift_threshold", { precision: 10, scale: 4 }).default('0.1'),
	dataDriftCheckInterval: int("data_drift_check_interval").default(6).notNull(),
	predictionDriftThreshold: decimal("prediction_drift_threshold", { precision: 10, scale: 4 }).default('0.1'),
	featureDriftThreshold: decimal("feature_drift_threshold", { precision: 10, scale: 4 }).default('0.15'),
	monitoredFeatures: json("monitored_features"),
	autoRetrainEnabled: int("auto_retrain_enabled").default(0).notNull(),
	autoRetrainOnAccuracyDrop: int("auto_retrain_on_accuracy_drop").default(1).notNull(),
	autoRetrainOnDataDrift: int("auto_retrain_on_data_drift").default(0).notNull(),
	minSamplesForRetrain: int("min_samples_for_retrain").default(1000).notNull(),
	notifyOnLow: int("notify_on_low").default(0).notNull(),
	notifyOnMedium: int("notify_on_medium").default(1).notNull(),
	notifyOnHigh: int("notify_on_high").default(1).notNull(),
	notifyOnCritical: int("notify_on_critical").default(1).notNull(),
	notificationEmails: json("notification_emails"),
	notificationWebhook: varchar("notification_webhook", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_model_unique").on(table.modelId),
]);


export const aiDriftMetricsHistory = mysqlTable("ai_drift_metrics_history", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	modelVersionId: int("model_version_id"),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	metricValue: decimal("metric_value", { precision: 15, scale: 6 }).notNull(),
	baselineValue: decimal("baseline_value", { precision: 15, scale: 6 }),
	threshold: decimal({ precision: 15, scale: 6 }),
	isAnomaly: int("is_anomaly").default(0).notNull(),
	sampleSize: int("sample_size"),
	windowStart: timestamp("window_start", { mode: 'string' }),
	windowEnd: timestamp("window_end", { mode: 'string' }),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	accuracy: decimal({ precision: 10, scale: 6 }),
	accuracyDrop: decimal("accuracy_drop", { precision: 10, scale: 6 }),
	featureDrift: decimal("feature_drift", { precision: 10, scale: 6 }),
	predictionDrift: decimal("prediction_drift", { precision: 10, scale: 6 }),
	severity: varchar({ length: 20 }),
	timestamp: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
},
(table) => [
	index("idx_model_metric").on(table.modelId, table.metricType),
	index("idx_created_at").on(table.createdAt),
]);


export const aiFeatureStatistics = mysqlTable("ai_feature_statistics", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	featureName: varchar("feature_name", { length: 255 }).notNull(),
	statisticType: mysqlEnum("statistic_type", ['baseline','current']).notNull(),
	mean: decimal({ precision: 15, scale: 6 }),
	stdDev: decimal("std_dev", { precision: 15, scale: 6 }),
	minValue: decimal("min_value", { precision: 15, scale: 6 }),
	maxValue: decimal("max_value", { precision: 15, scale: 6 }),
	median: decimal({ precision: 15, scale: 6 }),
	q1: decimal({ precision: 15, scale: 6 }),
	q3: decimal({ precision: 15, scale: 6 }),
	skewness: decimal({ precision: 10, scale: 6 }),
	kurtosis: decimal({ precision: 10, scale: 6 }),
	nullCount: int("null_count"),
	uniqueCount: int("unique_count"),
	histogram: json(),
	sampleSize: int("sample_size"),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_model_feature").on(table.modelId, table.featureName),
	index("idx_statistic_type").on(table.modelId, table.statisticType),
]);


export const aiMlModels = mysqlTable("ai_ml_models", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	modelType: varchar("model_type", { length: 100 }).notNull(),
	targetMetric: varchar("target_metric", { length: 100 }),
	status: mysqlEnum(['draft','training','active','inactive','deprecated']).default('draft').notNull(),
	accuracy: decimal({ precision: 10, scale: 6 }),
	precision: decimal({ precision: 10, scale: 6 }),
	recall: decimal({ precision: 10, scale: 6 }),
	f1Score: decimal("f1_score", { precision: 10, scale: 6 }),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const aiMlPredictions = mysqlTable("ai_ml_predictions", {
	id: int().autoincrement().notNull(),
	predictionId: varchar("prediction_id", { length: 64 }).notNull(),
	modelId: varchar("model_id", { length: 64 }).notNull(),
	modelName: varchar("model_name", { length: 100 }),
	modelVersion: varchar("model_version", { length: 20 }),
	predictionType: varchar("prediction_type", { length: 50 }).notNull(),
	inputData: text("input_data"),
	outputData: text("output_data"),
	confidence: decimal({ precision: 5, scale: 4 }),
	probability: decimal({ precision: 5, scale: 4 }),
	predictedValue: decimal("predicted_value", { precision: 15, scale: 4 }),
	actualValue: decimal("actual_value", { precision: 15, scale: 4 }),
	error: decimal({ precision: 15, scale: 4 }),
	isCorrect: int("is_correct"),
	latency: int(),
	featureImportance: text("feature_importance"),
	explanation: text(),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("ai_ml_predictions_prediction_id_unique").on(table.predictionId),
]);


export const aiModelPredictions = mysqlTable("ai_model_predictions", {
	id: int().autoincrement().notNull(),
	predictionId: varchar("prediction_id", { length: 64 }).notNull(),
	modelId: int("model_id").notNull(),
	productCode: varchar("product_code", { length: 100 }),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	fixtureId: int("fixture_id"),
	inputData: text("input_data").notNull(),
	inputFeatures: text("input_features"),
	predictionType: mysqlEnum("prediction_type", ['cpk_forecast','anomaly_score','root_cause','quality_score','failure_probability']).notNull(),
	predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
	predictedLabel: varchar("predicted_label", { length: 255 }),
	predictionDetails: text("prediction_details"),
	confidence: decimal({ precision: 5, scale: 2 }),
	confidenceInterval: text("confidence_interval"),
	uncertainty: decimal({ precision: 5, scale: 4 }),
	forecastHorizon: int("forecast_horizon"),
	forecastValues: text("forecast_values"),
	isAnomaly: int("is_anomaly").default(0),
	anomalyScore: decimal("anomaly_score", { precision: 5, scale: 4 }),
	anomalyReason: text("anomaly_reason"),
	rootCauses: text("root_causes"),
	recommendations: text(),
	actualValue: decimal("actual_value", { precision: 10, scale: 4 }),
	feedbackStatus: mysqlEnum("feedback_status", ['pending','correct','incorrect','partial']),
	feedbackNotes: text("feedback_notes"),
	feedbackBy: int("feedback_by"),
	feedbackAt: timestamp("feedback_at", { mode: 'string' }),
	predictionError: decimal("prediction_error", { precision: 10, scale: 4 }),
	processingTimeMs: int("processing_time_ms"),
	requestedBy: int("requested_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("prediction_id").on(table.predictionId),
	index("idx_ai_model_predictions_model_id").on(table.modelId),
	index("idx_ai_model_predictions_created_at").on(table.createdAt),
]);


export const aiModelRollbackHistory = mysqlTable("ai_model_rollback_history", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	fromVersionId: int("from_version_id").notNull(),
	toVersionId: int("to_version_id").notNull(),
	reason: text().notNull(),
	rollbackType: mysqlEnum("rollback_type", ['manual','automatic']).default('manual').notNull(),
	triggeredBy: varchar("triggered_by", { length: 100 }),
	performedBy: int("performed_by"),
	status: mysqlEnum(['pending','in_progress','completed','failed']).default('pending').notNull(),
	errorMessage: text("error_message"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_model_id").on(table.modelId),
	index("idx_created_at").on(table.createdAt),
]);


export const aiModelVersions = mysqlTable("ai_model_versions", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	version: varchar({ length: 50 }).notNull(),
	versionNumber: int("version_number").notNull(),
	modelData: json("model_data"),
	modelPath: varchar("model_path", { length: 500 }),
	modelSize: int("model_size"),
	trainingJobId: int("training_job_id"),
	accuracy: decimal({ precision: 10, scale: 6 }),
	precisionScore: decimal("precision_score", { precision: 10, scale: 6 }),
	recall: decimal({ precision: 10, scale: 6 }),
	f1Score: decimal("f1_score", { precision: 10, scale: 6 }),
	meanAbsoluteError: decimal("mean_absolute_error", { precision: 15, scale: 6 }),
	rootMeanSquaredError: decimal("root_mean_squared_error", { precision: 15, scale: 6 }),
	trainingDataSize: int("training_data_size"),
	validationDataSize: int("validation_data_size"),
	hyperparameters: json(),
	featureImportance: json("feature_importance"),
	isActive: int("is_active").default(0).notNull(),
	isRollbackTarget: int("is_rollback_target").default(0).notNull(),
	deployedAt: timestamp("deployed_at", { mode: 'string' }),
	retiredAt: timestamp("retired_at", { mode: 'string' }),
	changeLog: text("change_log"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_model_version").on(table.modelId, table.versionNumber),
	index("idx_active").on(table.modelId, table.isActive),
]);


export const aiPredictionAccuracyStats = mysqlTable("ai_prediction_accuracy_stats", {
	id: int().autoincrement().notNull(),
	periodType: mysqlEnum("period_type", ['daily','weekly','monthly']).notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	predictionType: mysqlEnum("prediction_type", ['cpk','oee','defect_rate','trend']).notNull(),
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	totalPredictions: int("total_predictions").default(0).notNull(),
	verifiedPredictions: int("verified_predictions").default(0).notNull(),
	mae: decimal({ precision: 15, scale: 6 }),
	rmse: decimal({ precision: 15, scale: 6 }),
	mape: decimal({ precision: 10, scale: 4 }),
	r2Score: decimal("r2_score", { precision: 5, scale: 4 }),
	withinConfidenceRate: decimal("within_confidence_rate", { precision: 5, scale: 2 }),
	trendAccuracy: decimal("trend_accuracy", { precision: 5, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_pred_acc_period").on(table.periodType, table.periodStart),
	index("idx_ai_pred_acc_type").on(table.predictionType),
]);


export const aiPredictionHistory = mysqlTable("ai_prediction_history", {
	id: int().autoincrement().notNull(),
	predictionType: mysqlEnum("prediction_type", ['cpk','oee','defect_rate','trend']).notNull(),
	modelId: int("model_id"),
	modelName: varchar("model_name", { length: 100 }),
	modelVersion: varchar("model_version", { length: 50 }),
	productId: int("product_id"),
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	predictedValue: decimal("predicted_value", { precision: 15, scale: 6 }).notNull(),
	predictedAt: timestamp("predicted_at", { mode: 'string' }).notNull(),
	forecastHorizon: int("forecast_horizon").default(7),
	confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),
	confidenceLower: decimal("confidence_lower", { precision: 15, scale: 6 }),
	confidenceUpper: decimal("confidence_upper", { precision: 15, scale: 6 }),
	actualValue: decimal("actual_value", { precision: 15, scale: 6 }),
	actualRecordedAt: timestamp("actual_recorded_at", { mode: 'string' }),
	absoluteError: decimal("absolute_error", { precision: 15, scale: 6 }),
	percentError: decimal("percent_error", { precision: 10, scale: 4 }),
	squaredError: decimal("squared_error", { precision: 20, scale: 8 }),
	isWithinConfidence: int("is_within_confidence"),
	status: mysqlEnum(['pending','verified','expired']).default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_pred_hist_type").on(table.predictionType),
	index("idx_ai_pred_hist_product").on(table.productId),
	index("idx_ai_pred_hist_line").on(table.productionLineId),
	index("idx_ai_pred_hist_predicted_at").on(table.predictedAt),
	index("idx_ai_pred_hist_status").on(table.status),
]);


export const aiPredictionReports = mysqlTable("ai_prediction_reports", {
	id: int().autoincrement().notNull(),
	reportId: varchar("report_id", { length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	modelId: int("model_id"),
	productCode: varchar("product_code", { length: 100 }),
	workstationId: int("workstation_id"),
	dateFrom: timestamp("date_from", { mode: 'string' }),
	dateTo: timestamp("date_to", { mode: 'string' }),
	reportType: mysqlEnum("report_type", ['forecast','anomaly','root_cause','performance','summary']).notNull(),
	format: mysqlEnum(['pdf','excel','html','json']).default('pdf').notNull(),
	filePath: varchar("file_path", { length: 500 }),
	fileSize: bigint("file_size", { mode: "number" }),
	summaryData: text("summary_data"),
	chartData: text("chart_data"),
	tableData: text("table_data"),
	status: mysqlEnum(['generating','completed','failed']).default('generating').notNull(),
	errorMessage: text("error_message"),
	generatedBy: int("generated_by"),
	generatedAt: timestamp("generated_at", { mode: 'string' }),
	downloadCount: int("download_count").default(0).notNull(),
	lastDownloadedAt: timestamp("last_downloaded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("report_id").on(table.reportId),
	index("idx_ai_prediction_reports_status").on(table.status),
]);


export const aiPredictionThresholds = mysqlTable("ai_prediction_thresholds", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	cpkWarning: decimal("cpk_warning", { precision: 5, scale: 3 }).default('1.330').notNull(),
	cpkCritical: decimal("cpk_critical", { precision: 5, scale: 3 }).default('1.000').notNull(),
	cpkTarget: decimal("cpk_target", { precision: 5, scale: 3 }).default('1.670'),
	oeeWarning: decimal("oee_warning", { precision: 5, scale: 2 }).default('75.00').notNull(),
	oeeCritical: decimal("oee_critical", { precision: 5, scale: 2 }).default('60.00').notNull(),
	oeeTarget: decimal("oee_target", { precision: 5, scale: 2 }).default('85.00'),
	trendDeclineWarning: decimal("trend_decline_warning", { precision: 5, scale: 2 }).default('5.00'),
	trendDeclineCritical: decimal("trend_decline_critical", { precision: 5, scale: 2 }).default('10.00'),
	emailAlertEnabled: int("email_alert_enabled").default(1).notNull(),
	alertEmails: text("alert_emails"),
	webhookEnabled: int("webhook_enabled").default(0).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }),
	priority: int().default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_pred_thresh_product").on(table.productId),
	index("idx_ai_pred_thresh_line").on(table.productionLineId),
	index("idx_ai_pred_thresh_active").on(table.isActive),
]);


export const aiPredictions = mysqlTable("ai_predictions", {
	id: int().autoincrement().notNull(),
	modelId: int("model_id").notNull(),
	predictionType: mysqlEnum("prediction_type", ['anomaly','quality','maintenance','trend']).notNull(),
	targetId: int("target_id"),
	targetType: varchar("target_type", { length: 50 }),
	predictedValue: decimal("predicted_value", { precision: 20, scale: 6 }),
	actualValue: decimal("actual_value", { precision: 20, scale: 6 }),
	confidence: decimal({ precision: 5, scale: 2 }),
	isAnomaly: int("is_anomaly").default(0).notNull(),
	anomalyScore: decimal("anomaly_score", { precision: 5, scale: 2 }),
	explanation: text(),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	feedback: mysqlEnum(['correct','false_positive','false_negative']),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	feedbackBy: int("feedback_by"),
	feedbackAt: datetime("feedback_at", { mode: 'string'}),
	inputData: text("input_data"),
	prediction: text(),
});


export const aiPriorityModelConfigs = mysqlTable("ai_priority_model_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	modelType: mysqlEnum("model_type", ['llm','rule_based','hybrid']).default('hybrid').notNull(),
	llmPromptTemplate: text("llm_prompt_template"),
	featureWeights: text("feature_weights"),
	thresholds: text(),
	isActive: tinyint("is_active").default(0).notNull(),
	isDefault: tinyint("is_default").default(0).notNull(),
	accuracy: decimal({ precision: 5, scale: 2 }),
	lastTrainedAt: bigint("last_trained_at", { mode: "number" }),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_priority_model_active").on(table.isActive),
	index("idx_priority_model_default").on(table.isDefault),
]);


export const aiTrainedModels = mysqlTable("ai_trained_models", {
	id: int().autoincrement().notNull(),
	modelId: varchar("model_id", { length: 64 }).notNull(),
	trainingJobId: int("training_job_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	version: varchar({ length: 50 }).default('1.0.0').notNull(),
	modelType: mysqlEnum("model_type", ['cpk_forecast','anomaly_detection','root_cause','quality_prediction','custom']).notNull(),
	algorithm: varchar({ length: 100 }).notNull(),
	framework: varchar({ length: 100 }),
	modelPath: varchar("model_path", { length: 500 }),
	modelSize: bigint("model_size", { mode: "number" }),
	modelChecksum: varchar("model_checksum", { length: 64 }),
	accuracy: decimal({ precision: 5, scale: 2 }),
	precisionScore: decimal("precision_score", { precision: 5, scale: 4 }),
	recallScore: decimal("recall_score", { precision: 5, scale: 4 }),
	f1Score: decimal("f1_score", { precision: 5, scale: 4 }),
	mse: decimal({ precision: 10, scale: 6 }),
	mae: decimal({ precision: 10, scale: 6 }),
	r2Score: decimal("r2_score", { precision: 5, scale: 4 }),
	productCode: varchar("product_code", { length: 100 }),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	fixtureId: int("fixture_id"),
	status: mysqlEnum(['active','inactive','deprecated','archived']).default('active').notNull(),
	isDefault: int("is_default").default(0).notNull(),
	predictionCount: int("prediction_count").default(0).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	metadata: text(),
	tags: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("model_id").on(table.modelId),
	index("idx_ai_trained_models_status").on(table.status),
	index("idx_ai_trained_models_model_type").on(table.modelType),
]);


export const aiTrainingDatasets = mysqlTable("ai_training_datasets", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	filePath: varchar("file_path", { length: 500 }).notNull(),
	fileUrl: varchar("file_url", { length: 500 }),
	fileSize: bigint("file_size", { mode: "number" }),
	fileType: varchar("file_type", { length: 50 }),
	rowCount: int("row_count"),
	columnCount: int("column_count"),
	columnNames: text("column_names"),
	datasetType: mysqlEnum("dataset_type", ['cpk_forecast','anomaly_detection','quality_prediction','custom']).notNull(),
	productCode: varchar("product_code", { length: 100 }),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	fixtureId: int("fixture_id"),
	dateFrom: timestamp("date_from", { mode: 'string' }),
	dateTo: timestamp("date_to", { mode: 'string' }),
	status: mysqlEnum(['uploaded','processing','ready','failed']).default('uploaded').notNull(),
	validationStatus: mysqlEnum("validation_status", ['pending','valid','invalid']),
	validationErrors: text("validation_errors"),
	metadata: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_training_datasets_status").on(table.status),
	index("idx_ai_training_datasets_type").on(table.datasetType),
	index("idx_ai_training_datasets_created_at").on(table.createdAt),
]);


export const aiTrainingHistory = mysqlTable("ai_training_history", {
	id: int().autoincrement().notNull(),
	trainingJobId: int("training_job_id").notNull(),
	epoch: int().notNull(),
	trainingLoss: decimal("training_loss", { precision: 10, scale: 6 }),
	validationLoss: decimal("validation_loss", { precision: 10, scale: 6 }),
	accuracy: decimal({ precision: 5, scale: 2 }),
	learningRate: decimal("learning_rate", { precision: 10, scale: 8 }),
	metrics: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_ai_training_history_job_id").on(table.trainingJobId),
]);


export const aiTrainingJobs = mysqlTable("ai_training_jobs", {
	id: int().autoincrement().notNull(),
	jobId: varchar("job_id", { length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	modelType: mysqlEnum("model_type", ['cpk_forecast','anomaly_detection','root_cause','quality_prediction','custom']).notNull(),
	algorithm: varchar({ length: 100 }).notNull(),
	dataSource: varchar("data_source", { length: 255 }),
	productCode: varchar("product_code", { length: 100 }),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	fixtureId: int("fixture_id"),
	dateFrom: timestamp("date_from", { mode: 'string' }),
	dateTo: timestamp("date_to", { mode: 'string' }),
	parameters: text(),
	hyperparameters: text(),
	status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending').notNull(),
	progress: int().default(0).notNull(),
	currentEpoch: int("current_epoch").default(0),
	totalEpochs: int("total_epochs").default(100),
	trainingLoss: decimal("training_loss", { precision: 10, scale: 6 }),
	validationLoss: decimal("validation_loss", { precision: 10, scale: 6 }),
	accuracy: decimal({ precision: 5, scale: 2 }),
	mse: decimal({ precision: 10, scale: 6 }),
	mae: decimal({ precision: 10, scale: 6 }),
	r2Score: decimal("r2_score", { precision: 5, scale: 4 }),
	totalSamples: int("total_samples").default(0),
	trainingSamples: int("training_samples").default(0),
	validationSamples: int("validation_samples").default(0),
	testSamples: int("test_samples").default(0),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	estimatedTimeRemaining: int("estimated_time_remaining"),
	errorMessage: text("error_message"),
	errorStack: text("error_stack"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("job_id").on(table.jobId),
	index("idx_ai_training_jobs_status").on(table.status),
	index("idx_ai_training_jobs_model_type").on(table.modelType),
	index("idx_ai_training_jobs_created_at").on(table.createdAt),
]);


export const isolationForestModels = mysqlTable("isolation_forest_models", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	targetType: mysqlEnum("target_type", ['device', 'device_group', 'production_line', 'global']).notNull(),
	targetId: int("target_id"),
	sensorType: varchar("sensor_type", { length: 50 }),
	numTrees: int("num_trees").default(100),
	sampleSize: int("sample_size").default(256),
	contamination: decimal({ precision: 5, scale: 4 }).default('0.0100'),
	maxDepth: int("max_depth"),
	modelData: json("model_data"),
	featureStats: json("feature_stats"),
	status: mysqlEnum(['training', 'active', 'inactive', 'failed']).default('inactive'),
	accuracy: decimal({ precision: 5, scale: 4 }),
	precision: decimal({ precision: 5, scale: 4 }),
	recall: decimal({ precision: 5, scale: 4 }),
	f1Score: decimal("f1_score", { precision: 5, scale: 4 }),
	trainedAt: bigint("trained_at", { mode: 'number' }),
	trainingSamples: int("training_samples"),
	version: int().default(1),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_model_target").on(table.targetType, table.targetId),
	index("idx_model_status").on(table.status),
]);

// Anomaly Detections

export const anomalyDetections = mysqlTable("anomaly_detections", {
	id: int().autoincrement().notNull().primaryKey(),
	modelId: int("model_id").notNull(),
	deviceId: int("device_id"),
	timestamp: bigint({ mode: 'number' }).notNull(),
	value: decimal({ precision: 15, scale: 6 }).notNull(),
	anomalyScore: decimal("anomaly_score", { precision: 10, scale: 6 }).notNull(),
	isAnomaly: int("is_anomaly").default(0),
	anomalyType: mysqlEnum("anomaly_type", ['spike', 'drop', 'drift', 'noise', 'pattern', 'unknown']),
	severity: mysqlEnum(['low', 'medium', 'high', 'critical']).default('low'),
	confidence: decimal({ precision: 5, scale: 4 }),
	expectedMin: decimal("expected_min", { precision: 15, scale: 6 }),
	expectedMax: decimal("expected_max", { precision: 15, scale: 6 }),
	deviation: decimal({ precision: 10, scale: 4 }),
	acknowledged: int().default(0),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: bigint("acknowledged_at", { mode: 'number' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_anomaly_model").on(table.modelId),
	index("idx_anomaly_device").on(table.deviceId),
	index("idx_anomaly_timestamp").on(table.timestamp),
	index("idx_anomaly_severity").on(table.severity),
]);

// Anomaly Training Jobs

export const anomalyTrainingJobs = mysqlTable("anomaly_training_jobs", {
	id: int().autoincrement().notNull().primaryKey(),
	modelId: int("model_id").notNull(),
	status: mysqlEnum(['queued', 'running', 'completed', 'failed', 'cancelled']).default('queued'),
	startTime: bigint("start_time", { mode: 'number' }),
	endTime: bigint("end_time", { mode: 'number' }),
	trainingStartTime: bigint("training_start_time", { mode: 'number' }),
	trainingEndTime: bigint("training_end_time", { mode: 'number' }),
	samplesProcessed: int("samples_processed").default(0),
	progress: int().default(0),
	errorMessage: text("error_message"),
	metrics: json(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_job_model").on(table.modelId),
	index("idx_job_status").on(table.status),
]);


// Phase 22 - Scheduled CPK Jobs

export const aiVisionDashboardConfigs = mysqlTable("ai_vision_dashboard_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	// Dashboard layout
	layoutConfig: json("layout_config"), // Grid layout configuration
	// Widgets configuration
	widgets: json("widgets"), // Array of widget configs
	// Filters
	defaultProductionLineIds: json("default_production_line_ids"),
	defaultProductIds: json("default_product_ids"),
	defaultTimeRange: varchar("default_time_range", { length: 50 }).default('24h'), // 1h, 6h, 24h, 7d, 30d
	// Refresh settings
	autoRefresh: tinyint("auto_refresh").default(1).notNull(),
	refreshInterval: int("refresh_interval").default(60).notNull(), // seconds
	// Alert thresholds
	cpkWarningThreshold: decimal("cpk_warning_threshold", { precision: 5, scale: 2 }).default('1.33'),
	cpkCriticalThreshold: decimal("cpk_critical_threshold", { precision: 5, scale: 2 }).default('1.00'),
	ngRateWarningThreshold: decimal("ng_rate_warning_threshold", { precision: 5, scale: 2 }).default('5.00'), // percent
	ngRateCriticalThreshold: decimal("ng_rate_critical_threshold", { precision: 5, scale: 2 }).default('10.00'), // percent
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_vision_dashboard_user").on(table.userId),
]);


export type AiVisionDashboardConfig = typeof aiVisionDashboardConfigs.$inferSelect;

export type InsertAiVisionDashboardConfig = typeof aiVisionDashboardConfigs.$inferInsert;


// User Notifications - Thông báo cho người dùng (realtime)

export const aiImageComparisonResults = mysqlTable("ai_image_comparison_results", {
	id: int().autoincrement().notNull().primaryKey(),
	comparisonId: int("comparison_id"), // Reference to imageComparisons
	// Or direct image references
	image1Id: int("image1_id"),
	image2Id: int("image2_id"),
	image1Url: varchar("image1_url", { length: 1000 }),
	image2Url: varchar("image2_url", { length: 1000 }),
	// Analysis request
	userId: int("user_id").notNull(),
	analysisType: mysqlEnum("analysis_type", ['difference', 'quality', 'defect', 'measurement', 'similarity']).default('difference').notNull(),
	// AI analysis results
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
	similarityScore: decimal("similarity_score", { precision: 5, scale: 2 }), // 0-100%
	differenceScore: decimal("difference_score", { precision: 5, scale: 2 }), // 0-100%
	// Detected differences
	differences: json(), // [{x, y, width, height, type, severity, description}]
	differencesCount: int("differences_count").default(0).notNull(),
	// AI analysis text
	aiSummary: text("ai_summary"),
	aiDetailedAnalysis: text("ai_detailed_analysis"),
	aiRecommendations: text("ai_recommendations"),
	// Highlighted regions
	highlightedRegions: json("highlighted_regions"), // [{x, y, width, height, color, label}]
	// Overlay image with differences marked
	differenceOverlayUrl: varchar("difference_overlay_url", { length: 1000 }),
	// Processing info
	processingTimeMs: int("processing_time_ms"),
	modelUsed: varchar("model_used", { length: 100 }),
	errorMessage: text("error_message"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => [
	index("idx_ai_comparison_user").on(table.userId),
	index("idx_ai_comparison_status").on(table.status),
	index("idx_ai_comparison_type").on(table.analysisType),
	index("idx_ai_comparison_created").on(table.createdAt),
]);


export type AiImageComparisonResult = typeof aiImageComparisonResults.$inferSelect;

export type InsertAiImageComparisonResult = typeof aiImageComparisonResults.$inferInsert;

// Annotation Templates - Mẫu annotation có thể tái sử dụng

export const aiImageAnalysisResults = mysqlTable("ai_image_analysis_results", {
	id: int().autoincrement().notNull().primaryKey(),
	inspectionId: int("inspection_id"),
	imageUrl: text("image_url").notNull(),
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'comparison', 'classification', 'measurement']).default('defect_detection').notNull(),
	result: json("result").notNull(), // Full AI analysis result
	confidence: decimal("confidence", { precision: 5, scale: 4 }),
	defectsFound: int("defects_found").default(0),
	processingTimeMs: int("processing_time_ms"),
	modelVersion: varchar("model_version", { length: 50 }),
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("idx_ai_analysis_inspection").on(table.inspectionId),
	index("idx_ai_analysis_type").on(table.analysisType),
]);

export type AiImageAnalysisResult = typeof aiImageAnalysisResults.$inferSelect;

export type InsertAiImageAnalysisResult = typeof aiImageAnalysisResults.$inferInsert;

// ============================================================
// Custom Alert Rules & History
// ============================================================
