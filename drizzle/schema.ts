import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, timestamp, index, json, decimal, text, mysqlEnum, datetime, bigint, tinyint, boolean, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const accountLockouts = mysqlTable("account_lockouts", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	username: varchar({ length: 100 }).notNull(),
	lockedAt: timestamp("locked_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	lockedUntil: timestamp("locked_until", { mode: 'string' }).notNull(),
	reason: varchar({ length: 255 }),
	failedAttempts: int("failed_attempts").default(0).notNull(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }),
	unlockedBy: int("unlocked_by"),
});

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

export const alertAnalytics = mysqlTable("alert_analytics", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	severity: mysqlEnum(['info','warning','critical']).default('info').notNull(),
	source: varchar({ length: 255 }),
	count: int().default(0).notNull(),
	resolvedCount: int("resolved_count").default(0).notNull(),
	totalResolutionTimeMs: bigint("total_resolution_time_ms", { mode: "number" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const alertEscalationLogs = mysqlTable("alert_escalation_logs", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	escalationLevel: int("escalation_level").notNull(),
	levelName: varchar("level_name", { length: 100 }).notNull(),
	notifiedEmails: text("notified_emails"),
	notifiedPhones: text("notified_phones"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const alertNotificationLogs = mysqlTable("alert_notification_logs", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	emailSent: int("email_sent").default(0).notNull(),
	emailError: text("email_error"),
	smsSent: int("sms_sent").default(0).notNull(),
	smsError: text("sms_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const alertPriorityHistory = mysqlTable("alert_priority_history", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	escalationHistoryId: int("escalation_history_id"),
	previousPriority: varchar("previous_priority", { length: 20 }),
	newPriority: mysqlEnum("new_priority", ['critical','high','medium','low']).notNull(),
	assignedBy: mysqlEnum("assigned_by", ['ai','rule','manual']).notNull(),
	aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
	aiReasoning: text("ai_reasoning"),
	matchedRuleIds: text("matched_rule_ids"),
	contextData: text("context_data"),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_priority_history_alert").on(table.alertId),
	index("idx_priority_history_escalation").on(table.escalationHistoryId),
	index("idx_priority_history_priority").on(table.newPriority),
	index("idx_priority_history_created").on(table.createdAt),
]);

export const alertPriorityRules = mysqlTable("alert_priority_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	condition: text().notNull(),
	priority: mysqlEnum(['critical','high','medium','low']).notNull(),
	weight: int().default(1).notNull(),
	autoAssign: tinyint("auto_assign").default(1).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_priority_rule_type").on(table.alertType),
	index("idx_priority_rule_active").on(table.isActive),
	index("idx_priority_rule_priority").on(table.priority),
]);

export const alertSettings = mysqlTable("alert_settings", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	cpkWarningThreshold: int().default(133).notNull(),
	cpkCriticalThreshold: int().default(100).notNull(),
	notifyOwner: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const alertWebhookConfigs = mysqlTable("alert_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	channelType: mysqlEnum("channel_type", ['slack','teams','email','discord','custom']).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }),
	emailRecipients: json("email_recipients"),
	emailSubjectTemplate: varchar("email_subject_template", { length: 255 }),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackBotToken: varchar("slack_bot_token", { length: 255 }),
	teamsWebhookUrl: varchar("teams_webhook_url", { length: 500 }),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	minSeverity: mysqlEnum("min_severity", ['info','warning','critical']).default('warning').notNull(),
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	isActive: int("is_active").default(1).notNull(),
	testMode: int("test_mode").default(0).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const alertWebhookLogs = mysqlTable("alert_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int("webhook_config_id").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertTitle: varchar("alert_title", { length: 255 }).notNull(),
	alertMessage: text("alert_message"),
	alertData: json("alert_data"),
	channelType: varchar("channel_type", { length: 20 }).notNull(),
	recipientInfo: varchar("recipient_info", { length: 255 }),
	status: mysqlEnum(['pending','sent','failed','rate_limited']).default('pending').notNull(),
	responseCode: int("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_webhook_config").on(table.webhookConfigId),
	index("idx_alert_type").on(table.alertType),
	index("idx_created_at").on(table.createdAt),
]);

export const analyticsCache = mysqlTable("analytics_cache", {
	id: int().autoincrement().notNull(),
	cacheKey: varchar("cache_key", { length: 255 }).notNull(),
	cacheType: varchar("cache_type", { length: 50 }).notNull(),
	data: text().notNull(),
	computedAt: timestamp("computed_at", { mode: 'string' }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	hitCount: int("hit_count").default(0).notNull(),
	lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("analytics_cache_cache_key_unique").on(table.cacheKey),
]);

export const apiRateLimits = mysqlTable("api_rate_limits", {
	id: int().autoincrement().notNull(),
	endpoint: varchar({ length: 255 }).notNull(),
	method: varchar({ length: 10 }).default('*').notNull(),
	windowMs: int("window_ms").default(60000).notNull(),
	maxRequests: int("max_requests").default(100).notNull(),
	userBased: int("user_based").default(1).notNull(),
	skipAuth: int("skip_auth").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const approvalHistories = mysqlTable("approval_histories", {
	id: int().autoincrement().notNull(),
	requestId: int().notNull(),
	stepId: int().notNull(),
	approverId: int().notNull(),
	action: mysqlEnum(['approved','rejected','returned']).notNull(),
	comments: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const approvalRequests = mysqlTable("approval_requests", {
	id: int().autoincrement().notNull(),
	workflowId: int().notNull(),
	entityType: mysqlEnum(['purchase_order','stock_export','maintenance_request','leave_request']).notNull(),
	entityId: int().notNull(),
	requesterId: int().notNull(),
	currentStepId: int(),
	status: mysqlEnum(['pending','approved','rejected','cancelled']).default('pending').notNull(),
	totalAmount: decimal({ precision: 15, scale: 2 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const approvalSteps = mysqlTable("approval_steps", {
	id: int().autoincrement().notNull(),
	workflowId: int().notNull(),
	stepOrder: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	approverType: mysqlEnum(['position','user','manager','department_head']).notNull(),
	approverId: int(),
	minAmount: decimal({ precision: 15, scale: 2 }),
	maxAmount: decimal({ precision: 15, scale: 2 }),
	isRequired: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const approvalWorkflows = mysqlTable("approval_workflows", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	entityType: mysqlEnum(['purchase_order','stock_export','maintenance_request','leave_request']).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	userName: varchar({ length: 255 }),
	action: mysqlEnum(['create','update','delete','login','logout','export','analyze']).notNull(),
	module: varchar({ length: 100 }).notNull(),
	tableName: varchar({ length: 100 }),
	recordId: int(),
	oldValue: text(),
	newValue: text(),
	description: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	authType: mysqlEnum(['local','online']).default('online'),
},
(table) => [
	index("idx_audit_logs_user_id").on(table.userId),
	index("idx_audit_logs_action").on(table.action),
	index("idx_audit_logs_created_at").on(table.createdAt),
	index("idx_audit_user").on(table.userId),
	index("idx_audit_action").on(table.action),
	index("idx_audit_date").on(table.createdAt),
	index("").on(table.action),
	index("idx_audit_logs_user").on(table.userId, table.createdAt),
	index("idx_audit_logs_module").on(table.module, table.createdAt),
	index("idx_audit_logs_created").on(table.createdAt),
	index("idx_audit_created").on(table.createdAt),
	index("idx_audit_user_created").on(table.userId, table.createdAt),
]);

export const autoResolveConfigs = mysqlTable("auto_resolve_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	checkIntervalMinutes: int("check_interval_minutes").default(5).notNull(),
	consecutiveOkCount: int("consecutive_ok_count").default(3).notNull(),
	metricThreshold: decimal("metric_threshold", { precision: 10, scale: 4 }),
	metricOperator: mysqlEnum("metric_operator", ['gt','gte','lt','lte','eq']).default('gte').notNull(),
	autoResolveAfterMinutes: int("auto_resolve_after_minutes"),
	notifyOnAutoResolve: int("notify_on_auto_resolve").default(1).notNull(),
	notifyEmails: text("notify_emails"),
	notifyPhones: text("notify_phones"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	isActive: int("is_active").default(1).notNull(),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	notificationChannels: varchar("notification_channels", { length: 255 }),
},
(table) => [
	index("idx_auto_resolve_type").on(table.alertType),
	index("idx_auto_resolve_active").on(table.isActive),
]);

export const autoResolveLogs = mysqlTable("auto_resolve_logs", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	escalationHistoryId: int("escalation_history_id").notNull(),
	alertId: int("alert_id").notNull(),
	resolveReason: varchar("resolve_reason", { length: 255 }).notNull(),
	metricValueAtResolve: decimal("metric_value_at_resolve", { precision: 10, scale: 4 }),
	consecutiveOkCount: int("consecutive_ok_count").default(0).notNull(),
	notificationsSent: int("notifications_sent").default(0).notNull(),
	notificationErrors: text("notification_errors"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	escalationId: int("escalation_id"),
	alertType: varchar("alert_type", { length: 50 }),
	reason: text(),
	metricValue: decimal("metric_value", { precision: 10, scale: 4 }),
	notificationSent: tinyint("notification_sent").default(0),
},
(table) => [
	index("idx_auto_resolve_log_config").on(table.configId),
	index("idx_auto_resolve_log_esc").on(table.escalationHistoryId),
	index("idx_auto_resolve_log_resolved").on(table.resolvedAt),
]);

export const batchOperationLogs = mysqlTable("batch_operation_logs", {
	id: int().autoincrement().notNull(),
	operationId: varchar("operation_id", { length: 64 }).notNull(),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending').notNull(),
	totalItems: int("total_items").default(0).notNull(),
	processedItems: int("processed_items").default(0).notNull(),
	successItems: int("success_items").default(0).notNull(),
	failedItems: int("failed_items").default(0).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	userId: int("user_id"),
	metadata: text(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("batch_operation_logs_operation_id_unique").on(table.operationId),
]);

export const caRules = mysqlTable("ca_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	formula: text(),
	example: text(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	minValue: int(),
	maxValue: int(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("ca_rules_code_unique").on(table.code),
]);

export const chartAnnotations = mysqlTable("chart_annotations", {
	id: int().autoincrement().notNull(),
	planId: int("plan_id"),
	mappingId: int("mapping_id"),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	annotationType: mysqlEnum("annotation_type", ['point','line','area','text','marker']).notNull(),
	xValue: decimal("x_value", { precision: 20, scale: 6 }),
	yValue: decimal("y_value", { precision: 20, scale: 6 }),
	xStart: decimal("x_start", { precision: 20, scale: 6 }),
	xEnd: decimal("x_end", { precision: 20, scale: 6 }),
	yStart: decimal("y_start", { precision: 20, scale: 6 }),
	yEnd: decimal("y_end", { precision: 20, scale: 6 }),
	label: varchar({ length: 255 }),
	description: text(),
	color: varchar({ length: 20 }).default('#ff0000'),
	style: text(),
	createdBy: int("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const companies = mysqlTable("companies", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	taxCode: varchar({ length: 50 }),
	logo: varchar({ length: 500 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const companyInfo = mysqlTable("company_info", {
	id: int().autoincrement().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	companyCode: varchar({ length: 50 }),
	address: text(),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	website: varchar({ length: 255 }),
	taxCode: varchar({ length: 50 }),
	logo: text(),
	industry: varchar({ length: 100 }),
	contactPerson: varchar({ length: 255 }),
	contactPhone: varchar({ length: 50 }),
	contactEmail: varchar({ length: 320 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const cpkRules = mysqlTable("cpk_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	minCpk: int(),
	maxCpk: int(),
	status: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 20 }),
	action: text(),
	severity: mysqlEnum(['info','warning','critical']).default('info').notNull(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("cpk_rules_code_unique").on(table.code),
]);

export const customThemes = mysqlTable("custom_themes", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: varchar({ length: 255 }),
	primaryColor: varchar("primary_color", { length: 50 }).notNull(),
	secondaryColor: varchar("secondary_color", { length: 50 }).notNull(),
	accentColor: varchar("accent_color", { length: 50 }).notNull(),
	backgroundColor: varchar("background_color", { length: 50 }).notNull(),
	foregroundColor: varchar("foreground_color", { length: 50 }).notNull(),
	mutedColor: varchar("muted_color", { length: 50 }),
	mutedForegroundColor: varchar("muted_foreground_color", { length: 50 }),
	lightVariables: text("light_variables"),
	darkVariables: text("dark_variables"),
	isPublic: int("is_public").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const customValidationRules = mysqlTable("custom_validation_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	productId: int(),
	workstationId: int(),
	ruleType: mysqlEnum(['range_check','trend_check','pattern_check','comparison_check','formula_check','custom_script']).default('range_check').notNull(),
	ruleConfig: text(),
	actionOnViolation: mysqlEnum(['warning','alert','reject','log_only']).default('warning').notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	violationMessage: text(),
	isActive: int().default(1).notNull(),
	priority: int().default(100).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dashboardConfigs = mysqlTable("dashboard_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).default('Default Dashboard').notNull(),
	displayCount: int().default(4).notNull(),
	refreshInterval: int().default(30).notNull(),
	layout: mysqlEnum(['grid','list']).default('grid').notNull(),
	isDefault: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dashboardLineSelections = mysqlTable("dashboard_line_selections", {
	id: int().autoincrement().notNull(),
	dashboardConfigId: int().notNull(),
	productionLineId: int().notNull(),
	displayOrder: int().default(0).notNull(),
	showXbarChart: int().default(1).notNull(),
	showRchart: int().default(1).notNull(),
	showCpk: int().default(1).notNull(),
	showMean: int().default(1).notNull(),
	showUclLcl: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const dataArchiveConfigs = mysqlTable("data_archive_configs", {
	id: int().autoincrement().notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	retentionDays: int("retention_days").default(365).notNull(),
	archiveEnabled: int("archive_enabled").default(1).notNull(),
	deleteAfterArchive: int("delete_after_archive").default(0).notNull(),
	lastArchiveAt: timestamp("last_archive_at", { mode: 'string' }),
	lastArchiveCount: int("last_archive_count").default(0),
	archiveLocation: varchar("archive_location", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("table_name").on(table.tableName),
]);

export const databaseBackups = mysqlTable("database_backups", {
	id: int().autoincrement().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	fileSize: int(),
	fileUrl: text(),
	backupType: mysqlEnum(['daily','weekly','manual']).default('manual').notNull(),
	status: mysqlEnum(['pending','completed','failed']).default('pending').notNull(),
	errorMessage: text(),
	storageLocation: mysqlEnum(['s3','local']).default('s3').notNull(),
	tablesIncluded: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
});

export const databaseConnections = mysqlTable("database_connections", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	connectionString: text().notNull(),
	databaseType: varchar({ length: 50 }).default('mysql').notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	host: varchar({ length: 255 }),
	port: int(),
	database: varchar({ length: 255 }),
	username: varchar({ length: 255 }),
	password: text(),
	filePath: text(),
	connectionOptions: text(),
	lastTestedAt: timestamp({ mode: 'string' }),
	lastTestStatus: varchar({ length: 50 }),
});

export const departments = mysqlTable("departments", {
	id: int().autoincrement().notNull(),
	companyId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	parentId: int(),
	managerId: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const downtimeReasons = mysqlTable("downtime_reasons", {
	id: int().autoincrement().notNull(),
	machineId: int("machine_id"),
	oeeDataId: int("oee_data_id"),
	reasonCode: varchar("reason_code", { length: 50 }).notNull(),
	reasonCategory: varchar("reason_category", { length: 100 }),
	reasonDescription: varchar("reason_description", { length: 500 }),
	durationMinutes: int("duration_minutes").notNull(),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const emailNotificationSettings = mysqlTable("email_notification_settings", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	email: varchar({ length: 320 }).notNull(),
	notifyOnSpcViolation: int().default(1).notNull(),
	notifyOnCaViolation: int().default(1).notNull(),
	notifyOnCpkViolation: int().default(1).notNull(),
	cpkThreshold: int().default(133).notNull(),
	notifyFrequency: mysqlEnum(['immediate','hourly','daily']).default('immediate').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const employeeProfiles = mysqlTable("employee_profiles", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	userType: mysqlEnum(['manus','local']).default('local').notNull(),
	employeeCode: varchar({ length: 50 }),
	companyId: int(),
	departmentId: int(),
	teamId: int(),
	positionId: int(),
	managerId: int(),
	phone: varchar({ length: 50 }),
	address: text(),
	dateOfBirth: timestamp({ mode: 'string' }),
	joinDate: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("userId").on(table.userId),
	index("employeeCode").on(table.employeeCode),
]);

export const erpIntegrationConfigs = mysqlTable("erp_integration_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	erpType: mysqlEnum("erp_type", ['sap','oracle','dynamics','custom']).notNull(),
	connectionUrl: varchar("connection_url", { length: 500 }).notNull(),
	authType: mysqlEnum("auth_type", ['basic','oauth2','api_key','certificate']).notNull(),
	credentials: text(),
	syncDirection: mysqlEnum("sync_direction", ['inbound','outbound','bidirectional']).notNull(),
	syncEntities: text("sync_entities"),
	syncSchedule: varchar("sync_schedule", { length: 50 }),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	lastSyncStatus: varchar("last_sync_status", { length: 50 }),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	syncInterval: int("sync_interval").default(3600),
	mappingConfig: text("mapping_config"),
});

export const errorLogs = mysqlTable("error_logs", {
	id: int().autoincrement().notNull(),
	errorId: varchar("error_id", { length: 64 }).notNull(),
	errorType: varchar("error_type", { length: 100 }).notNull(),
	errorCode: varchar("error_code", { length: 50 }),
	message: text().notNull(),
	stackTrace: text("stack_trace"),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	source: varchar({ length: 100 }),
	userId: int("user_id"),
	requestId: varchar("request_id", { length: 64 }),
	requestPath: varchar("request_path", { length: 500 }),
	requestMethod: varchar("request_method", { length: 10 }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	metadata: text(),
	isResolved: int("is_resolved").default(0).notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("error_logs_error_id_unique").on(table.errorId),
]);

export const escalationConfigs = mysqlTable("escalation_configs", {
	id: int().autoincrement().notNull(),
	level: int().notNull(),
	name: varchar({ length: 100 }).notNull(),
	timeoutMinutes: int("timeout_minutes").default(15).notNull(),
	notifyEmails: text("notify_emails"),
	notifyPhones: text("notify_phones"),
	notifyOwner: int("notify_owner").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("level").on(table.level),
]);

export const escalationHistory = mysqlTable("escalation_history", {
	id: int().autoincrement().notNull(),
	alertId: int("alert_id").notNull(),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	alertMessage: text("alert_message"),
	alertSeverity: mysqlEnum("alert_severity", ['info','warning','critical']).default('warning').notNull(),
	escalationLevel: int("escalation_level").notNull(),
	escalationLevelName: varchar("escalation_level_name", { length: 100 }).notNull(),
	escalationConfigId: int("escalation_config_id"),
	triggeredAt: timestamp("triggered_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
	acknowledgedBy: int("acknowledged_by"),
	resolvedAt: bigint("resolved_at", { mode: "number" }),
	resolvedBy: int("resolved_by"),
	resolutionNotes: text("resolution_notes"),
	autoResolved: int("auto_resolved").default(0).notNull(),
	autoResolveReason: varchar("auto_resolve_reason", { length: 255 }),
	emailsSent: int("emails_sent").default(0).notNull(),
	smsSent: int("sms_sent").default(0).notNull(),
	webhooksSent: int("webhooks_sent").default(0).notNull(),
	notifiedEmails: text("notified_emails"),
	notifiedPhones: text("notified_phones"),
	productionLineId: int("production_line_id"),
	machineId: int("machine_id"),
	productId: int("product_id"),
	metricValue: decimal("metric_value", { precision: 10, scale: 4 }),
	thresholdValue: decimal("threshold_value", { precision: 10, scale: 4 }),
	status: mysqlEnum(['active','acknowledged','resolved','auto_resolved','expired']).default('active').notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }),
	currentLevel: int("current_level").default(1),
	severity: varchar({ length: 20 }).default('medium'),
	alertTitle: varchar("alert_title", { length: 255 }),
	maxLevel: int("max_level").default(3),
	notificationsSent: int("notifications_sent").default(0),
	autoResolvedReason: text("auto_resolved_reason"),
	notes: text(),
	metadata: json(),
},
(table) => [
	index("idx_esc_hist_alert").on(table.alertId),
	index("idx_esc_hist_level").on(table.escalationLevel),
	index("idx_esc_hist_status").on(table.status),
	index("idx_esc_hist_triggered").on(table.triggeredAt),
	index("idx_esc_hist_line").on(table.productionLineId),
]);

export const escalationRealtimeStats = mysqlTable("escalation_realtime_stats", {
	id: int().autoincrement().notNull(),
	timestamp: bigint({ mode: "number" }).notNull(),
	intervalMinutes: int("interval_minutes").default(5).notNull(),
	totalAlerts: int("total_alerts").default(0).notNull(),
	criticalAlerts: int("critical_alerts").default(0).notNull(),
	highAlerts: int("high_alerts").default(0).notNull(),
	mediumAlerts: int("medium_alerts").default(0).notNull(),
	lowAlerts: int("low_alerts").default(0).notNull(),
	resolvedAlerts: int("resolved_alerts").default(0).notNull(),
	pendingAlerts: int("pending_alerts").default(0).notNull(),
	escalatedAlerts: int("escalated_alerts").default(0).notNull(),
	avgResolutionTimeMinutes: int("avg_resolution_time_minutes"),
	productionLineId: int("production_line_id"),
	alertType: varchar("alert_type", { length: 50 }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_realtime_stats_timestamp").on(table.timestamp),
	index("idx_realtime_stats_interval").on(table.intervalMinutes),
	index("idx_realtime_stats_line").on(table.productionLineId),
]);

export const escalationReportConfigs = mysqlTable("escalation_report_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
	dayOfWeek: int("day_of_week").default(1),
	dayOfMonth: int("day_of_month").default(1),
	timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
	timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh').notNull(),
	emailRecipients: json("email_recipients"),
	webhookConfigIds: json("webhook_config_ids"),
	includeStats: tinyint("include_stats").default(1).notNull(),
	includeTopAlerts: tinyint("include_top_alerts").default(1).notNull(),
	includeResolvedAlerts: tinyint("include_resolved_alerts").default(1).notNull(),
	includeTrends: tinyint("include_trends").default(1).notNull(),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	isActive: tinyint("is_active").default(1).notNull(),
	lastRunAt: bigint("last_run_at", { mode: "number" }),
	nextRunAt: bigint("next_run_at", { mode: "number" }),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_report_active").on(table.isActive),
	index("idx_esc_report_next_run").on(table.nextRunAt),
]);

export const escalationReportHistory = mysqlTable("escalation_report_history", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	reportPeriodStart: bigint("report_period_start", { mode: "number" }).notNull(),
	reportPeriodEnd: bigint("report_period_end", { mode: "number" }).notNull(),
	totalAlerts: int("total_alerts").default(0).notNull(),
	resolvedAlerts: int("resolved_alerts").default(0).notNull(),
	pendingAlerts: int("pending_alerts").default(0).notNull(),
	avgResolutionTimeMinutes: int("avg_resolution_time_minutes"),
	emailsSent: int("emails_sent").default(0).notNull(),
	webhooksSent: int("webhooks_sent").default(0).notNull(),
	status: mysqlEnum(['pending','sent','partial','failed']).default('pending').notNull(),
	errorMessage: text("error_message"),
	reportData: json("report_data"),
	sentAt: bigint("sent_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_report_hist_config").on(table.configId),
	index("idx_esc_report_hist_period").on(table.reportPeriodStart, table.reportPeriodEnd),
	index("idx_esc_report_hist_created").on(table.createdAt),
]);

export const escalationTemplates = mysqlTable("escalation_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	level1TimeoutMinutes: int("level1_timeout_minutes").default(15).notNull(),
	level1Emails: json("level1_emails"),
	level1Webhooks: json("level1_webhooks"),
	level1SmsEnabled: tinyint("level1_sms_enabled").default(0).notNull(),
	level1SmsPhones: json("level1_sms_phones"),
	level2TimeoutMinutes: int("level2_timeout_minutes").default(30).notNull(),
	level2Emails: json("level2_emails"),
	level2Webhooks: json("level2_webhooks"),
	level2SmsEnabled: tinyint("level2_sms_enabled").default(0).notNull(),
	level2SmsPhones: json("level2_sms_phones"),
	level3TimeoutMinutes: int("level3_timeout_minutes").default(60).notNull(),
	level3Emails: json("level3_emails"),
	level3Webhooks: json("level3_webhooks"),
	level3SmsEnabled: tinyint("level3_sms_enabled").default(0).notNull(),
	level3SmsPhones: json("level3_sms_phones"),
	alertTypes: json("alert_types"),
	productionLineIds: json("production_line_ids"),
	machineIds: json("machine_ids"),
	isDefault: tinyint("is_default").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_escalation_template_active").on(table.isActive),
	index("idx_escalation_template_default").on(table.isDefault),
]);

export const escalationWebhookConfigs = mysqlTable("escalation_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	channelType: mysqlEnum("channel_type", ['slack','teams','discord','custom']).notNull(),
	webhookUrl: varchar("webhook_url", { length: 500 }).notNull(),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackMentions: json("slack_mentions"),
	teamsTitle: varchar("teams_title", { length: 200 }),
	customHeaders: json("custom_headers"),
	customBodyTemplate: text("custom_body_template"),
	includeDetails: tinyint("include_details").default(1).notNull(),
	includeChart: tinyint("include_chart").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_webhook_active").on(table.isActive),
	index("idx_esc_webhook_type").on(table.channelType),
]);

export const escalationWebhookLogs = mysqlTable("escalation_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int("webhook_config_id").notNull(),
	escalationHistoryId: int("escalation_history_id"),
	escalationLevel: int("escalation_level").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertTitle: varchar("alert_title", { length: 255 }).notNull(),
	alertMessage: text("alert_message"),
	channelType: varchar("channel_type", { length: 20 }).notNull(),
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	success: tinyint().default(0).notNull(),
	errorMessage: text("error_message"),
	sentAt: bigint("sent_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_esc_webhook_log_config").on(table.webhookConfigId),
	index("idx_esc_webhook_log_history").on(table.escalationHistoryId),
	index("idx_esc_webhook_log_sent").on(table.sentAt),
]);

export const exportHistory = mysqlTable("export_history", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	exportType: varchar({ length: 20 }).notNull(),
	productCode: varchar({ length: 100 }),
	stationName: varchar({ length: 255 }),
	analysisType: varchar({ length: 50 }),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	sampleCount: int(),
	mean: int(),
	cpk: int(),
	fileName: varchar({ length: 255 }).notNull(),
	fileUrl: text(),
	fileSize: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const failedLoginAttempts = mysqlTable("failed_login_attempts", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 100 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	reason: varchar({ length: 255 }),
	attemptedAt: timestamp("attempted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const firebaseConfig = mysqlTable("firebase_config", {
	id: int().autoincrement().notNull(),
	projectId: varchar("project_id", { length: 255 }).notNull(),
	clientEmail: varchar("client_email", { length: 255 }).notNull(),
	privateKey: text("private_key").notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const firebaseDeviceTokens = mysqlTable("firebase_device_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 500 }).notNull(),
	deviceType: mysqlEnum("device_type", ['android','ios','web']).notNull(),
	deviceName: varchar("device_name", { length: 100 }),
	deviceModel: varchar("device_model", { length: 100 }),
	appVersion: varchar("app_version", { length: 20 }),
	isActive: tinyint("is_active").default(1).notNull(),
	lastUsedAt: bigint("last_used_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_device_token_user").on(table.userId),
	index("idx_device_token_active").on(table.isActive),
]);

export const firebasePushConfigs = mysqlTable("firebase_push_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	enablePush: tinyint("enable_push").default(1).notNull(),
	enableCriticalAlerts: tinyint("enable_critical_alerts").default(1).notNull(),
	enableHighAlerts: tinyint("enable_high_alerts").default(1).notNull(),
	enableMediumAlerts: tinyint("enable_medium_alerts").default(0).notNull(),
	enableLowAlerts: tinyint("enable_low_alerts").default(0).notNull(),
	quietHoursStart: varchar("quiet_hours_start", { length: 10 }),
	quietHoursEnd: varchar("quiet_hours_end", { length: 10 }),
	alertTypes: text("alert_types"),
	productionLineIds: text("production_line_ids"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_config_user").on(table.userId),
]);

export const firebasePushHistory = mysqlTable("firebase_push_history", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	deviceTokenId: int("device_token_id"),
	escalationHistoryId: int("escalation_history_id"),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	data: text(),
	priority: mysqlEnum(['critical','high','medium','low']).notNull(),
	status: mysqlEnum(['sent','delivered','failed','clicked']).notNull(),
	errorMessage: text("error_message"),
	sentAt: bigint("sent_at", { mode: "number" }).notNull(),
	deliveredAt: bigint("delivered_at", { mode: "number" }),
	clickedAt: bigint("clicked_at", { mode: "number" }),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_history_user").on(table.userId),
	index("idx_push_history_escalation").on(table.escalationHistoryId),
	index("idx_push_history_status").on(table.status),
	index("idx_push_history_sent").on(table.sentAt),
]);

export const firebasePushSettings = mysqlTable("firebase_push_settings", {
	id: int().autoincrement().notNull(),
	userId: varchar("user_id", { length: 100 }).notNull(),
	enabled: tinyint().default(1).notNull(),
	iotAlerts: tinyint("iot_alerts").default(1).notNull(),
	spcAlerts: tinyint("spc_alerts").default(1).notNull(),
	cpkAlerts: tinyint("cpk_alerts").default(1).notNull(),
	escalationAlerts: tinyint("escalation_alerts").default(1).notNull(),
	systemAlerts: tinyint("system_alerts").default(1).notNull(),
	criticalOnly: tinyint("critical_only").default(0).notNull(),
	quietHoursEnabled: tinyint("quiet_hours_enabled").default(0).notNull(),
	quietHoursStart: varchar("quiet_hours_start", { length: 10 }),
	quietHoursEnd: varchar("quiet_hours_end", { length: 10 }),
	productionLineIds: text("production_line_ids"),
	machineIds: text("machine_ids"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_push_settings_user").on(table.userId),
]);

export const firebaseTopicSubscriptions = mysqlTable("firebase_topic_subscriptions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	topicId: int("topic_id").notNull(),
	deviceTokenId: int("device_token_id").notNull(),
	subscribedAt: bigint("subscribed_at", { mode: "number" }).notNull(),
	unsubscribedAt: bigint("unsubscribed_at", { mode: "number" }),
	isActive: tinyint("is_active").default(1).notNull(),
},
(table) => [
	index("idx_subscription_user").on(table.userId),
	index("idx_subscription_topic").on(table.topicId),
	index("idx_subscription_active").on(table.isActive),
]);

export const firebaseTopics = mysqlTable("firebase_topics", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	topicKey: varchar("topic_key", { length: 100 }).notNull(),
	alertType: varchar("alert_type", { length: 50 }),
	productionLineId: int("production_line_id"),
	isActive: tinyint("is_active").default(1).notNull(),
	subscriberCount: int("subscriber_count").default(0).notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
},
(table) => [
	index("idx_topic_key").on(table.topicKey),
	index("idx_topic_active").on(table.isActive),
]);

export const fixtures = mysqlTable("fixtures", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	imageUrl: varchar({ length: 500 }),
	position: int().default(1).notNull(),
	status: mysqlEnum(['active','maintenance','inactive']).default('active').notNull(),
	installDate: timestamp({ mode: 'string' }),
	lastMaintenanceDate: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_fixtures_machine_id").on(table.machineId),
	index("idx_fixtures_active").on(table.isActive),
]);

export const floorPlanConfigs = mysqlTable("floor_plan_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	productionLineId: int("production_line_id"),
	width: int().default(800).notNull(),
	height: int().default(600).notNull(),
	gridSize: int("grid_size").default(20).notNull(),
	backgroundColor: varchar("background_color", { length: 20 }).default('#f8fafc'),
	backgroundImage: varchar("background_image", { length: 500 }),
	machinePositions: json("machine_positions"),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const floorPlanItems = mysqlTable("floor_plan_items", {
	id: int().autoincrement().notNull(),
	floorPlanId: int("floor_plan_id").notNull(),
	itemType: mysqlEnum("item_type", ['machine','workstation','conveyor','storage','wall','door','custom']).notNull(),
	name: varchar({ length: 100 }).notNull(),
	x: int().default(0).notNull(),
	y: int().default(0).notNull(),
	width: int().default(80).notNull(),
	height: int().default(60).notNull(),
	rotation: int().default(0).notNull(),
	color: varchar({ length: 20 }).default('#3b82f6'),
	machineId: int("machine_id"),
	metadata: json(),
	zIndex: int("z_index").default(1).notNull(),
	isLocked: int("is_locked").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_floor_plan").on(table.floorPlanId),
	index("idx_machine").on(table.machineId),
]);

export const iotAlarms = mysqlTable("iot_alarms", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	alarmCode: varchar("alarm_code", { length: 50 }).notNull(),
	alarmType: mysqlEnum("alarm_type", ['warning','error','critical']).notNull(),
	message: text().notNull(),
	value: varchar({ length: 255 }),
	threshold: varchar({ length: 255 }),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const iotAlertHistory = mysqlTable("iot_alert_history", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	deviceId: int("device_id").notNull(),
	metric: varchar({ length: 100 }).notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	value: varchar({ length: 50 }).notNull(),
	threshold: varchar({ length: 50 }).notNull(),
	message: text(),
	notificationSent: int("notification_sent").default(0).notNull(),
	notificationChannels: text("notification_channels"),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const iotAlertThresholds = mysqlTable("iot_alert_thresholds", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	metric: varchar({ length: 100 }).notNull(),
	upperLimit: varchar("upper_limit", { length: 50 }),
	lowerLimit: varchar("lower_limit", { length: 50 }),
	upperWarning: varchar("upper_warning", { length: 50 }),
	lowerWarning: varchar("lower_warning", { length: 50 }),
	alertEnabled: int("alert_enabled").default(1).notNull(),
	notificationChannels: text("notification_channels"),
	cooldownMinutes: int("cooldown_minutes").default(5).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const iotDataPoints = mysqlTable("iot_data_points", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id").notNull(),
	tagName: varchar("tag_name", { length: 100 }).notNull(),
	tagType: mysqlEnum("tag_type", ['analog','digital','string','counter']).notNull(),
	value: varchar({ length: 255 }).notNull(),
	quality: mysqlEnum(['good','bad','uncertain']).default('good').notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const iotDeviceData = mysqlTable("iot_device_data", {
	id: int().autoincrement().notNull(),
	deviceId: varchar("device_id", { length: 64 }).notNull(),
	deviceName: varchar("device_name", { length: 100 }),
	deviceType: varchar("device_type", { length: 50 }),
	status: mysqlEnum(['online','offline','error','maintenance']).default('offline').notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }),
	firmwareVersion: varchar("firmware_version", { length: 50 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	macAddress: varchar("mac_address", { length: 17 }),
	location: varchar({ length: 255 }),
	metrics: text(),
	temperature: decimal({ precision: 5, scale: 2 }),
	humidity: decimal({ precision: 5, scale: 2 }),
	pressure: decimal({ precision: 8, scale: 2 }),
	batteryLevel: int("battery_level"),
	signalStrength: int("signal_strength"),
	errorCount: int("error_count").default(0).notNull(),
	lastError: text("last_error"),
	metadata: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const iotDevices = mysqlTable("iot_devices", {
	id: int().autoincrement().notNull(),
	deviceCode: varchar("device_code", { length: 50 }).notNull(),
	deviceName: varchar("device_name", { length: 100 }).notNull(),
	deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
	manufacturer: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	protocol: mysqlEnum(['modbus_tcp','modbus_rtu','opc_ua','mqtt','http','tcp','serial']).notNull(),
	connectionString: text("connection_string"),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	status: mysqlEnum(['online','offline','error','maintenance']).default('offline').notNull(),
	lastHeartbeat: timestamp("last_heartbeat", { mode: 'string' }),
	configData: text("config_data"),
	metadata: text(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("device_code").on(table.deviceCode),
]);

export const jigs = mysqlTable("jigs", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	imageUrl: varchar({ length: 500 }),
	position: int().default(1).notNull(),
	status: mysqlEnum(['active','maintenance','inactive']).default('active').notNull(),
	installDate: timestamp({ mode: 'string' }),
	lastMaintenanceDate: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const kpiAlertStats = mysqlTable("kpi_alert_stats", {
	id: int().autoincrement().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	productionLineId: int("production_line_id"),
	productionLineName: varchar("production_line_name", { length: 255 }),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	alertCount: int("alert_count").default(0).notNull(),
	avgValue: decimal("avg_value", { precision: 10, scale: 4 }),
	minValue: decimal("min_value", { precision: 10, scale: 4 }),
	maxValue: decimal("max_value", { precision: 10, scale: 4 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	machineId: int("machine_id"),
	severity: varchar({ length: 20 }).default('warning'),
	currentValue: varchar("current_value", { length: 50 }),
	previousValue: varchar("previous_value", { length: 50 }),
	thresholdValue: varchar("threshold_value", { length: 50 }),
	changePercent: varchar("change_percent", { length: 50 }),
	emailSent: tinyint("email_sent").default(0),
	notificationSent: tinyint("notification_sent").default(0),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: datetime("acknowledged_at", { mode: 'string'}),
	resolvedBy: int("resolved_by"),
	resolvedAt: datetime("resolved_at", { mode: 'string'}),
	resolutionNotes: text("resolution_notes"),
	alertMessage: text("alert_message"),
},
(table) => [
	index("idx_date").on(table.date),
	index("idx_alert_type").on(table.alertType),
	index("idx_production_line").on(table.productionLineId),
]);

export const kpiAlertThresholds = mysqlTable("kpi_alert_thresholds", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id").notNull(),
	cpkWarning: decimal("cpk_warning", { precision: 5, scale: 3 }).default('1.330').notNull(),
	cpkCritical: decimal("cpk_critical", { precision: 5, scale: 3 }).default('1.000').notNull(),
	oeeWarning: decimal("oee_warning", { precision: 5, scale: 2 }).default('75.00').notNull(),
	oeeCritical: decimal("oee_critical", { precision: 5, scale: 2 }).default('60.00').notNull(),
	defectRateWarning: decimal("defect_rate_warning", { precision: 5, scale: 2 }).default('2.00').notNull(),
	defectRateCritical: decimal("defect_rate_critical", { precision: 5, scale: 2 }).default('5.00').notNull(),
	weeklyDeclineThreshold: decimal("weekly_decline_threshold", { precision: 5, scale: 2 }).default('-5.00').notNull(),
	emailAlertEnabled: int("email_alert_enabled").default(1).notNull(),
	alertEmails: text("alert_emails"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const kpiReportHistory = mysqlTable("kpi_report_history", {
	id: int().autoincrement().notNull(),
	scheduledReportId: int("scheduled_report_id").notNull(),
	reportName: varchar("report_name", { length: 255 }).notNull(),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	frequency: varchar({ length: 20 }).notNull(),
	recipients: text().notNull(),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	reportData: text("report_data"),
	fileUrl: varchar("file_url", { length: 500 }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const latencyMetrics = mysqlTable("latency_metrics", {
	id: int().autoincrement().notNull(),
	sourceType: mysqlEnum("source_type", ['iot_device','webhook','api','database','mqtt']).notNull(),
	sourceId: varchar("source_id", { length: 100 }).notNull(),
	sourceName: varchar("source_name", { length: 200 }),
	latencyMs: int("latency_ms").notNull(),
	hourOfDay: int("hour_of_day").notNull(),
	dayOfWeek: int("day_of_week").notNull(),
	endpoint: varchar({ length: 255 }),
	statusCode: int("status_code"),
	isSuccess: int("is_success").default(1).notNull(),
	measuredAt: timestamp("measured_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_source").on(table.sourceType, table.sourceId),
	index("idx_time_bucket").on(table.hourOfDay, table.dayOfWeek),
	index("idx_measured_at").on(table.measuredAt),
]);

export const latencyRecords = mysqlTable("latency_records", {
	id: int().autoincrement().notNull(),
	deviceId: int("device_id"),
	deviceName: varchar("device_name", { length: 100 }),
	sourceType: mysqlEnum("source_type", ['sensor','plc','gateway','server']).notNull(),
	latencyMs: decimal("latency_ms", { precision: 10, scale: 2 }).notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const licenseCustomers = mysqlTable("license_customers", {
	id: int().autoincrement().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	contactName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 50 }),
	address: text(),
	industry: varchar({ length: 100 }),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const licenseHeartbeats = mysqlTable("license_heartbeats", {
	id: int().autoincrement().notNull(),
	licenseKey: varchar({ length: 255 }).notNull(),
	hardwareFingerprint: varchar({ length: 64 }),
	hostname: varchar({ length: 255 }),
	platform: varchar({ length: 100 }),
	activeUsers: int(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const licenseNotificationLogs = mysqlTable("license_notification_logs", {
	id: int().autoincrement().notNull(),
	licenseId: int("license_id").notNull(),
	licenseKey: varchar("license_key", { length: 255 }).notNull(),
	notificationType: mysqlEnum("notification_type", ['7_days_warning','30_days_warning','expired','activated','deactivated']).notNull(),
	recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
	subject: varchar({ length: 500 }),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	content: text(),
	retryCount: int("retry_count").default(0).notNull(),
});

export const licenses = mysqlTable("licenses", {
	id: int().autoincrement().notNull(),
	licenseKey: varchar({ length: 255 }).notNull(),
	licenseType: mysqlEnum(['trial','standard','professional','enterprise']).default('trial').notNull(),
	companyName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	maxUsers: int().default(5).notNull(),
	maxProductionLines: int().default(3).notNull(),
	maxSpcPlans: int().default(10).notNull(),
	features: text(),
	issuedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	activatedAt: timestamp({ mode: 'string' }),
	activatedBy: int(),
	isActive: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	licenseStatus: mysqlEnum(['pending','active','expired','revoked']).default('pending').notNull(),
	hardwareFingerprint: varchar({ length: 64 }),
	offlineLicenseFile: text(),
	activationMode: mysqlEnum(['online','offline','hybrid']).default('online'),
	lastValidatedAt: timestamp({ mode: 'string' }),
	price: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 3 }).default('VND'),
	systems: text(),
	systemFeatures: text(),
},
(table) => [
	index("licenses_licenseKey_unique").on(table.licenseKey),
	index("idx_license_status").on(table.licenseStatus),
	index("").on(table.licenseStatus),
]);

export const localUsers = mysqlTable("local_users", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 100 }).notNull(),
	passwordHash: varchar({ length: 255 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	role: mysqlEnum(['user','manager','admin']).default('user').notNull(),
	isActive: int().default(1).notNull(),
	mustChangePassword: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }),
	avatar: varchar({ length: 500 }),
},
(table) => [
	index("local_users_username_unique").on(table.username),
]);

export const loginHistory = mysqlTable("login_history", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	username: varchar({ length: 100 }).notNull(),
	authType: mysqlEnum(['local','manus']).default('local').notNull(),
	eventType: mysqlEnum(['login','logout','login_failed']).notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_login_user").on(table.userId),
	index("idx_login_event").on(table.eventType),
	index("idx_login_date").on(table.createdAt),
	index("idx_login_history_created_at").on(table.createdAt),
	index("idx_login_history_event").on(table.eventType),
	index("idx_login_history_user").on(table.userId, table.createdAt),
	index("").on(table.userId),
	index("idx_login_created").on(table.createdAt),
	index("idx_login_user_created").on(table.userId, table.createdAt),
]);

export const loginLocationHistory = mysqlTable("login_location_history", {
	id: int().autoincrement().notNull(),
	loginHistoryId: int("login_history_id").notNull(),
	userId: int("user_id").notNull(),
	ipAddress: varchar("ip_address", { length: 45 }).notNull(),
	country: varchar({ length: 100 }),
	countryCode: varchar("country_code", { length: 10 }),
	region: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	isp: varchar({ length: 255 }),
	timezone: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineApiKeys = mysqlTable("machine_api_keys", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	apiKey: varchar({ length: 64 }).notNull(),
	apiKeyHash: varchar({ length: 255 }).notNull(),
	vendorName: varchar({ length: 255 }).notNull(),
	machineType: varchar({ length: 100 }).notNull(),
	machineId: int(),
	productionLineId: int(),
	permissions: text(),
	rateLimit: int().default(100).notNull(),
	isActive: int().default(1).notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	lastUsedAt: timestamp({ mode: 'string' }),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("apiKey").on(table.apiKey),
]);

export const machineAreaAssignments = mysqlTable("machine_area_assignments", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	areaId: int().notNull(),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineAreas = mysqlTable("machine_areas", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	parentId: int(),
	type: mysqlEnum(['factory','line','zone','area']).default('area'),
	sortOrder: int().default(0),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineBom = mysqlTable("machine_bom", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().default(1).notNull(),
	isRequired: int().default(1).notNull(),
	replacementInterval: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_machine_bom_machine").on(table.machineId),
	index("idx_machine_bom_spare_part").on(table.sparePartId),
]);

export const machineDataLogs = mysqlTable("machine_data_logs", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	endpoint: varchar({ length: 255 }).notNull(),
	method: varchar({ length: 10 }).notNull(),
	requestBody: text(),
	responseStatus: int().notNull(),
	responseBody: text(),
	processingTimeMs: int(),
	ipAddress: varchar({ length: 45 }),
	userAgent: varchar({ length: 500 }),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineDowntimeRecords = mysqlTable("machine_downtime_records", {
	id: int().autoincrement().notNull(),
	machineId: int("machine_id").notNull(),
	machineName: varchar("machine_name", { length: 100 }),
	productionLineId: int("production_line_id"),
	downtimeCategory: varchar("downtime_category", { length: 100 }).notNull(),
	downtimeReason: varchar("downtime_reason", { length: 255 }).notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	durationMinutes: int("duration_minutes"),
	severity: mysqlEnum(['minor','moderate','major','critical']).default('moderate').notNull(),
	resolvedBy: int("resolved_by"),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineFieldMappings = mysqlTable("machine_field_mappings", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	apiKeyId: int(),
	machineType: varchar({ length: 100 }),
	sourceField: varchar({ length: 200 }).notNull(),
	targetField: varchar({ length: 200 }).notNull(),
	targetTable: mysqlEnum(['measurements','inspection_data','oee_records']).notNull(),
	transformType: mysqlEnum(['direct','multiply','divide','add','subtract','custom']).default('direct').notNull(),
	transformValue: decimal({ precision: 15, scale: 6 }),
	customTransform: text(),
	defaultValue: varchar({ length: 255 }),
	isRequired: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineInspectionData = mysqlTable("machine_inspection_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
	workstationId: int("workstation_id"),
	batchId: varchar({ length: 100 }),
	productCode: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	inspectionType: varchar({ length: 50 }).notNull(),
	inspectionResult: varchar({ length: 20 }).notNull(),
	defectCount: int().default(0),
	defectTypes: text(),
	defectDetails: text(),
	imageUrls: text(),
	inspectedAt: timestamp({ mode: 'string' }).notNull(),
	cycleTimeMs: int(),
	operatorId: varchar({ length: 50 }),
	shiftId: varchar({ length: 50 }),
	rawData: text(),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineIntegrationConfigs = mysqlTable("machine_integration_configs", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	configType: varchar({ length: 50 }).notNull(),
	configName: varchar({ length: 255 }).notNull(),
	configValue: text().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineMeasurementData = mysqlTable("machine_measurement_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
	workstationId: int("workstation_id"),
	batchId: varchar({ length: 100 }),
	productCode: varchar({ length: 100 }),
	serialNumber: varchar({ length: 100 }),
	parameterName: varchar({ length: 255 }).notNull(),
	parameterCode: varchar({ length: 100 }),
	measuredValue: decimal({ precision: 15, scale: 6 }).notNull(),
	unit: varchar({ length: 50 }),
	lsl: decimal({ precision: 15, scale: 6 }),
	usl: decimal({ precision: 15, scale: 6 }),
	target: decimal({ precision: 15, scale: 6 }),
	isWithinSpec: int(),
	measuredAt: timestamp({ mode: 'string' }).notNull(),
	operatorId: varchar({ length: 50 }),
	shiftId: varchar({ length: 50 }),
	rawData: text(),
	remark: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineOeeData = mysqlTable("machine_oee_data", {
	id: int().autoincrement().notNull(),
	apiKeyId: int().notNull(),
	machineId: int(),
	productionLineId: int(),
	shiftId: varchar({ length: 50 }),
	recordDate: varchar({ length: 10 }).notNull(),
	plannedProductionTime: int(),
	actualProductionTime: int(),
	downtime: int(),
	downtimeReasons: text(),
	idealCycleTime: decimal({ precision: 10, scale: 4 }),
	actualCycleTime: decimal({ precision: 10, scale: 4 }),
	totalCount: int(),
	goodCount: int(),
	rejectCount: int(),
	reworkCount: int(),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	oee: decimal({ precision: 5, scale: 2 }),
	recordedAt: timestamp({ mode: 'string' }).notNull(),
	rawData: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineOnlineStatus = mysqlTable("machine_online_status", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	connectionId: int(),
	isOnline: int().default(0).notNull(),
	lastHeartbeat: timestamp({ mode: 'string' }),
	lastDataReceived: timestamp({ mode: 'string' }),
	currentCpk: int(),
	currentMean: int(),
	activeAlarmCount: int().default(0).notNull(),
	warningCount: int().default(0).notNull(),
	criticalCount: int().default(0).notNull(),
	status: mysqlEnum(['idle','running','warning','critical','offline']).default('offline'),
	statusMessage: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("machineId").on(table.machineId),
	index("idx_machine_status_machine").on(table.machineId),
]);

export const machineRealtimeEvents = mysqlTable("machine_realtime_events", {
	id: int().autoincrement().notNull(),
	eventType: mysqlEnum(['inspection','measurement','oee','alert','status']).notNull(),
	machineId: int(),
	machineName: varchar({ length: 200 }),
	apiKeyId: int(),
	eventData: text().notNull(),
	severity: mysqlEnum(['info','warning','error','critical']).default('info').notNull(),
	isProcessed: int().default(0).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineStatusHistory = mysqlTable("machine_status_history", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	status: mysqlEnum(['online','offline','idle','running','warning','critical','maintenance']).notNull(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	durationMinutes: int(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const machineTypes = mysqlTable("machine_types", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineWebhookConfigs = mysqlTable("machine_webhook_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	webhookUrl: varchar({ length: 500 }).notNull(),
	webhookSecret: varchar({ length: 255 }),
	triggerType: mysqlEnum(['inspection_fail','oee_low','measurement_out_of_spec','all']).notNull(),
	machineIds: text(),
	oeeThreshold: decimal({ precision: 5, scale: 2 }),
	isActive: int().default(1).notNull(),
	retryCount: int().default(3).notNull(),
	retryDelaySeconds: int().default(60).notNull(),
	headers: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const machineWebhookLogs = mysqlTable("machine_webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookConfigId: int().notNull(),
	triggerType: varchar({ length: 50 }).notNull(),
	triggerDataId: int(),
	requestPayload: text(),
	responseStatus: int(),
	responseBody: text(),
	responseTime: int(),
	attempt: int().default(1).notNull(),
	status: mysqlEnum(['pending','success','failed','retrying']).default('pending').notNull(),
	errorMessage: text(),
	triggeredAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp({ mode: 'string' }),
});

export const machines = mysqlTable("machines", {
	id: int().autoincrement().notNull(),
	workstationId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	machineType: varchar({ length: 100 }),
	manufacturer: varchar({ length: 255 }),
	model: varchar({ length: 255 }),
	serialNumber: varchar({ length: 255 }),
	installDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['active','maintenance','inactive']).default('active').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	machineTypeId: int(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("idx_machines_workstation_id").on(table.workstationId),
	index("idx_machines_machine_type_id").on(table.machineTypeId),
	index("idx_machines_machine_type").on(table.machineTypeId),
	index("idx_machines_active").on(table.isActive),
]);

export const maintenanceHistory = mysqlTable("maintenance_history", {
	id: int().autoincrement().notNull(),
	workOrderId: int().notNull(),
	machineId: int().notNull(),
	action: varchar({ length: 255 }).notNull(),
	performedBy: int(),
	performedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const maintenanceSchedules = mysqlTable("maintenance_schedules", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	maintenanceTypeId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','biweekly','monthly','quarterly','biannually','annually','custom']).notNull(),
	customIntervalDays: int(),
	lastPerformedAt: timestamp({ mode: 'string' }),
	nextDueAt: timestamp({ mode: 'string' }),
	estimatedDuration: int(),
	assignedTechnicianId: int(),
	checklist: json(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const maintenanceTypes = mysqlTable("maintenance_types", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	category: mysqlEnum(['corrective','preventive','predictive','condition_based']).notNull(),
	description: text(),
	defaultPriority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	estimatedDuration: int(),
	color: varchar({ length: 20 }).default('#3b82f6'),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const mappingTemplates = mysqlTable("mapping_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	tableName: varchar({ length: 255 }),
	productCodeColumn: varchar({ length: 255 }).default('product_code'),
	stationColumn: varchar({ length: 255 }).default('station'),
	valueColumn: varchar({ length: 255 }).default('value'),
	timestampColumn: varchar({ length: 255 }).default('timestamp'),
	defaultUsl: int(),
	defaultLsl: int(),
	defaultTarget: int(),
	filterConditions: text(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const memoryLeakReports = mysqlTable("memory_leak_reports", {
	id: int().autoincrement().notNull(),
	reportId: varchar("report_id", { length: 64 }).notNull(),
	heapUsed: bigint("heap_used", { mode: "number" }).notNull(),
	heapTotal: bigint("heap_total", { mode: "number" }).notNull(),
	external: bigint({ mode: "number" }),
	arrayBuffers: bigint("array_buffers", { mode: "number" }),
	rss: bigint({ mode: "number" }),
	threshold: bigint({ mode: "number" }),
	leakSuspected: int("leak_suspected").default(0).notNull(),
	growthRate: decimal("growth_rate", { precision: 10, scale: 4 }),
	stackTrace: text("stack_trace"),
	processId: varchar("process_id", { length: 50 }),
	hostname: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("memory_leak_reports_report_id_unique").on(table.reportId),
]);

export const mobileDevices = mysqlTable("mobile_devices", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 500 }).notNull(),
	platform: mysqlEnum(['ios','android']).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceModel: varchar("device_model", { length: 255 }),
	isActive: int("is_active").default(1).notNull(),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_mobile_devices_user").on(table.userId),
	index("idx_mobile_devices_token").on(table.token),
]);

export const mobileNotificationSettings = mysqlTable("mobile_notification_settings", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	enabled: int().default(1).notNull(),
	cpkAlerts: int("cpk_alerts").default(1).notNull(),
	spcAlerts: int("spc_alerts").default(1).notNull(),
	oeeAlerts: int("oee_alerts").default(1).notNull(),
	dailyReport: int("daily_report").default(0).notNull(),
	soundEnabled: int("sound_enabled").default(1).notNull(),
	vibrationEnabled: int("vibration_enabled").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_mobile_notification_user").on(table.userId),
]);

export const modulePermissions = mysqlTable("module_permissions", {
	id: int().autoincrement().notNull(),
	moduleId: int().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	actionType: mysqlEnum(['view','create','edit','delete','export','import','approve','manage']).default('view').notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const notificationChannels = mysqlTable("notification_channels", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	channelType: varchar({ length: 50 }).notNull(),
	channelConfig: text(),
	enabled: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const notificationLogs = mysqlTable("notification_logs", {
	id: int().autoincrement().notNull(),
	userId: int(),
	channelType: varchar({ length: 50 }).notNull(),
	recipient: varchar({ length: 255 }).notNull(),
	subject: varchar({ length: 500 }),
	message: text(),
	status: mysqlEnum(['pending','sent','failed']).default('pending'),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const ntfAlertConfig = mysqlTable("ntf_alert_config", {
	id: int().autoincrement().notNull(),
	warningThreshold: decimal({ precision: 5, scale: 2 }).default('20.00'),
	criticalThreshold: decimal({ precision: 5, scale: 2 }).default('30.00'),
	alertEmails: text(),
	enabled: tinyint().default(1),
	checkIntervalMinutes: int().default(60),
	cooldownMinutes: int().default(120),
	lastAlertAt: timestamp({ mode: 'string' }),
	lastAlertNtfRate: decimal({ precision: 5, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const ntfAlertHistory = mysqlTable("ntf_alert_history", {
	id: int().autoincrement().notNull(),
	ntfRate: decimal({ precision: 5, scale: 2 }).notNull(),
	totalDefects: int().notNull(),
	ntfCount: int().notNull(),
	realNgCount: int().notNull(),
	pendingCount: int().notNull(),
	alertType: mysqlEnum(['warning','critical']).notNull(),
	emailSent: tinyint().default(0),
	emailSentAt: timestamp({ mode: 'string' }),
	emailRecipients: text(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const ntfReportSchedule = mysqlTable("ntf_report_schedule", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	reportType: mysqlEnum(['daily','weekly','monthly']).notNull(),
	sendHour: int().default(8),
	sendDay: int(),
	recipients: text().notNull(),
	enabled: tinyint().default(1),
	lastSentAt: timestamp({ mode: 'string' }),
	lastSentStatus: mysqlEnum(['success','failed']),
	lastSentError: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const oeeAlertConfigs = mysqlTable("oee_alert_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	machineId: int("machine_id"),
	oeeThreshold: decimal("oee_threshold", { precision: 5, scale: 2 }).notNull(),
	consecutiveDays: int("consecutive_days").default(3).notNull(),
	recipients: text().notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const oeeAlertHistory = mysqlTable("oee_alert_history", {
	id: int().autoincrement().notNull(),
	alertConfigId: int("alert_config_id").notNull(),
	machineId: int("machine_id"),
	machineName: varchar("machine_name", { length: 255 }),
	oeeValue: decimal("oee_value", { precision: 5, scale: 2 }).notNull(),
	consecutiveDaysBelow: int("consecutive_days_below").notNull(),
	recipients: text().notNull(),
	emailSent: int("email_sent").default(0).notNull(),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	acknowledged: tinyint().default(0),
	acknowledgedAt: datetime("acknowledged_at", { mode: 'string'}),
	acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
	resolved: tinyint().default(0),
	resolvedAt: datetime("resolved_at", { mode: 'string'}),
	resolvedBy: varchar("resolved_by", { length: 255 }),
	resolution: text(),
});

export const oeeAlertThresholds = mysqlTable("oee_alert_thresholds", {
	id: int().autoincrement().notNull(),
	machineId: int(),
	productionLineId: int(),
	targetOee: decimal({ precision: 5, scale: 2 }).default('85.00').notNull(),
	warningThreshold: decimal({ precision: 5, scale: 2 }).default('80.00').notNull(),
	criticalThreshold: decimal({ precision: 5, scale: 2 }).default('70.00').notNull(),
	dropAlertThreshold: decimal({ precision: 5, scale: 2 }).default('5.00').notNull(),
	relativeDropThreshold: decimal({ precision: 5, scale: 2 }).default('10.00').notNull(),
	availabilityTarget: decimal({ precision: 5, scale: 2 }).default('90.00'),
	performanceTarget: decimal({ precision: 5, scale: 2 }).default('95.00'),
	qualityTarget: decimal({ precision: 5, scale: 2 }).default('99.00'),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const oeeLossCategories = mysqlTable("oee_loss_categories", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	type: mysqlEnum(['availability','performance','quality']).notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const oeeLossRecords = mysqlTable("oee_loss_records", {
	id: int().autoincrement().notNull(),
	oeeRecordId: int().notNull(),
	lossCategoryId: int().notNull(),
	durationMinutes: int().notNull(),
	quantity: int().default(0),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_oee_loss_record").on(table.oeeRecordId),
	index("idx_oee_loss_category").on(table.lossCategoryId),
]);

export const oeeRecords = mysqlTable("oee_records", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	productionLineId: int(),
	shiftId: int(),
	recordDate: timestamp({ mode: 'string' }).notNull(),
	plannedProductionTime: int().default(0),
	actualRunTime: int().default(0),
	downtime: int().default(0),
	idealCycleTime: decimal({ precision: 10, scale: 4 }),
	totalCount: int().default(0),
	goodCount: int().default(0),
	defectCount: int().default(0),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	oee: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	plannedTime: int(),
	runTime: int(),
	cycleTime: decimal({ precision: 10, scale: 4 }),
	totalParts: int(),
	goodParts: int(),
	rejectParts: int(),
},
(table) => [
	index("idx_oee_records_machineId").on(table.machineId),
	index("idx_oee_records_recordDate").on(table.recordDate),
	index("idx_oee_records_machine").on(table.machineId, table.recordDate),
	index("idx_oee_records_line").on(table.productionLineId, table.recordDate),
	index("idx_oee_records_date").on(table.recordDate),
	index("idx_oee_machine").on(table.machineId),
	index("idx_oee_date").on(table.recordDate),
	index("idx_oee_machine_date").on(table.machineId, table.recordDate),
]);

export const oeeReportHistory = mysqlTable("oee_report_history", {
	id: int().autoincrement().notNull(),
	scheduleId: int("schedule_id").notNull(),
	reportPeriodStart: timestamp("report_period_start", { mode: 'string' }).notNull(),
	reportPeriodEnd: timestamp("report_period_end", { mode: 'string' }).notNull(),
	recipients: text().notNull(),
	reportData: text("report_data"),
	emailSent: int("email_sent").default(0).notNull(),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const oeeReportSchedules = mysqlTable("oee_report_schedules", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	frequency: mysqlEnum(['weekly','monthly']).notNull(),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	hour: int().default(8).notNull(),
	machineIds: text("machine_ids"),
	recipients: text().notNull(),
	includeCharts: int("include_charts").default(1).notNull(),
	includeTrend: int("include_trend").default(1).notNull(),
	includeComparison: int("include_comparison").default(1).notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	nextScheduledAt: timestamp("next_scheduled_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const oeeTargets = mysqlTable("oee_targets", {
	id: int().autoincrement().notNull(),
	machineId: int(),
	productionLineId: int(),
	targetOee: decimal({ precision: 5, scale: 2 }).default('85.00'),
	targetAvailability: decimal({ precision: 5, scale: 2 }).default('90.00'),
	targetPerformance: decimal({ precision: 5, scale: 2 }).default('95.00'),
	targetQuality: decimal({ precision: 5, scale: 2 }).default('99.00'),
	effectiveFrom: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	effectiveTo: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const permissions = mysqlTable("permissions", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	module: varchar({ length: 100 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	system: mysqlEnum(['SPC','MMS','COMMON']).default('COMMON').notNull(),
	parentId: int(),
	sortOrder: int().default(0),
},
(table) => [
	index("permissions_code_unique").on(table.code),
]);

export const poReceivingHistory = mysqlTable("po_receiving_history", {
	id: int().autoincrement().notNull(),
	purchaseOrderId: int().notNull(),
	purchaseOrderItemId: int().notNull(),
	sparePartId: int().notNull(),
	quantityReceived: int().notNull(),
	receivedBy: int(),
	receivedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	notes: text(),
	batchNumber: varchar({ length: 100 }),
	qualityStatus: mysqlEnum(['good','damaged','rejected']).default('good'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const positions = mysqlTable("positions", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	level: int().default(1).notNull(),
	canApprove: int().default(0).notNull(),
	approvalLimit: decimal({ precision: 15, scale: 2 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const predictiveAlertAdjustmentLogs = mysqlTable("predictive_alert_adjustment_logs", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	adjustmentType: mysqlEnum("adjustment_type", ['auto','manual']).notNull(),
	oldValues: text("old_values").notNull(),
	newValues: text("new_values").notNull(),
	reason: text(),
	adjustedBy: int("adjusted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const predictiveAlertHistory = mysqlTable("predictive_alert_history", {
	id: int().autoincrement().notNull(),
	thresholdId: int("threshold_id").notNull(),
	productionLineId: int("production_line_id"),
	alertType: mysqlEnum("alert_type", ['oee_low','oee_decline','defect_high','defect_increase','auto_adjust']).notNull(),
	severity: mysqlEnum(['warning','critical','info']).notNull(),
	currentValue: decimal("current_value", { precision: 10, scale: 4 }),
	thresholdValue: decimal("threshold_value", { precision: 10, scale: 4 }),
	predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
	changePercent: decimal("change_percent", { precision: 10, scale: 4 }),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	recommendations: text(),
	status: mysqlEnum(['pending','sent','acknowledged','resolved']).default('pending').notNull(),
	acknowledgedBy: int("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolutionNotes: text("resolution_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const predictiveAlertThresholds = mysqlTable("predictive_alert_thresholds", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	predictionType: mysqlEnum("prediction_type", ['oee','defect_rate','both']).default('both').notNull(),
	oeeWarningThreshold: decimal("oee_warning_threshold", { precision: 5, scale: 2 }).default('75.00'),
	oeeCriticalThreshold: decimal("oee_critical_threshold", { precision: 5, scale: 2 }).default('65.00'),
	oeeDeclineThreshold: decimal("oee_decline_threshold", { precision: 5, scale: 2 }).default('5.00'),
	defectWarningThreshold: decimal("defect_warning_threshold", { precision: 5, scale: 2 }).default('3.00'),
	defectCriticalThreshold: decimal("defect_critical_threshold", { precision: 5, scale: 2 }).default('5.00'),
	defectIncreaseThreshold: decimal("defect_increase_threshold", { precision: 5, scale: 2 }).default('20.00'),
	autoAdjustEnabled: int("auto_adjust_enabled").default(0).notNull(),
	autoAdjustSensitivity: mysqlEnum("auto_adjust_sensitivity", ['low','medium','high']).default('medium').notNull(),
	autoAdjustPeriodDays: int("auto_adjust_period_days").default(30).notNull(),
	emailAlertEnabled: int("email_alert_enabled").default(1).notNull(),
	alertEmails: text("alert_emails"),
	alertFrequency: mysqlEnum("alert_frequency", ['immediate','hourly','daily']).default('immediate').notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	lastAutoAdjustAt: timestamp("last_auto_adjust_at", { mode: 'string' }),
	createdBy: int("created_by"),
});

export const processConfigs = mysqlTable("process_configs", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	productId: int().notNull(),
	workstationId: int().notNull(),
	processName: varchar({ length: 255 }).notNull(),
	processOrder: int().default(0).notNull(),
	standardTime: int(),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const processStepMachines = mysqlTable("process_step_machines", {
	id: int().autoincrement().notNull(),
	processStepId: int().notNull(),
	machineTypeId: int(),
	machineName: varchar({ length: 255 }).notNull(),
	machineCode: varchar({ length: 100 }),
	isRequired: int().default(1).notNull(),
	quantity: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const processSteps = mysqlTable("process_steps", {
	id: int().autoincrement().notNull(),
	processTemplateId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	sequenceOrder: int().default(1).notNull(),
	standardTime: int(),
	workstationTypeId: int(),
	isRequired: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const processTemplates = mysqlTable("process_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	version: varchar({ length: 50 }).default('1.0'),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("process_templates_code_unique").on(table.code),
]);

export const productSpecifications = mysqlTable("product_specifications", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	workstationId: int(),
	parameterName: varchar({ length: 255 }).notNull(),
	usl: int().notNull(),
	lsl: int().notNull(),
	target: int(),
	unit: varchar({ length: 50 }),
	description: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_product_specifications_workstation").on(table.workstationId),
]);

export const productStationMachineStandards = mysqlTable("product_station_machine_standards", {
	id: int().autoincrement().notNull(),
	productId: int().notNull(),
	workstationId: int().notNull(),
	machineId: int(),
	measurementName: varchar({ length: 255 }).notNull(),
	usl: int(),
	lsl: int(),
	target: int(),
	unit: varchar({ length: 50 }).default('mm'),
	sampleSize: int().default(5).notNull(),
	sampleFrequency: int().default(60).notNull(),
	samplingMethod: varchar({ length: 100 }).default('random'),
	appliedSpcRules: text(),
	cpkWarningThreshold: int().default(133),
	cpkCriticalThreshold: int().default(100),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	appliedCpkRules: text(),
	appliedCaRules: text(),
});

export const productStationMappings = mysqlTable("product_station_mappings", {
	id: int().autoincrement().notNull(),
	productCode: varchar({ length: 100 }).notNull(),
	stationName: varchar({ length: 100 }).notNull(),
	connectionId: int().notNull(),
	tableName: varchar({ length: 255 }).notNull(),
	productCodeColumn: varchar({ length: 100 }).default('product_code').notNull(),
	stationColumn: varchar({ length: 100 }).default('station').notNull(),
	valueColumn: varchar({ length: 100 }).default('value').notNull(),
	timestampColumn: varchar({ length: 100 }).default('timestamp').notNull(),
	usl: int(),
	lsl: int(),
	target: int(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	filterConditions: text(),
},
(table) => [
	index("idx_product_station_mappings_station").on(table.stationName),
	index("idx_product_station_mappings_active").on(table.isActive),
]);

export const productionLineMachines = mysqlTable("production_line_machines", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	machineId: int().notNull(),
	processStepId: int(),
	assignedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	assignedBy: int().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const productionLineProducts = mysqlTable("production_line_products", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	productId: int().notNull(),
	isDefault: int().default(0).notNull(),
	cycleTime: int(),
	targetOutput: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const productionLines = mysqlTable("production_lines", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	productId: int(),
	processTemplateId: int(),
	supervisorId: int(),
	imageUrl: varchar({ length: 500 }),
	factoryId: int("factory_id"),
	workshopId: int("workshop_id"),
},
(table) => [
	index("production_lines_code_unique").on(table.code),
]);

export const products = mysqlTable("products", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 50 }).default('pcs'),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("products_code_unique").on(table.code),
	index("idx_products_code").on(table.code),
	index("idx_products_is_active").on(table.isActive),
	index("idx_products_active").on(table.isActive),
]);

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
	id: int().autoincrement().notNull(),
	purchaseOrderId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().notNull(),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	totalPrice: decimal({ precision: 12, scale: 2 }),
	receivedQuantity: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_po_items_purchaseOrderId").on(table.purchaseOrderId),
	index("idx_po_items_sparePartId").on(table.sparePartId),
]);

export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int().autoincrement().notNull(),
	poNumber: varchar({ length: 50 }).notNull(),
	supplierId: int().notNull(),
	status: mysqlEnum(['draft','pending','approved','ordered','partial','received','cancelled']).default('draft').notNull(),
	total: decimal({ precision: 15, scale: 2 }),
	orderDate: timestamp({ mode: 'string' }),
	expectedDeliveryDate: timestamp({ mode: 'string' }),
	actualDeliveryDate: timestamp({ mode: 'string' }),
	notes: text(),
	createdBy: int(),
	approvedBy: int(),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	subtotal: decimal({ precision: 14, scale: 2 }),
	tax: decimal({ precision: 14, scale: 2 }),
	shipping: decimal({ precision: 14, scale: 2 }),
	rejectedBy: int(),
	rejectedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
},
(table) => [
	index("idx_purchase_orders_supplierId").on(table.supplierId),
]);

export const rateLimitConfig = mysqlTable("rate_limit_config", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	configValue: text().notNull(),
	description: text(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("configKey").on(table.configKey),
]);

export const rateLimitConfigHistory = mysqlTable("rate_limit_config_history", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	oldValue: text(),
	newValue: text().notNull(),
	changedBy: int().notNull(),
	changedByName: varchar({ length: 255 }),
	changeReason: text(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const rateLimitRoleConfig = mysqlTable("rate_limit_role_config", {
	id: int().autoincrement().notNull(),
	role: mysqlEnum(['user','admin','guest']).notNull(),
	maxRequests: int().default(5000).notNull(),
	maxAuthRequests: int().default(200).notNull(),
	maxExportRequests: int().default(100).notNull(),
	windowMs: int().default(900000).notNull(),
	description: text(),
	isActive: int().default(1).notNull(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("role").on(table.role),
]);

export const realtimeAlerts = mysqlTable("realtime_alerts", {
	id: int().autoincrement().notNull(),
	connectionId: int().notNull(),
	machineId: int().notNull(),
	alertType: mysqlEnum(['out_of_spec','out_of_control','rule_violation','connection_lost']).notNull(),
	severity: mysqlEnum(['warning','critical']).notNull(),
	message: text(),
	ruleNumber: int(),
	value: int(),
	threshold: int(),
	acknowledgedAt: timestamp({ mode: 'string' }),
	acknowledgedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_alerts_ack").on(table.acknowledgedAt),
	index("idx_alerts_created").on(table.createdAt),
]);

export const realtimeDataBuffer = mysqlTable("realtime_data_buffer", {
	id: int().autoincrement().notNull(),
	connectionId: int().notNull(),
	machineId: int().notNull(),
	measurementName: varchar({ length: 100 }).notNull(),
	value: int().notNull(),
	sampledAt: timestamp({ mode: 'string' }).notNull(),
	processedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	subgroupIndex: int(),
	subgroupMean: int(),
	subgroupRange: int(),
	ucl: int(),
	lcl: int(),
	isOutOfSpec: int().default(0).notNull(),
	isOutOfControl: int().default(0).notNull(),
	violatedRules: varchar({ length: 50 }),
},
(table) => [
	index("idx_connection_time").on(table.connectionId, table.sampledAt),
	index("idx_machine_time").on(table.machineId, table.sampledAt),
]);

export const realtimeDataStreams = mysqlTable("realtime_data_streams", {
	id: int().autoincrement().notNull(),
	streamId: varchar("stream_id", { length: 64 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	streamType: mysqlEnum("stream_type", ['spc','oee','iot','system','security','ai']).notNull(),
	source: varchar({ length: 100 }).notNull(),
	interval: int().default(5000).notNull(),
	isActive: int("is_active").default(0).notNull(),
	lastDataAt: timestamp("last_data_at", { mode: 'string' }),
	subscriberCount: int("subscriber_count").default(0).notNull(),
	errorCount: int("error_count").default(0).notNull(),
	config: text(),
	metadata: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("realtime_data_streams_stream_id_unique").on(table.streamId),
]);

export const realtimeMachineConnections = mysqlTable("realtime_machine_connections", {
	id: int().autoincrement().notNull(),
	machineId: int().notNull(),
	connectionType: mysqlEnum(['database','opcua','api','file','mqtt']).notNull(),
	connectionConfig: text(),
	pollingIntervalMs: int().default(1000).notNull(),
	dataQuery: text(),
	measurementColumn: varchar({ length: 100 }),
	timestampColumn: varchar({ length: 100 }),
	lastDataAt: timestamp({ mode: 'string' }),
	lastError: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const reportTemplates = mysqlTable("report_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	companyName: varchar({ length: 255 }),
	companyLogo: text(),
	headerText: text(),
	footerText: text(),
	primaryColor: varchar({ length: 20 }).default('#3b82f6'),
	secondaryColor: varchar({ length: 20 }).default('#64748b'),
	fontFamily: varchar({ length: 100 }).default('Arial'),
	showLogo: int().default(1).notNull(),
	showCompanyName: int().default(1).notNull(),
	showDate: int().default(1).notNull(),
	showCharts: int().default(1).notNull(),
	showRawData: int().default(0).notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const roleModulePermissions = mysqlTable("role_module_permissions", {
	id: int().autoincrement().notNull(),
	roleId: int().notNull(),
	permissionId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const rolePermissions = mysqlTable("role_permissions", {
	id: int().autoincrement().notNull(),
	role: mysqlEnum(['user','admin','operator','viewer']).notNull(),
	permissionId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const roleTemplates = mysqlTable("role_templates", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['production','quality','maintenance','management','system']).default('production').notNull(),
	permissionIds: text().notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const sampleMeasurements = mysqlTable("sample_measurements", {
	id: int().autoincrement().notNull(),
	productCode: varchar("product_code", { length: 50 }).notNull(),
	stationName: varchar("station_name", { length: 100 }).notNull(),
	measurementValue: decimal("measurement_value", { precision: 10, scale: 4 }).notNull(),
	measurementTime: datetime("measurement_time", { mode: 'string'}).notNull(),
	operator: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 50 }),
	status: varchar({ length: 20 }).default('OK'),
});

export const sampleProducts = mysqlTable("sample_products", {
	id: int().autoincrement().notNull(),
	productCode: varchar("product_code", { length: 50 }).notNull(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	unit: varchar({ length: 50 }),
	usl: decimal({ precision: 10, scale: 3 }),
	lsl: decimal({ precision: 10, scale: 3 }),
	targetValue: decimal("target_value", { precision: 10, scale: 3 }),
	createdAt: datetime("created_at", { mode: 'string'}).default('CURRENT_TIMESTAMP'),
});

export const samplingConfigs = mysqlTable("sampling_configs", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	name: varchar({ length: 255 }).notNull(),
	timeUnit: mysqlEnum(['year','month','week','day','hour','minute','second']).default('hour').notNull(),
	sampleSize: int().default(5).notNull(),
	subgroupSize: int().default(5).notNull(),
	intervalValue: int().default(30).notNull(),
	intervalUnit: mysqlEnum(['year','month','week','day','hour','minute','second']).default('minute').notNull(),
	autoSampling: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const scheduledKpiReports = mysqlTable("scheduled_kpi_reports", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
	productionLineIds: text("production_line_ids"),
	reportType: mysqlEnum("report_type", ['shift_summary','kpi_comparison','trend_analysis','full_report']).default('shift_summary').notNull(),
	includeCharts: int("include_charts").default(1).notNull(),
	includeDetails: int("include_details").default(1).notNull(),
	recipients: text().notNull(),
	ccRecipients: text("cc_recipients"),
	isEnabled: int("is_enabled").default(1).notNull(),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	lastStatus: mysqlEnum("last_status", ['success','failed','pending']),
	lastError: text("last_error"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// Legacy MMS scheduled report logs - kept for backward compatibility
export const mmsScheduledReportLogs = mysqlTable("mms_scheduled_report_logs", {
	id: int().autoincrement().notNull(),
	reportId: int().notNull(),
	sentAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	status: mysqlEnum(['success','failed']).notNull(),
	recipientCount: int().default(0).notNull(),
	fileUrl: varchar({ length: 500 }),
	errorMessage: text(),
	executionTimeMs: int(),
	successCount: int().default(0).notNull(),
	failedCount: int().default(0).notNull(),
	reportFileUrl: varchar({ length: 1024 }),
	reportFileSizeKb: int().default(0),
	generationTimeMs: int().default(0),
});

// Legacy MMS scheduled reports - kept for backward compatibility
export const mmsScheduledReports = mysqlTable("mms_scheduled_reports", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	reportType: mysqlEnum(['oee','cpk','oee_cpk_combined','production_summary']).notNull(),
	frequency: mysqlEnum(['daily','weekly','monthly']).notNull(),
	dayOfWeek: int(),
	dayOfMonth: int(),
	timeOfDay: varchar({ length: 5 }).default('08:00').notNull(),
	recipients: text().notNull(),
	machineIds: text(),
	productionLineIds: text(),
	includeCharts: int().default(1).notNull(),
	includeTrends: int().default(1).notNull(),
	includeAlerts: int().default(1).notNull(),
	format: mysqlEnum(['html','excel','pdf']).default('html').notNull(),
	lastSentAt: timestamp({ mode: 'string' }),
	lastSentStatus: mysqlEnum(['success','failed','pending']),
	lastSentError: text(),
	isActive: int().default(1).notNull(),
	createdBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const securityAuditLogs = mysqlTable("security_audit_logs", {
	id: int().autoincrement().notNull(),
	eventId: varchar("event_id", { length: 64 }).notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	eventCategory: mysqlEnum("event_category", ['authentication','authorization','data_access','configuration','system']).default('system').notNull(),
	severity: mysqlEnum(['info','warning','error','critical']).default('info').notNull(),
	userId: int("user_id"),
	username: varchar({ length: 100 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	resource: varchar({ length: 255 }),
	action: varchar({ length: 50 }),
	outcome: mysqlEnum(['success','failure','blocked']).default('success').notNull(),
	details: text(),
	riskScore: int("risk_score"),
	geoLocation: varchar("geo_location", { length: 100 }),
	deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("security_audit_logs_event_id_unique").on(table.eventId),
]);

export const securitySettings = mysqlTable("security_settings", {
	id: int().autoincrement().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: varchar("setting_value", { length: 255 }).notNull(),
	description: varchar({ length: 500 }),
	updatedBy: int("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("setting_key").on(table.settingKey),
]);

export const shiftReports = mysqlTable("shift_reports", {
	id: int().autoincrement().notNull(),
	shiftDate: timestamp({ mode: 'string' }).notNull(),
	shiftType: mysqlEnum(['morning','afternoon','night']).notNull(),
	shiftStart: timestamp({ mode: 'string' }).notNull(),
	shiftEnd: timestamp({ mode: 'string' }).notNull(),
	productionLineId: int(),
	machineId: int(),
	oee: decimal({ precision: 5, scale: 2 }),
	availability: decimal({ precision: 5, scale: 2 }),
	performance: decimal({ precision: 5, scale: 2 }),
	quality: decimal({ precision: 5, scale: 2 }),
	cpk: decimal({ precision: 6, scale: 4 }),
	cp: decimal({ precision: 6, scale: 4 }),
	ppk: decimal({ precision: 6, scale: 4 }),
	totalProduced: int().default(0),
	goodCount: int().default(0),
	defectCount: int().default(0),
	plannedTime: int().default(0),
	actualRunTime: int().default(0),
	downtime: int().default(0),
	alertCount: int().default(0),
	spcViolationCount: int().default(0),
	status: mysqlEnum(['generated','sent','failed']).default('generated'),
	sentAt: timestamp({ mode: 'string' }),
	sentTo: text(),
	reportContent: text(),
	reportFileUrl: varchar({ length: 500 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const slowQueryLogs = mysqlTable("slow_query_logs", {
	id: int().autoincrement().notNull(),
	queryHash: varchar("query_hash", { length: 64 }).notNull(),
	queryText: text("query_text").notNull(),
	executionTime: int("execution_time").notNull(),
	rowsExamined: int("rows_examined"),
	rowsReturned: int("rows_returned"),
	connectionId: varchar("connection_id", { length: 100 }),
	userId: int("user_id"),
	databaseName: varchar("database_name", { length: 100 }),
	tableName: varchar("table_name", { length: 100 }),
	queryType: mysqlEnum("query_type", ['SELECT','INSERT','UPDATE','DELETE','OTHER']).default('SELECT'),
	isOptimized: int("is_optimized").default(0).notNull(),
	optimizationSuggestion: text("optimization_suggestion"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const smsConfigs = mysqlTable("sms_configs", {
	id: int().autoincrement().notNull(),
	provider: mysqlEnum(['twilio','vonage','custom']).default('twilio').notNull(),
	enabled: int().default(0).notNull(),
	twilioAccountSid: varchar("twilio_account_sid", { length: 100 }),
	twilioAuthToken: varchar("twilio_auth_token", { length: 255 }),
	twilioFromNumber: varchar("twilio_from_number", { length: 20 }),
	vonageApiKey: varchar("vonage_api_key", { length: 100 }),
	vonageApiSecret: varchar("vonage_api_secret", { length: 255 }),
	vonageFromNumber: varchar("vonage_from_number", { length: 20 }),
	customWebhookUrl: varchar("custom_webhook_url", { length: 500 }),
	customWebhookMethod: mysqlEnum("custom_webhook_method", ['GET','POST']).default('POST'),
	customWebhookHeaders: text("custom_webhook_headers"),
	customWebhookBodyTemplate: text("custom_webhook_body_template"),
	createdBy: int("created_by"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const smsLogs = mysqlTable("sms_logs", {
	id: int().autoincrement().notNull(),
	provider: varchar({ length: 20 }).notNull(),
	toNumber: varchar("to_number", { length: 20 }).notNull(),
	message: text().notNull(),
	status: mysqlEnum(['pending','sent','failed']).default('pending').notNull(),
	messageId: varchar("message_id", { length: 100 }),
	errorMessage: text("error_message"),
	escalationId: int("escalation_id"),
	alertId: int("alert_id"),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	escalationLevel: int("escalation_level"),
},
(table) => [
	index("idx_sms_status").on(table.status),
	index("idx_sms_escalation").on(table.escalationId),
	index("idx_sms_created").on(table.createdAt),
]);

export const smtpConfig = mysqlTable("smtp_config", {
	id: int().autoincrement().notNull(),
	host: varchar({ length: 255 }).notNull(),
	port: int().default(587).notNull(),
	secure: int().default(0).notNull(),
	username: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	fromEmail: varchar({ length: 320 }).notNull(),
	fromName: varchar({ length: 255 }).default('SPC/CPK Calculator').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const spareParts = mysqlTable("spare_parts", {
	id: int().autoincrement().notNull(),
	partNumber: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	machineTypeId: int(),
	supplierId: int(),
	specifications: text(),
	unit: varchar({ length: 50 }).default('pcs'),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	currency: varchar({ length: 10 }).default('VND'),
	minStock: int().default(0),
	maxStock: int(),
	reorderPoint: int(),
	reorderQuantity: int(),
	location: varchar({ length: 100 }),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	emailAlertThreshold: int().default(0),
});

export const sparePartsInventory = mysqlTable("spare_parts_inventory", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	warehouseId: int(),
	quantity: int().default(0).notNull(),
	reservedQuantity: int().default(0).notNull(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	availableQuantity: int().default(0),
	lastStockCheck: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("idx_spare_parts_inventory_sparePartId").on(table.sparePartId),
	index("idx_inventory_part").on(table.sparePartId),
]);

export const sparePartsInventoryCheckItems = mysqlTable("spare_parts_inventory_check_items", {
	id: int().autoincrement().notNull(),
	checkId: int().notNull(),
	sparePartId: int().notNull(),
	systemQuantity: int().notNull(),
	actualQuantity: int(),
	discrepancy: int(),
	unitPrice: decimal({ precision: 12, scale: 2 }),
	systemValue: decimal({ precision: 14, scale: 2 }),
	actualValue: decimal({ precision: 14, scale: 2 }),
	status: mysqlEnum(['pending','counted','verified','adjusted']).default('pending'),
	notes: text(),
	countedBy: int(),
	countedAt: timestamp({ mode: 'string' }),
	verifiedBy: int(),
	verifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const sparePartsInventoryChecks = mysqlTable("spare_parts_inventory_checks", {
	id: int().autoincrement().notNull(),
	checkNumber: varchar({ length: 50 }).notNull(),
	checkDate: timestamp({ mode: 'string' }).notNull(),
	checkType: mysqlEnum(['full','partial','cycle','spot']).default('full').notNull(),
	status: mysqlEnum(['draft','in_progress','completed','cancelled']).default('draft'),
	warehouseLocation: varchar({ length: 100 }),
	category: varchar({ length: 100 }),
	totalItems: int().default(0),
	checkedItems: int().default(0),
	matchedItems: int().default(0),
	discrepancyItems: int().default(0),
	totalSystemValue: decimal({ precision: 14, scale: 2 }),
	totalActualValue: decimal({ precision: 14, scale: 2 }),
	discrepancyValue: decimal({ precision: 14, scale: 2 }),
	notes: text(),
	completedAt: timestamp({ mode: 'string' }),
	completedBy: int(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const sparePartsStockMovements = mysqlTable("spare_parts_stock_movements", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	movementType: mysqlEnum(['purchase_in','return_in','transfer_in','adjustment_in','initial_in','work_order_out','transfer_out','adjustment_out','scrap_out','return_supplier']).notNull(),
	quantity: int().notNull(),
	beforeQuantity: int().notNull(),
	afterQuantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 14, scale: 2 }),
	referenceType: varchar({ length: 50 }),
	referenceId: int(),
	referenceNumber: varchar({ length: 100 }),
	fromLocation: varchar({ length: 100 }),
	toLocation: varchar({ length: 100 }),
	reason: text(),
	performedBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const sparePartsTransactions = mysqlTable("spare_parts_transactions", {
	id: int().autoincrement().notNull(),
	sparePartId: int().notNull(),
	transactionType: mysqlEnum(['in','out','adjustment','return']).notNull(),
	quantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	workOrderId: int(),
	purchaseOrderId: int(),
	reason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	performedBy: int(),
	exportPurpose: mysqlEnum(['repair','borrow','destroy','normal']).default('normal'),
	borrowerName: varchar({ length: 255 }),
	borrowerDepartment: varchar({ length: 255 }),
	expectedReturnDate: timestamp({ mode: 'string' }),
	actualReturnDate: timestamp({ mode: 'string' }),
	returnedQuantity: int().default(0),
	returnStatus: mysqlEnum(['pending','partial','completed']).default('pending'),
	relatedTransactionId: int(),
},
(table) => [
	index("idx_spare_parts_transactions_sparePartId").on(table.sparePartId),
]);

export const spcAnalysisHistory = mysqlTable("spc_analysis_history", {
	id: int().autoincrement().notNull(),
	mappingId: int().notNull(),
	productCode: varchar({ length: 100 }).notNull(),
	stationName: varchar({ length: 100 }).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	sampleCount: int().notNull(),
	mean: int().notNull(),
	stdDev: int().notNull(),
	cp: int(),
	cpk: int(),
	ucl: int(),
	lcl: int(),
	usl: int(),
	lsl: int(),
	alertTriggered: int().default(0).notNull(),
	llmAnalysis: text(),
	analyzedBy: int().notNull(),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	productionLineId: int("production_line_id"),
	violations: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_analysis_history_product_code").on(table.productCode),	index("idx_spc_analysis_history_station_name").on(table.stationName),
	index("idx_spc_analysis_history_created_at").on(table.createdAt),
	index("idx_spc_analysis_history_cpk").on(table.cpk),
	index("idx_spc_analysis_product").on(table.productCode),
	index("idx_spc_analysis_station").on(table.stationName),
	index("idx_spc_analysis_date").on(table.createdAt),
	index("idx_spc_analysis_mapping").on(table.mappingId),
	index("").on(table.stationName),
	index("idx_spc_analysis_history_mapping").on(table.mappingId),
	index("idx_spc_analysis_history_composite").on(table.productCode, table.stationName, table.createdAt),
	index("idx_spc_analysis_history_product").on(table.productCode, table.startDate),
	index("idx_spc_analysis_history_dates").on(table.startDate, table.endDate),
	index("idx_spc_history_mapping").on(table.mappingId),
	index("idx_spc_history_created").on(table.createdAt),
	index("idx_spc_history_mapping_created").on(table.mappingId, table.createdAt),
]);

export const spcDefectCategories = mysqlTable("spc_defect_categories", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	severity: varchar({ length: 20 }).default('medium').notNull(),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const spcDefectRecords = mysqlTable("spc_defect_records", {
	id: int().autoincrement().notNull(),
	defectCategoryId: int().notNull(),
	productionLineId: int(),
	workstationId: int(),
	productId: int(),
	spcAnalysisId: int(),
	ruleViolated: varchar({ length: 100 }),
	quantity: int().default(1).notNull(),
	notes: text(),
	occurredAt: timestamp({ mode: 'string' }).notNull(),
	reportedBy: int().notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedBy: int(),
	rootCause: text(),
	correctiveAction: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	verificationStatus: mysqlEnum(['pending','real_ng','ntf']).default('pending'),
	verifiedAt: timestamp({ mode: 'string' }),
	verifiedBy: int(),
	verificationNotes: text(),
	ntfReason: varchar({ length: 200 }),
},
(table) => [
	index("idx_spc_defect_records_production_line").on(table.productionLineId),
	index("idx_spc_defect_records_created_at").on(table.createdAt),
	index("idx_spc_defect_records_status").on(table.verificationStatus),
	index("idx_spc_defects_category").on(table.defectCategoryId, table.occurredAt),
	index("idx_spc_defects_status").on(table.status, table.occurredAt),
	index("idx_spc_defects_line").on(table.productionLineId, table.occurredAt),
]);

export const spcPlanExecutionLogs = mysqlTable("spc_plan_execution_logs", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	executedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	status: mysqlEnum(['success','failed','partial']).notNull(),
	sampleCount: int().default(0).notNull(),
	violationCount: int().default(0).notNull(),
	cpkValue: int(),
	meanValue: int(),
	stdDevValue: int(),
	errorMessage: text(),
	notificationSent: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_exec_plan").on(table.planId, table.executedAt),
	index("idx_spc_exec_status").on(table.status, table.executedAt),
]);

export const spcPlanTemplates = mysqlTable("spc_plan_templates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	measurementName: varchar({ length: 255 }),
	usl: decimal({ precision: 15, scale: 6 }),
	lsl: decimal({ precision: 15, scale: 6 }),
	target: decimal({ precision: 15, scale: 6 }),
	unit: varchar({ length: 50 }),
	sampleSize: int().default(5),
	sampleFrequency: int().default(60),
	enabledSpcRules: text(),
	enabledCpkRules: text(),
	enabledCaRules: text(),
	isRecurring: int().default(1),
	notifyOnViolation: int().default(1),
	createdBy: int(),
	isPublic: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const spcRealtimeData = mysqlTable("spc_realtime_data", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	productionLineId: int().notNull(),
	mappingId: int(),
	sampleIndex: int().notNull(),
	sampleValue: int().notNull(),
	subgroupIndex: int().notNull(),
	subgroupMean: int(),
	subgroupRange: int(),
	ucl: int(),
	lcl: int(),
	usl: int(),
	lsl: int(),
	centerLine: int(),
	isOutOfSpec: int().default(0).notNull(),
	isOutOfControl: int().default(0).notNull(),
	violatedRules: varchar({ length: 100 }),
	sampledAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_realtime_plan").on(table.planId),
	index("idx_spc_realtime_line").on(table.productionLineId),
	index("idx_spc_realtime_sampled").on(table.sampledAt),
	index("idx_realtime_plan").on(table.planId),
	index("idx_realtime_sampled").on(table.sampledAt),
	index("idx_realtime_plan_sampled").on(table.planId, table.sampledAt),
]);

export const spcRuleViolations = mysqlTable("spc_rule_violations", {
	id: int().autoincrement().notNull(),
	analysisId: int().notNull(),
	ruleNumber: int().notNull(),
	ruleName: varchar({ length: 255 }).notNull(),
	violationDescription: text(),
	dataPointIndex: int(),
	dataPointValue: int(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_spc_violations_analysis").on(table.analysisId, table.severity),
]);

export const spcRules = mysqlTable("spc_rules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }).default('western_electric').notNull(),
	formula: text(),
	example: text(),
	severity: mysqlEnum(['warning','critical']).default('warning').notNull(),
	threshold: int(),
	consecutivePoints: int(),
	sigmaLevel: int(),
	isEnabled: int().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("spc_rules_code_unique").on(table.code),
]);

export const spcRulesConfig = mysqlTable("spc_rules_config", {
	id: int().autoincrement().notNull(),
	mappingId: int(),
	rule1Enabled: int().default(1).notNull(),
	rule2Enabled: int().default(1).notNull(),
	rule3Enabled: int().default(1).notNull(),
	rule4Enabled: int().default(1).notNull(),
	rule5Enabled: int().default(1).notNull(),
	rule6Enabled: int().default(1).notNull(),
	rule7Enabled: int().default(1).notNull(),
	rule8Enabled: int().default(1).notNull(),
	caRulesEnabled: int().default(1).notNull(),
	caThreshold: int().default(100).notNull(),
	cpkExcellent: int().default(167).notNull(),
	cpkGood: int().default(133).notNull(),
	cpkAcceptable: int().default(100).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const spcSamplingPlans = mysqlTable("spc_sampling_plans", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productionLineId: int().notNull(),
	productId: int(),
	workstationId: int(),
	samplingConfigId: int().notNull(),
	specificationId: int(),
	startTime: timestamp({ mode: 'string' }),
	endTime: timestamp({ mode: 'string' }),
	isRecurring: int().default(1).notNull(),
	status: mysqlEnum(['draft','active','paused','completed']).default('draft').notNull(),
	lastRunAt: timestamp({ mode: 'string' }),
	nextRunAt: timestamp({ mode: 'string' }),
	notifyOnViolation: int().default(1).notNull(),
	notifyEmail: varchar({ length: 320 }),
	isActive: int().default(1).notNull(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	mappingId: int(),
	machineId: int(),
	fixtureId: int(),
	enabledSpcRules: text(),
	enabledCaRules: text(),
	enabledCpkRules: text(),
	alertThresholdId: int(),
	cpkAlertEnabled: int().default(0).notNull(),
	cpkUpperLimit: varchar({ length: 20 }),
	cpkLowerLimit: varchar({ length: 20 }),
},
(table) => [
	index("idx_spc_sampling_plans_status").on(table.status),
	index("idx_spc_sampling_plans_production_line").on(table.productionLineId),
	index("").on(table.productionLineId),
	index("idx_spc_sampling_plans_product").on(table.productId),
	index("idx_spc_sampling_plans_active").on(table.isActive),
]);

export const spcSummaryStats = mysqlTable("spc_summary_stats", {
	id: int().autoincrement().notNull(),
	planId: int().notNull(),
	productionLineId: int().notNull(),
	mappingId: int(),
	periodType: mysqlEnum(['shift','day','week','month']).notNull(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	sampleCount: int().default(0).notNull(),
	subgroupCount: int().default(0).notNull(),
	mean: int(),
	stdDev: int(),
	min: int(),
	max: int(),
	range: int(),
	cp: int(),
	cpk: int(),
	pp: int(),
	ppk: int(),
	ca: int(),
	xBarUcl: int(),
	xBarLcl: int(),
	rUcl: int(),
	rLcl: int(),
	outOfSpecCount: int().default(0).notNull(),
	outOfControlCount: int().default(0).notNull(),
	rule1Violations: int().default(0).notNull(),
	rule2Violations: int().default(0).notNull(),
	rule3Violations: int().default(0).notNull(),
	rule4Violations: int().default(0).notNull(),
	rule5Violations: int().default(0).notNull(),
	rule6Violations: int().default(0).notNull(),
	rule7Violations: int().default(0).notNull(),
	rule8Violations: int().default(0).notNull(),
	overallStatus: mysqlEnum(['excellent','good','acceptable','needs_improvement','critical']).default('good').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_spc_summary_plan").on(table.planId),
	index("idx_spc_summary_line").on(table.productionLineId),
	index("idx_spc_summary_period").on(table.periodType, table.periodStart),
	index("idx_summary_plan").on(table.planId),
	index("idx_summary_period").on(table.periodStart),
	index("idx_summary_plan_period").on(table.planId, table.periodStart),
]);

export const structuredLogs = mysqlTable("structured_logs", {
	id: int().autoincrement().notNull(),
	logId: varchar("log_id", { length: 64 }).notNull(),
	level: mysqlEnum(['trace','debug','info','warn','error','fatal']).default('info').notNull(),
	message: text().notNull(),
	category: varchar({ length: 50 }),
	service: varchar({ length: 50 }),
	traceId: varchar("trace_id", { length: 64 }),
	spanId: varchar("span_id", { length: 64 }),
	parentSpanId: varchar("parent_span_id", { length: 64 }),
	userId: int("user_id"),
	sessionId: varchar("session_id", { length: 64 }),
	requestId: varchar("request_id", { length: 64 }),
	duration: int(),
	metadata: text(),
	tags: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const suppliers = mysqlTable("suppliers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	contactPerson: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	address: text(),
	website: varchar({ length: 255 }),
	paymentTerms: varchar({ length: 100 }),
	leadTimeDays: int(),
	rating: int().default(3),
	notes: text(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const systemConfig = mysqlTable("system_config", {
	id: int().autoincrement().notNull(),
	configKey: varchar({ length: 100 }).notNull(),
	configValue: text(),
	configType: varchar({ length: 50 }).default('string').notNull(),
	description: text(),
	isEncrypted: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("system_config_configKey_unique").on(table.configKey),
]);

export const systemModules = mysqlTable("system_modules", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	systemType: mysqlEnum(['mms','spc','system','common']).default('common').notNull(),
	parentId: int(),
	icon: varchar({ length: 100 }),
	path: varchar({ length: 255 }),
	sortOrder: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("code").on(table.code),
]);

export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text(),
	description: text(),
	updatedBy: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("system_settings_key_unique").on(table.key),
]);

export const teams = mysqlTable("teams", {
	id: int().autoincrement().notNull(),
	departmentId: int().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	leaderId: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const technicians = mysqlTable("technicians", {
	id: int().autoincrement().notNull(),
	userId: int(),
	employeeCode: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	specialization: varchar({ length: 255 }),
	skillLevel: mysqlEnum(['junior','intermediate','senior','expert']).default('intermediate'),
	isAvailable: int().default(1).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const telegramConfig = mysqlTable("telegram_config", {
	id: int().autoincrement().notNull(),
	botToken: varchar("bot_token", { length: 255 }).notNull(),
	chatId: varchar("chat_id", { length: 100 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	isActive: int("is_active").default(1).notNull(),
	alertTypes: json("alert_types"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const telegramMessageHistory = mysqlTable("telegram_message_history", {
	id: int().autoincrement().notNull(),
	configId: int("config_id").notNull(),
	messageType: varchar("message_type", { length: 50 }).notNull(),
	content: text().notNull(),
	status: mysqlEnum(['sent','failed','pending']).default('pending').notNull(),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const trustedDevices = mysqlTable("trusted_devices", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const twilioConfig = mysqlTable("twilio_config", {
	id: int().autoincrement().notNull(),
	accountSid: varchar("account_sid", { length: 100 }),
	authToken: varchar("auth_token", { length: 100 }),
	fromNumber: varchar("from_number", { length: 50 }),
	enabled: int().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const twoFactorAuth = mysqlTable("two_factor_auth", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	secret: varchar({ length: 255 }).notNull(),
	isEnabled: int("is_enabled").default(0).notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id").on(table.userId),
]);

export const twoFactorBackupCodes = mysqlTable("two_factor_backup_codes", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	code: varchar({ length: 20 }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const userChartConfigs = mysqlTable("user_chart_configs", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	chartType: varchar("chart_type", { length: 50 }).notNull(),
	configName: varchar("config_name", { length: 100 }).notNull(),
	isDefault: int("is_default").default(0).notNull(),
	settings: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userDashboardConfigs = mysqlTable("user_dashboard_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	widgetKey: varchar({ length: 100 }).notNull(),
	isVisible: int().default(1).notNull(),
	displayOrder: int().default(0).notNull(),
	config: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userLineAssignments = mysqlTable("user_line_assignments", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	productionLineId: int().notNull(),
	displayOrder: int().default(0).notNull(),
	isVisible: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userPermissions = mysqlTable("user_permissions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	permissionId: int().notNull(),
	granted: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const userPredictionConfigs = mysqlTable("user_prediction_configs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	configType: mysqlEnum(['oee','cpk','spc']).notNull(),
	configName: varchar({ length: 100 }).notNull(),
	algorithm: mysqlEnum(['linear','moving_avg','exp_smoothing']).default('linear').notNull(),
	predictionDays: int().default(14).notNull(),
	confidenceLevel: decimal({ precision: 5, scale: 2 }).default('95.00').notNull(),
	alertThreshold: decimal({ precision: 5, scale: 2 }).default('5.00').notNull(),
	movingAvgWindow: int().default(7),
	smoothingFactor: decimal({ precision: 3, scale: 2 }).default('0.30'),
	historicalDays: int().default(30).notNull(),
	isDefault: int().default(0).notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userQuickAccess = mysqlTable("user_quick_access", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	menuId: varchar("menu_id", { length: 100 }).notNull(),
	menuPath: varchar("menu_path", { length: 255 }).notNull(),
	menuLabel: varchar("menu_label", { length: 100 }).notNull(),
	menuIcon: varchar("menu_icon", { length: 50 }),
	systemId: varchar("system_id", { length: 50 }),
	sortOrder: int("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	categoryId: int("category_id"),
	isPinned: int("is_pinned").default(0).notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
	index("unique_user_menu").on(table.userId, table.menuId),
	index("idx_user_quick_access_user_order").on(table.userId, table.sortOrder),
]);

export const userQuickAccessCategories = mysqlTable("user_quick_access_categories", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 100 }).notNull(),
	icon: varchar({ length: 50 }).default('Folder'),
	color: varchar({ length: 20 }).default('blue'),
	sortOrder: int("sort_order").default(0).notNull(),
	isExpanded: int("is_expanded").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const userSessions = mysqlTable("user_sessions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	authType: mysqlEnum("auth_type", ['local','manus']).default('local').notNull(),
	token: varchar({ length: 500 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceType: varchar("device_type", { length: 50 }),
	deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
	browser: varchar({ length: 100 }),
	os: varchar({ length: 100 }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	location: varchar({ length: 255 }),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const userSpcChartPreferences = mysqlTable("user_spc_chart_preferences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	showXbarChart: int("show_xbar_chart").default(1).notNull(),
	showRChart: int("show_r_chart").default(1).notNull(),
	showHistogram: int("show_histogram").default(1).notNull(),
	showSampleTable: int("show_sample_table").default(1).notNull(),
	showCusumChart: int("show_cusum_chart").default(0).notNull(),
	showEwmaChart: int("show_ewma_chart").default(0).notNull(),
	showNormalProbabilityPlot: int("show_normal_probability_plot").default(0).notNull(),
	showBoxPlot: int("show_box_plot").default(0).notNull(),
	showCapabilityGauge: int("show_capability_gauge").default(0).notNull(),
	showCapabilityPieChart: int("show_capability_pie_chart").default(0).notNull(),
	showRunChart: int("show_run_chart").default(0).notNull(),
	showMovingAverageChart: int("show_moving_average_chart").default(0).notNull(),
	showSpecComparison: int("show_spec_comparison").default(0).notNull(),
	showSigmaZonesChart: int("show_sigma_zones_chart").default(0).notNull(),
	chartLayout: varchar("chart_layout", { length: 20 }).default('grid'),
	defaultTimeRange: int("default_time_range").default(7),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_id").on(table.userId),
]);

export const userThemePreferences = mysqlTable("user_theme_preferences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	themeId: varchar("theme_id", { length: 50 }).default('default-blue').notNull(),
	isDarkMode: int("is_dark_mode").default(0).notNull(),
	customThemeId: int("custom_theme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_theme_unique").on(table.userId),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','manager','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	avatar: varchar({ length: 500 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export const validationRuleLogs = mysqlTable("validation_rule_logs", {
	id: int().autoincrement().notNull(),
	ruleId: int().notNull(),
	productId: int(),
	workstationId: int(),
	machineId: int(),
	inputValue: varchar({ length: 500 }),
	passed: int().default(1).notNull(),
	violationDetails: text(),
	actionTaken: varchar({ length: 100 }),
	executedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	executedBy: int(),
},
(table) => [
	index("idx_validation_rule").on(table.ruleId),
	index("idx_validation_executed").on(table.executedAt),
]);

export const videoTutorials = mysqlTable("video_tutorials", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	youtubeUrl: varchar("youtube_url", { length: 500 }).notNull(),
	youtubeId: varchar("youtube_id", { length: 50 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	duration: varchar({ length: 20 }),
	category: varchar({ length: 100 }).notNull(),
	level: mysqlEnum(['beginner','intermediate','advanced']).default('beginner').notNull(),
	sortOrder: int("sort_order").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	viewCount: int("view_count").default(0).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const webhookConfig = mysqlTable("webhook_config", {
	id: int().autoincrement().notNull(),
	slackWebhookUrl: varchar("slack_webhook_url", { length: 500 }),
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackEnabled: int("slack_enabled").default(0).notNull(),
	teamsWebhookUrl: varchar("teams_webhook_url", { length: 500 }),
	teamsEnabled: int("teams_enabled").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const webhookEscalationLogs = mysqlTable("webhook_escalation_logs", {
	id: int().autoincrement().notNull(),
	ruleId: int("rule_id").notNull(),
	sourceWebhookId: int("source_webhook_id").notNull(),
	originalAlertId: int("original_alert_id"),
	originalAlertType: varchar("original_alert_type", { length: 50 }),
	currentLevel: int("current_level").default(1).notNull(),
	escalatedAt: timestamp("escalated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	targetType: varchar("target_type", { length: 20 }).notNull(),
	targetValue: varchar("target_value", { length: 500 }).notNull(),
	status: mysqlEnum(['pending','sent','acknowledged','resolved','failed']).default('pending').notNull(),
	responseCode: int("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: int("resolved_by"),
	resolutionNote: text("resolution_note"),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_rule").on(table.ruleId),
	index("idx_source_webhook").on(table.sourceWebhookId),
	index("idx_status").on(table.status),
	index("idx_created_at").on(table.createdAt),
]);

export const webhookEscalationRules = mysqlTable("webhook_escalation_rules", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	sourceWebhookId: int("source_webhook_id").notNull(),
	triggerAfterFailures: int("trigger_after_failures").default(3).notNull(),
	triggerAfterMinutes: int("trigger_after_minutes").default(15).notNull(),
	level1Targets: json("level1_targets"),
	level1DelayMinutes: int("level1_delay_minutes").default(0).notNull(),
	level2Targets: json("level2_targets"),
	level2DelayMinutes: int("level2_delay_minutes").default(15).notNull(),
	level3Targets: json("level3_targets"),
	level3DelayMinutes: int("level3_delay_minutes").default(30).notNull(),
	autoResolveOnSuccess: int("auto_resolve_on_success").default(1).notNull(),
	notifyOnEscalate: int("notify_on_escalate").default(1).notNull(),
	notifyOnResolve: int("notify_on_resolve").default(1).notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_source_webhook").on(table.sourceWebhookId),
	index("idx_active").on(table.isActive),
]);

export const webhookLogs = mysqlTable("webhook_logs", {
	id: int().autoincrement().notNull(),
	webhookId: int().notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	payload: text().notNull(),
	responseStatus: int(),
	responseBody: text(),
	success: int().default(0).notNull(),
	errorMessage: text(),
	sentAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	retryCount: int().default(0).notNull(),
	maxRetries: int().default(5).notNull(),
	nextRetryAt: timestamp({ mode: 'string' }),
	lastRetryAt: timestamp({ mode: 'string' }),
	retryStatus: varchar({ length: 20 }).default('none'),
});

export const webhookSubscriptionsV2 = mysqlTable("webhook_subscriptions_v2", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	secret: varchar({ length: 255 }),
	events: text().notNull(),
	filters: text(),
	headers: text(),
	retryCount: int("retry_count").default(3).notNull(),
	retryDelayMs: int("retry_delay_ms").default(5000).notNull(),
	timeoutMs: int("timeout_ms").default(30000).notNull(),
	isActive: int("is_active").default(1).notNull(),
	lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
	lastStatus: varchar("last_status", { length: 50 }),
	failureCount: int("failure_count").default(0).notNull(),
	createdBy: int("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const webhooks = mysqlTable("webhooks", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	url: text().notNull(),
	webhookType: mysqlEnum(['slack','teams','custom']).default('custom').notNull(),
	secret: varchar({ length: 255 }),
	headers: text(),
	events: text().notNull(),
	isActive: int().default(1).notNull(),
	triggerCount: int().default(0).notNull(),
	lastTriggeredAt: timestamp({ mode: 'string' }),
	lastError: text(),
	createdBy: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const weeklyKpiSnapshots = mysqlTable("weekly_kpi_snapshots", {
	id: int().autoincrement().notNull(),
	productionLineId: int("production_line_id").notNull(),
	weekNumber: int("week_number").notNull(),
	year: int().notNull(),
	weekStartDate: timestamp("week_start_date", { mode: 'string' }).notNull(),
	weekEndDate: timestamp("week_end_date", { mode: 'string' }).notNull(),
	avgCpk: decimal("avg_cpk", { precision: 6, scale: 4 }),
	minCpk: decimal("min_cpk", { precision: 6, scale: 4 }),
	maxCpk: decimal("max_cpk", { precision: 6, scale: 4 }),
	avgOee: decimal("avg_oee", { precision: 5, scale: 2 }),
	minOee: decimal("min_oee", { precision: 5, scale: 2 }),
	maxOee: decimal("max_oee", { precision: 5, scale: 2 }),
	avgDefectRate: decimal("avg_defect_rate", { precision: 5, scale: 2 }),
	totalSamples: int("total_samples").default(0).notNull(),
	totalDefects: int("total_defects").default(0).notNull(),
	shiftData: text("shift_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const workOrderParts = mysqlTable("work_order_parts", {
	id: int().autoincrement().notNull(),
	workOrderId: int().notNull(),
	sparePartId: int().notNull(),
	quantity: int().notNull(),
	unitCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const workOrders = mysqlTable("work_orders", {
	id: int().autoincrement().notNull(),
	workOrderNumber: varchar({ length: 50 }).notNull(),
	machineId: int().notNull(),
	maintenanceTypeId: int().notNull(),
	scheduleId: int(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
	status: mysqlEnum(['pending','assigned','in_progress','on_hold','completed','cancelled']).default('pending'),
	reportedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	scheduledStartAt: timestamp({ mode: 'string' }),
	actualStartAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	reportedBy: int(),
	assignedTo: int(),
	completedBy: int(),
	laborHours: decimal({ precision: 6, scale: 2 }),
	laborCost: decimal({ precision: 12, scale: 2 }),
	partsCost: decimal({ precision: 12, scale: 2 }),
	totalCost: decimal({ precision: 12, scale: 2 }),
	rootCause: text(),
	actionTaken: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_work_orders_machineId").on(table.machineId),
	index("idx_work_orders_assignedTo").on(table.assignedTo),
	index("idx_work_orders_status").on(table.status),
]);

export const workstations = mysqlTable("workstations", {
	id: int().autoincrement().notNull(),
	productionLineId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	sequenceOrder: int().default(0).notNull(),
	cycleTime: int(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	imageUrl: varchar({ length: 500 }),
},
(table) => [
	index("idx_workstations_active").on(table.isActive),
]);


// ============ IoT Enhancement Tables ============

// IoT Device Groups
export const iotDeviceGroups = mysqlTable("iot_device_groups", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  parentGroupId: int("parent_group_id"),
  location: varchar({ length: 255 }),
  icon: varchar({ length: 50 }).default('folder'),
  color: varchar({ length: 20 }).default('#3b82f6'),
  sortOrder: int("sort_order").default(0),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_groups_parent").on(table.parentGroupId),
  index("idx_iot_groups_name").on(table.name),
]);

// IoT Device Templates
export const iotDeviceTemplates = mysqlTable("iot_device_templates", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
  manufacturer: varchar({ length: 100 }),
  model: varchar({ length: 100 }),
  protocol: mysqlEnum(['modbus_tcp','modbus_rtu','opc_ua','mqtt','http','tcp','serial']).notNull(),
  defaultConfig: json("default_config"),
  metricsConfig: json("metrics_config"),
  alertThresholds: json("alert_thresholds"),
  tags: json(),
  icon: varchar({ length: 50 }).default('cpu'),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_templates_device_type").on(table.deviceType),
  index("idx_iot_templates_protocol").on(table.protocol),
]);

// IoT Device Health Scores
export const iotDeviceHealth = mysqlTable("iot_device_health", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).default('100.00'),
  availabilityScore: decimal("availability_score", { precision: 5, scale: 2 }).default('100.00'),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('100.00'),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }).default('100.00'),
  uptimeHours: decimal("uptime_hours", { precision: 10, scale: 2 }).default('0'),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }).default('0'),
  errorCount: int("error_count").default(0),
  warningCount: int("warning_count").default(0),
  lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
  lastMaintenanceAt: timestamp("last_maintenance_at", { mode: 'string' }),
  nextMaintenanceAt: timestamp("next_maintenance_at", { mode: 'string' }),
  calculatedAt: timestamp("calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_iot_health_device").on(table.deviceId),
  index("idx_iot_health_score").on(table.healthScore),
  index("idx_iot_health_calculated").on(table.calculatedAt),
]);

// IoT Maintenance Schedules
export const iotMaintenanceSchedules = mysqlTable("iot_maintenance_schedules", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  maintenanceType: mysqlEnum("maintenance_type", ['preventive','corrective','predictive','calibration','inspection']).notNull(),
  priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
  scheduledDate: timestamp("scheduled_date", { mode: 'string' }).notNull(),
  estimatedDuration: int("estimated_duration").default(60),
  assignedTo: int("assigned_to"),
  status: mysqlEnum(['scheduled','in_progress','completed','cancelled','overdue']).default('scheduled'),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: int("completed_by"),
  notes: text(),
  partsUsed: json("parts_used"),
  cost: decimal({ precision: 12, scale: 2 }),
  recurrenceRule: varchar("recurrence_rule", { length: 255 }),
  nextOccurrence: timestamp("next_occurrence", { mode: 'string' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_maintenance_device").on(table.deviceId),
  index("idx_iot_maintenance_scheduled").on(table.scheduledDate),
  index("idx_iot_maintenance_status").on(table.status),
  index("idx_iot_maintenance_assigned").on(table.assignedTo),
]);

// IoT Device Firmware
export const iotDeviceFirmware = mysqlTable("iot_device_firmware", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  version: varchar({ length: 50 }).notNull(),
  releaseDate: timestamp("release_date", { mode: 'string' }),
  changelog: text(),
  fileUrl: varchar("file_url", { length: 500 }),
  fileSize: int("file_size"),
  checksum: varchar({ length: 64 }),
  status: mysqlEnum(['available','downloading','installing','installed','failed','rollback']).default('available'),
  installedAt: timestamp("installed_at", { mode: 'string' }),
  installedBy: int("installed_by"),
  previousVersion: varchar("previous_version", { length: 50 }),
  isCurrent: int("is_current").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_firmware_device").on(table.deviceId),
  index("idx_iot_firmware_version").on(table.version),
  index("idx_iot_firmware_status").on(table.status),
]);

// IoT Device Commissioning
export const iotDeviceCommissioning = mysqlTable("iot_device_commissioning", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  stepNumber: int("step_number").notNull(),
  stepName: varchar("step_name", { length: 100 }).notNull(),
  stepDescription: text("step_description"),
  status: mysqlEnum(['pending','in_progress','completed','failed','skipped']).default('pending'),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: int("completed_by"),
  verificationData: json("verification_data"),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_commissioning_device").on(table.deviceId),
  index("idx_iot_commissioning_step").on(table.stepNumber),
  index("idx_iot_commissioning_status").on(table.status),
]);

// IoT Alert Escalation Rules
export const iotAlertEscalationRules = mysqlTable("iot_alert_escalation_rules", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  alertType: varchar("alert_type", { length: 50 }),
  severityFilter: json("severity_filter"),
  deviceFilter: json("device_filter"),
  groupFilter: json("group_filter"),
  escalationLevels: json("escalation_levels").notNull(),
  cooldownMinutes: int("cooldown_minutes").default(30),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_escalation_alert_type").on(table.alertType),
  index("idx_iot_escalation_active").on(table.isActive),
]);

// IoT Alert Correlations
export const iotAlertCorrelations = mysqlTable("iot_alert_correlations", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  correlationWindowMinutes: int("correlation_window_minutes").default(5),
  sourceAlertPattern: json("source_alert_pattern").notNull(),
  relatedAlertPattern: json("related_alert_pattern").notNull(),
  actionType: mysqlEnum("action_type", ['suppress','merge','escalate','notify']).default('merge'),
  actionConfig: json("action_config"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT Analytics Reports
export const iotAnalyticsReports = mysqlTable("iot_analytics_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  reportType: mysqlEnum("report_type", ['device_health','energy_consumption','utilization','maintenance','alerts','custom']).notNull(),
  deviceIds: json("device_ids"),
  groupIds: json("group_ids"),
  metrics: json().notNull(),
  timeRange: varchar("time_range", { length: 50 }).default('7d'),
  aggregation: mysqlEnum(['minute','hour','day','week','month']).default('hour'),
  filters: json(),
  chartConfig: json("chart_config"),
  scheduleEnabled: int("schedule_enabled").default(0),
  scheduleFrequency: mysqlEnum("schedule_frequency", ['daily','weekly','monthly']),
  scheduleTime: varchar("schedule_time", { length: 10 }),
  recipients: json(),
  lastGeneratedAt: timestamp("last_generated_at", { mode: 'string' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_analytics_report_type").on(table.reportType),
  index("idx_iot_analytics_created_by").on(table.createdBy),
]);

// IoT Dashboard Widgets
export const iotDashboardWidgets = mysqlTable("iot_dashboard_widgets", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  widgetType: mysqlEnum("widget_type", ['device_status','health_score','alerts','chart','map','kpi','custom']).notNull(),
  title: varchar({ length: 100 }).notNull(),
  config: json().notNull(),
  position: json().notNull(),
  size: json().notNull(),
  refreshInterval: int("refresh_interval").default(30),
  isVisible: int("is_visible").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_iot_widgets_user").on(table.userId),
  index("idx_iot_widgets_type").on(table.widgetType),
]);

// Type exports for IoT Enhancement
export type IotDeviceGroup = typeof iotDeviceGroups.$inferSelect;
export type InsertIotDeviceGroup = typeof iotDeviceGroups.$inferInsert;
export type IotDeviceTemplate = typeof iotDeviceTemplates.$inferSelect;
export type InsertIotDeviceTemplate = typeof iotDeviceTemplates.$inferInsert;
export type IotDeviceHealthType = typeof iotDeviceHealth.$inferSelect;
export type InsertIotDeviceHealth = typeof iotDeviceHealth.$inferInsert;
export type IotMaintenanceSchedule = typeof iotMaintenanceSchedules.$inferSelect;
export type InsertIotMaintenanceSchedule = typeof iotMaintenanceSchedules.$inferInsert;
export type IotDeviceFirmwareType = typeof iotDeviceFirmware.$inferSelect;
export type InsertIotDeviceFirmware = typeof iotDeviceFirmware.$inferInsert;
export type IotDeviceCommissioningType = typeof iotDeviceCommissioning.$inferSelect;
export type InsertIotDeviceCommissioning = typeof iotDeviceCommissioning.$inferInsert;
export type IotAlertEscalationRule = typeof iotAlertEscalationRules.$inferSelect;
export type InsertIotAlertEscalationRule = typeof iotAlertEscalationRules.$inferInsert;
export type IotAlertCorrelationType = typeof iotAlertCorrelations.$inferSelect;
export type InsertIotAlertCorrelation = typeof iotAlertCorrelations.$inferInsert;
export type IotAnalyticsReportType = typeof iotAnalyticsReports.$inferSelect;
export type InsertIotAnalyticsReport = typeof iotAnalyticsReports.$inferInsert;
export type IotDashboardWidgetType = typeof iotDashboardWidgets.$inferSelect;
export type InsertIotDashboardWidget = typeof iotDashboardWidgets.$inferInsert;


// ============================================
// Phase 96: Advanced IoT Features
// ============================================

// IoT Firmware Packages - Quản lý firmware packages
export const iotFirmwarePackages = mysqlTable("iot_firmware_packages", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  version: varchar({ length: 50 }).notNull(),
  description: text(),
  deviceType: mysqlEnum("device_type", ['plc','sensor','gateway','hmi','scada','other']).notNull(),
  manufacturer: varchar({ length: 100 }),
  model: varchar({ length: 100 }),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: int("file_size").notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  checksumType: mysqlEnum("checksum_type", ['md5','sha1','sha256']).default('sha256'),
  releaseNotes: text("release_notes"),
  minRequiredVersion: varchar("min_required_version", { length: 50 }),
  isStable: int("is_stable").default(1).notNull(),
  isBeta: int("is_beta").default(0).notNull(),
  downloadCount: int("download_count").default(0),
  status: mysqlEnum(['draft','published','deprecated','archived']).default('draft'),
  publishedAt: timestamp("published_at", { mode: 'string' }),
  publishedBy: int("published_by"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_firmware_pkg_device_type").on(table.deviceType),
  index("idx_firmware_pkg_version").on(table.version),
  index("idx_firmware_pkg_status").on(table.status),
]);

// IoT OTA Deployments - Quản lý quá trình deploy firmware
export const iotOtaDeployments = mysqlTable("iot_ota_deployments", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  firmwarePackageId: int("firmware_package_id").notNull(),
  deploymentType: mysqlEnum("deployment_type", ['immediate','scheduled','phased']).default('immediate'),
  targetDeviceIds: json("target_device_ids").notNull(),
  targetGroupIds: json("target_group_ids"),
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
  phasedConfig: json("phased_config"),
  totalDevices: int("total_devices").default(0),
  successCount: int("success_count").default(0),
  failedCount: int("failed_count").default(0),
  pendingCount: int("pending_count").default(0),
  inProgressCount: int("in_progress_count").default(0),
  status: mysqlEnum(['draft','scheduled','in_progress','paused','completed','cancelled','failed']).default('draft'),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  rollbackEnabled: int("rollback_enabled").default(1).notNull(),
  rollbackOnFailurePercent: int("rollback_on_failure_percent").default(20),
  notifyOnComplete: int("notify_on_complete").default(1),
  notifyOnFailure: int("notify_on_failure").default(1),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_deployment_firmware").on(table.firmwarePackageId),
  index("idx_ota_deployment_status").on(table.status),
  index("idx_ota_deployment_scheduled").on(table.scheduledAt),
]);

// IoT OTA Device Status - Trạng thái cập nhật từng thiết bị
export const iotOtaDeviceStatus = mysqlTable("iot_ota_device_status", {
  id: int().autoincrement().primaryKey(),
  deploymentId: int("deployment_id").notNull(),
  deviceId: int("device_id").notNull(),
  previousVersion: varchar("previous_version", { length: 50 }),
  targetVersion: varchar("target_version", { length: 50 }).notNull(),
  status: mysqlEnum(['pending','downloading','downloaded','installing','verifying','completed','failed','rollback']).default('pending'),
  progress: int().default(0),
  downloadProgress: int("download_progress").default(0),
  installProgress: int("install_progress").default(0),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  retryCount: int("retry_count").default(0),
  maxRetries: int("max_retries").default(3),
  startedAt: timestamp("started_at", { mode: 'string' }),
  downloadedAt: timestamp("downloaded_at", { mode: 'string' }),
  installedAt: timestamp("installed_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  rolledBackAt: timestamp("rolled_back_at", { mode: 'string' }),
  logs: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_status_deployment").on(table.deploymentId),
  index("idx_ota_status_device").on(table.deviceId),
  index("idx_ota_status_status").on(table.status),
]);

// IoT Floor Plans - Sơ đồ mặt bằng nhà máy
export const iotFloorPlans = mysqlTable("iot_floor_plans", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  buildingName: varchar("building_name", { length: 100 }),
  floorNumber: int("floor_number").default(1),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  imageWidth: int("image_width").notNull(),
  imageHeight: int("image_height").notNull(),
  scaleMetersPerPixel: decimal("scale_meters_per_pixel", { precision: 10, scale: 6 }),
  originX: int("origin_x").default(0),
  originY: int("origin_y").default(0),
  rotation: int().default(0),
  metadata: json(),
  isActive: int("is_active").default(1).notNull(),
  sortOrder: int("sort_order").default(0),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_floor_plan_building").on(table.buildingName),
  index("idx_floor_plan_active").on(table.isActive),
]);

// IoT Floor Plan Zones - Vùng/khu vực trên sơ đồ
export const iotFloorPlanZones = mysqlTable("iot_floor_plan_zones", {
  id: int().autoincrement().primaryKey(),
  floorPlanId: int("floor_plan_id").notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  zoneType: mysqlEnum("zone_type", ['production','warehouse','office','maintenance','restricted','common']).default('production'),
  coordinates: json().notNull(),
  color: varchar({ length: 20 }).default('#3b82f6'),
  opacity: decimal({ precision: 3, scale: 2 }).default('0.30'),
  borderColor: varchar("border_color", { length: 20 }).default('#1d4ed8'),
  borderWidth: int("border_width").default(2),
  isClickable: int("is_clickable").default(1).notNull(),
  alertThreshold: int("alert_threshold").default(3),
  metadata: json(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_floor_zone_plan").on(table.floorPlanId),
  index("idx_floor_zone_type").on(table.zoneType),
]);

// IoT Device Positions - Vị trí thiết bị trên sơ đồ
export const iotDevicePositions = mysqlTable("iot_device_positions", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  floorPlanId: int("floor_plan_id").notNull(),
  zoneId: int("zone_id"),
  positionX: int("position_x").notNull(),
  positionY: int("position_y").notNull(),
  rotation: int().default(0),
  iconSize: int("icon_size").default(32),
  iconType: varchar("icon_type", { length: 50 }).default('default'),
  labelPosition: mysqlEnum("label_position", ['top','bottom','left','right','none']).default('bottom'),
  showLabel: int("show_label").default(1).notNull(),
  showStatus: int("show_status").default(1).notNull(),
  customIcon: varchar("custom_icon", { length: 500 }),
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_device_pos_device").on(table.deviceId),
  index("idx_device_pos_floor").on(table.floorPlanId),
  index("idx_device_pos_zone").on(table.zoneId),
]);

// IoT Prediction Models - Cấu hình model AI cho predictive maintenance
export const iotPredictionModels = mysqlTable("iot_prediction_models", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  modelType: mysqlEnum("model_type", ['health_decay','failure_prediction','anomaly_detection','remaining_life','maintenance_scheduling']).notNull(),
  targetDeviceTypes: json("target_device_types"),
  targetDeviceIds: json("target_device_ids"),
  targetGroupIds: json("target_group_ids"),
  inputFeatures: json("input_features").notNull(),
  outputMetric: varchar("output_metric", { length: 50 }).notNull(),
  algorithm: mysqlEnum(['linear_regression','random_forest','gradient_boosting','neural_network','lstm','arima','prophet']).default('gradient_boosting'),
  hyperparameters: json(),
  trainingConfig: json("training_config"),
  predictionHorizonDays: int("prediction_horizon_days").default(30),
  confidenceThreshold: decimal("confidence_threshold", { precision: 5, scale: 2 }).default('0.70'),
  alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }).default('0.80'),
  isActive: int("is_active").default(1).notNull(),
  lastTrainedAt: timestamp("last_trained_at", { mode: 'string' }),
  trainingAccuracy: decimal("training_accuracy", { precision: 5, scale: 4 }),
  validationAccuracy: decimal("validation_accuracy", { precision: 5, scale: 4 }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_pred_model_type").on(table.modelType),
  index("idx_pred_model_active").on(table.isActive),
]);

// IoT Maintenance Predictions - Kết quả dự đoán bảo trì
export const iotMaintenancePredictions = mysqlTable("iot_maintenance_predictions", {
  id: int().autoincrement().primaryKey(),
  modelId: int("model_id").notNull(),
  deviceId: int("device_id").notNull(),
  predictionType: mysqlEnum("prediction_type", ['failure','maintenance_needed','health_decline','anomaly','remaining_life']).notNull(),
  predictedDate: timestamp("predicted_date", { mode: 'string' }),
  predictedValue: decimal("predicted_value", { precision: 10, scale: 4 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }).notNull(),
  severity: mysqlEnum(['low','medium','high','critical']).default('medium'),
  currentHealthScore: decimal("current_health_score", { precision: 5, scale: 2 }),
  predictedHealthScore: decimal("predicted_health_score", { precision: 5, scale: 2 }),
  daysUntilMaintenance: int("days_until_maintenance"),
  contributingFactors: json("contributing_factors"),
  recommendedActions: json("recommended_actions"),
  llmAnalysis: text("llm_analysis"),
  status: mysqlEnum(['active','acknowledged','scheduled','resolved','expired']).default('active'),
  acknowledgedBy: int("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  scheduledMaintenanceId: int("scheduled_maintenance_id"),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  actualOutcome: text("actual_outcome"),
  wasAccurate: int("was_accurate"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_pred_model").on(table.modelId),
  index("idx_pred_device").on(table.deviceId),
  index("idx_pred_type").on(table.predictionType),
  index("idx_pred_status").on(table.status),
  index("idx_pred_severity").on(table.severity),
  index("idx_pred_date").on(table.predictedDate),
]);

// IoT Device Health History - Lịch sử health score để training AI
export const iotDeviceHealthHistory = mysqlTable("iot_device_health_history", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).notNull(),
  availabilityScore: decimal("availability_score", { precision: 5, scale: 2 }),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  uptimeHours: decimal("uptime_hours", { precision: 10, scale: 2 }),
  downtimeHours: decimal("downtime_hours", { precision: 10, scale: 2 }),
  errorCount: int("error_count").default(0),
  warningCount: int("warning_count").default(0),
  temperature: decimal({ precision: 6, scale: 2 }),
  vibration: decimal({ precision: 8, scale: 4 }),
  powerConsumption: decimal("power_consumption", { precision: 10, scale: 2 }),
  cycleCount: int("cycle_count"),
  operatingHours: decimal("operating_hours", { precision: 12, scale: 2 }),
  additionalMetrics: json("additional_metrics"),
  recordedAt: timestamp("recorded_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_health_hist_device").on(table.deviceId),
  index("idx_health_hist_recorded").on(table.recordedAt),
  index("idx_health_hist_score").on(table.healthScore),
]);

// Type exports for Phase 96
export type IotFirmwarePackage = typeof iotFirmwarePackages.$inferSelect;
export type InsertIotFirmwarePackage = typeof iotFirmwarePackages.$inferInsert;
export type IotOtaDeployment = typeof iotOtaDeployments.$inferSelect;
export type InsertIotOtaDeployment = typeof iotOtaDeployments.$inferInsert;
export type IotOtaDeviceStatus = typeof iotOtaDeviceStatus.$inferSelect;
export type InsertIotOtaDeviceStatus = typeof iotOtaDeviceStatus.$inferInsert;
export type IotFloorPlan = typeof iotFloorPlans.$inferSelect;
export type InsertIotFloorPlan = typeof iotFloorPlans.$inferInsert;
export type IotFloorPlanZone = typeof iotFloorPlanZones.$inferSelect;
export type InsertIotFloorPlanZone = typeof iotFloorPlanZones.$inferInsert;
export type IotDevicePosition = typeof iotDevicePositions.$inferSelect;
export type InsertIotDevicePosition = typeof iotDevicePositions.$inferInsert;
export type IotPredictionModel = typeof iotPredictionModels.$inferSelect;
export type InsertIotPredictionModel = typeof iotPredictionModels.$inferInsert;
export type IotMaintenancePrediction = typeof iotMaintenancePredictions.$inferSelect;
export type InsertIotMaintenancePrediction = typeof iotMaintenancePredictions.$inferInsert;
export type IotDeviceHealthHistory = typeof iotDeviceHealthHistory.$inferSelect;
export type InsertIotDeviceHealthHistory = typeof iotDeviceHealthHistory.$inferInsert;


// ============================================
// Phase 97: Advanced IoT Features - Part 2
// ============================================

// IoT OTA Schedules - Lịch cập nhật firmware tự động
export const iotOtaSchedules = mysqlTable("iot_ota_schedules", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  firmwarePackageId: int("firmware_package_id").notNull(),
  targetDeviceIds: json("target_device_ids").notNull(),
  targetGroupIds: json("target_group_ids"),
  scheduleType: mysqlEnum("schedule_type", ['once','daily','weekly','monthly']).default('once'),
  scheduledTime: varchar("scheduled_time", { length: 5 }).notNull(), // HH:MM format
  scheduledDate: timestamp("scheduled_date", { mode: 'string' }), // For 'once' type
  daysOfWeek: json("days_of_week"), // [0-6] for weekly, 0=Sunday
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  offPeakOnly: tinyint("off_peak_only").default(1),
  offPeakStartTime: varchar("off_peak_start_time", { length: 5 }).default('22:00'),
  offPeakEndTime: varchar("off_peak_end_time", { length: 5 }).default('06:00'),
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  maxConcurrentDevices: int("max_concurrent_devices").default(10),
  retryOnFailure: tinyint("retry_on_failure").default(1),
  maxRetries: int("max_retries").default(3),
  notifyBeforeMinutes: int("notify_before_minutes").default(30),
  notifyChannels: json("notify_channels"), // ['email','sms','webhook']
  status: mysqlEnum(['active','paused','completed','cancelled']).default('active'),
  lastRunAt: timestamp("last_run_at", { mode: 'string' }),
  nextRunAt: timestamp("next_run_at", { mode: 'string' }),
  totalRuns: int("total_runs").default(0),
  successfulRuns: int("successful_runs").default(0),
  failedRuns: int("failed_runs").default(0),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_ota_schedule_firmware").on(table.firmwarePackageId),
  index("idx_ota_schedule_status").on(table.status),
  index("idx_ota_schedule_next_run").on(table.nextRunAt),
]);

// IoT OTA Schedule Runs - Lịch sử chạy scheduled OTA
export const iotOtaScheduleRuns = mysqlTable("iot_ota_schedule_runs", {
  id: int().autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  deploymentId: int("deployment_id"), // Link to iot_ota_deployments
  runStartedAt: timestamp("run_started_at", { mode: 'string' }).notNull(),
  runCompletedAt: timestamp("run_completed_at", { mode: 'string' }),
  status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending'),
  totalDevices: int("total_devices").default(0),
  successCount: int("success_count").default(0),
  failedCount: int("failed_count").default(0),
  skippedCount: int("skipped_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_schedule_run_schedule").on(table.scheduleId),
  index("idx_schedule_run_status").on(table.status),
  index("idx_schedule_run_started").on(table.runStartedAt),
]);

// IoT 3D Floor Plans - Sơ đồ mặt bằng 3D
export const iot3dFloorPlans = mysqlTable("iot_3d_floor_plans", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  buildingName: varchar("building_name", { length: 100 }),
  floorNumber: int("floor_number").default(1),
  modelUrl: varchar("model_url", { length: 500 }).notNull(), // GLTF/GLB file URL
  modelFormat: mysqlEnum("model_format", ['gltf','glb','obj','fbx']).default('glb'),
  modelScale: decimal("model_scale", { precision: 10, scale: 4 }).default('1.0000'),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  cameraPosition: json("camera_position"), // {x, y, z}
  cameraTarget: json("camera_target"), // {x, y, z}
  lightingConfig: json("lighting_config"), // ambient, directional lights
  environmentMap: varchar("environment_map", { length: 500 }),
  floorDimensions: json("floor_dimensions"), // {width, height, depth}
  gridEnabled: tinyint("grid_enabled").default(1),
  gridSize: int("grid_size").default(10),
  status: mysqlEnum(['draft','active','archived']).default('draft'),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_floor_status").on(table.status),
  index("idx_3d_floor_building").on(table.buildingName),
]);

// IoT 3D Device Positions - Vị trí thiết bị trên mô hình 3D
export const iot3dDevicePositions = mysqlTable("iot_3d_device_positions", {
  id: int().autoincrement().primaryKey(),
  deviceId: int("device_id").notNull(),
  floorPlan3dId: int("floor_plan_3d_id").notNull(),
  positionX: decimal("position_x", { precision: 10, scale: 4 }).notNull(),
  positionY: decimal("position_y", { precision: 10, scale: 4 }).notNull(),
  positionZ: decimal("position_z", { precision: 10, scale: 4 }).notNull(),
  rotationX: decimal("rotation_x", { precision: 10, scale: 4 }).default('0'),
  rotationY: decimal("rotation_y", { precision: 10, scale: 4 }).default('0'),
  rotationZ: decimal("rotation_z", { precision: 10, scale: 4 }).default('0'),
  scale: decimal({ precision: 10, scale: 4 }).default('1.0000'),
  modelOverride: varchar("model_override", { length: 500 }), // Custom 3D model for device
  labelVisible: tinyint("label_visible").default(1),
  labelOffset: json("label_offset"), // {x, y, z}
  animationEnabled: tinyint("animation_enabled").default(1),
  animationType: mysqlEnum("animation_type", ['none','pulse','rotate','bounce','glow']).default('pulse'),
  interactionEnabled: tinyint("interaction_enabled").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_pos_device").on(table.deviceId),
  index("idx_3d_pos_floor").on(table.floorPlan3dId),
]);

// IoT Maintenance Work Orders - Phiếu công việc bảo trì
export const iotMaintenanceWorkOrders = mysqlTable("iot_maintenance_work_orders", {
  id: int().autoincrement().primaryKey(),
  workOrderNumber: varchar("work_order_number", { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  deviceId: int("device_id").notNull(),
  predictionId: int("prediction_id"), // Link to iot_maintenance_predictions
  scheduleId: int("schedule_id"), // Link to iot_maintenance_schedules
  workOrderType: mysqlEnum("work_order_type", ['predictive','preventive','corrective','emergency','inspection']).notNull(),
  priority: mysqlEnum(['low','medium','high','critical']).default('medium'),
  status: mysqlEnum(['created','assigned','in_progress','on_hold','completed','cancelled','verified']).default('created'),
  estimatedDuration: int("estimated_duration").default(60), // minutes
  actualDuration: int("actual_duration"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  requiredSkills: json("required_skills"), // ['electrical','mechanical','plc']
  requiredParts: json("required_parts"), // [{partId, quantity}]
  assignedTo: int("assigned_to"),
  assignedTeam: varchar("assigned_team", { length: 100 }),
  assignedAt: timestamp("assigned_at", { mode: 'string' }),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  verifiedBy: int("verified_by"),
  verifiedAt: timestamp("verified_at", { mode: 'string' }),
  dueDate: timestamp("due_date", { mode: 'string' }),
  completionNotes: text("completion_notes"),
  rootCause: text("root_cause"),
  actionsTaken: text("actions_taken"),
  preventiveMeasures: text("preventive_measures"),
  attachments: json(), // [{url, name, type}]
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_wo_number").on(table.workOrderNumber),
  index("idx_wo_device").on(table.deviceId),
  index("idx_wo_status").on(table.status),
  index("idx_wo_priority").on(table.priority),
  index("idx_wo_assigned").on(table.assignedTo),
  index("idx_wo_due_date").on(table.dueDate),
]);

// IoT Work Order Tasks - Các công việc chi tiết trong work order
export const iotWorkOrderTasks = mysqlTable("iot_work_order_tasks", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  taskNumber: int("task_number").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  estimatedDuration: int("estimated_duration").default(15), // minutes
  actualDuration: int("actual_duration"),
  status: mysqlEnum(['pending','in_progress','completed','skipped']).default('pending'),
  assignedTo: int("assigned_to"),
  completedBy: int("completed_by"),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  notes: text(),
  checklistItems: json("checklist_items"), // [{item, checked}]
  requiredTools: json("required_tools"),
  safetyPrecautions: text("safety_precautions"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_task_wo").on(table.workOrderId),
  index("idx_task_status").on(table.status),
  index("idx_task_assigned").on(table.assignedTo),
]);

// IoT Work Order Comments - Bình luận/ghi chú trong work order
export const iotWorkOrderComments = mysqlTable("iot_work_order_comments", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  userId: int("user_id").notNull(),
  comment: text().notNull(),
  attachments: json(),
  isInternal: tinyint("is_internal").default(0), // Internal notes vs visible to all
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_comment_wo").on(table.workOrderId),
  index("idx_comment_user").on(table.userId),
]);

// IoT Work Order History - Lịch sử thay đổi work order
export const iotWorkOrderHistory = mysqlTable("iot_work_order_history", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  userId: int("user_id"),
  action: varchar({ length: 50 }).notNull(), // 'created','status_changed','assigned','completed'
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  description: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_history_wo").on(table.workOrderId),
  index("idx_history_action").on(table.action),
]);

// IoT Technicians - Kỹ thuật viên bảo trì
export const iotTechnicians = mysqlTable("iot_technicians", {
  id: int().autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  employeeId: varchar("employee_id", { length: 50 }),
  department: varchar({ length: 100 }),
  skills: json(), // ['electrical','mechanical','plc','hvac']
  certifications: json(), // [{name, expiryDate}]
  experienceYears: int("experience_years").default(0),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  availability: mysqlEnum(['available','busy','on_leave','unavailable']).default('available'),
  currentWorkOrderId: int("current_work_order_id"),
  totalWorkOrders: int("total_work_orders").default(0),
  completedWorkOrders: int("completed_work_orders").default(0),
  avgCompletionTime: int("avg_completion_time"), // minutes
  rating: decimal({ precision: 3, scale: 2 }).default('5.00'),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 100 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_tech_user").on(table.userId),
  index("idx_tech_availability").on(table.availability),
  index("idx_tech_department").on(table.department),
]);

// Type exports for Phase 97
export type IotOtaSchedule = typeof iotOtaSchedules.$inferSelect;
export type InsertIotOtaSchedule = typeof iotOtaSchedules.$inferInsert;
export type IotOtaScheduleRun = typeof iotOtaScheduleRuns.$inferSelect;
export type InsertIotOtaScheduleRun = typeof iotOtaScheduleRuns.$inferInsert;
export type Iot3dFloorPlan = typeof iot3dFloorPlans.$inferSelect;
export type InsertIot3dFloorPlan = typeof iot3dFloorPlans.$inferInsert;
export type Iot3dDevicePosition = typeof iot3dDevicePositions.$inferSelect;
export type InsertIot3dDevicePosition = typeof iot3dDevicePositions.$inferInsert;
export type IotMaintenanceWorkOrder = typeof iotMaintenanceWorkOrders.$inferSelect;
export type InsertIotMaintenanceWorkOrder = typeof iotMaintenanceWorkOrders.$inferInsert;
export type IotWorkOrderTask = typeof iotWorkOrderTasks.$inferSelect;
export type InsertIotWorkOrderTask = typeof iotWorkOrderTasks.$inferInsert;
export type IotWorkOrderComment = typeof iotWorkOrderComments.$inferSelect;
export type InsertIotWorkOrderComment = typeof iotWorkOrderComments.$inferInsert;
export type IotWorkOrderHistory = typeof iotWorkOrderHistory.$inferSelect;
export type InsertIotWorkOrderHistory = typeof iotWorkOrderHistory.$inferInsert;
export type IotTechnician = typeof iotTechnicians.$inferSelect;
export type InsertIotTechnician = typeof iotTechnicians.$inferInsert;


// ============================================
// Phase 98: IoT Enhancement - 3D Model Upload, Work Order Notifications, MTTR/MTBF Report
// ============================================

// IoT 3D Models - Quản lý model 3D cho sơ đồ nhà máy
export const iot3dModels = mysqlTable("iot_3d_models", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  category: mysqlEnum(['machine','equipment','building','zone','furniture','custom']).default('machine'),
  modelUrl: varchar("model_url", { length: 500 }).notNull(), // S3 URL to GLTF/GLB file
  modelFormat: mysqlEnum("model_format", ['gltf','glb']).default('glb'),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  fileSize: int("file_size"), // bytes
  // Transform defaults
  defaultScale: decimal("default_scale", { precision: 10, scale: 4 }).default('1.0000'),
  defaultRotationX: decimal("default_rotation_x", { precision: 10, scale: 4 }).default('0'),
  defaultRotationY: decimal("default_rotation_y", { precision: 10, scale: 4 }).default('0'),
  defaultRotationZ: decimal("default_rotation_z", { precision: 10, scale: 4 }).default('0'),
  // Bounding box info
  boundingBoxWidth: decimal("bounding_box_width", { precision: 10, scale: 4 }),
  boundingBoxHeight: decimal("bounding_box_height", { precision: 10, scale: 4 }),
  boundingBoxDepth: decimal("bounding_box_depth", { precision: 10, scale: 4 }),
  // Metadata
  manufacturer: varchar({ length: 100 }),
  modelNumber: varchar("model_number", { length: 100 }),
  tags: json(), // ['plc','sensor','motor']
  metadata: json(),
  isPublic: tinyint("is_public").default(0), // Shared across floor plans
  isActive: tinyint("is_active").default(1).notNull(),
  uploadedBy: int("uploaded_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_model_category").on(table.category),
  index("idx_3d_model_active").on(table.isActive),
  index("idx_3d_model_public").on(table.isPublic),
]);

// IoT 3D Model Instances - Instance của model 3D trên floor plan
export const iot3dModelInstances = mysqlTable("iot_3d_model_instances", {
  id: int().autoincrement().primaryKey(),
  modelId: int("model_id").notNull(), // FK to iot_3d_models
  floorPlan3dId: int("floor_plan_3d_id").notNull(), // FK to iot_3d_floor_plans
  deviceId: int("device_id"), // Optional link to IoT device
  machineId: int("machine_id"), // Optional link to machine
  name: varchar({ length: 100 }),
  // Position
  positionX: decimal("position_x", { precision: 10, scale: 4 }).notNull(),
  positionY: decimal("position_y", { precision: 10, scale: 4 }).notNull(),
  positionZ: decimal("position_z", { precision: 10, scale: 4 }).notNull(),
  // Rotation (Euler angles in radians)
  rotationX: decimal("rotation_x", { precision: 10, scale: 4 }).default('0'),
  rotationY: decimal("rotation_y", { precision: 10, scale: 4 }).default('0'),
  rotationZ: decimal("rotation_z", { precision: 10, scale: 4 }).default('0'),
  // Scale
  scaleX: decimal("scale_x", { precision: 10, scale: 4 }).default('1.0000'),
  scaleY: decimal("scale_y", { precision: 10, scale: 4 }).default('1.0000'),
  scaleZ: decimal("scale_z", { precision: 10, scale: 4 }).default('1.0000'),
  // Display options
  visible: tinyint().default(1).notNull(),
  opacity: decimal({ precision: 3, scale: 2 }).default('1.00'),
  wireframe: tinyint().default(0),
  castShadow: tinyint("cast_shadow").default(1),
  receiveShadow: tinyint("receive_shadow").default(1),
  // Interaction
  clickable: tinyint().default(1).notNull(),
  tooltip: varchar({ length: 255 }),
  popupContent: text("popup_content"),
  // Animation
  animationEnabled: tinyint("animation_enabled").default(0),
  animationType: mysqlEnum("animation_type", ['none','rotate','pulse','bounce','custom']).default('none'),
  animationSpeed: decimal("animation_speed", { precision: 5, scale: 2 }).default('1.00'),
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_3d_instance_model").on(table.modelId),
  index("idx_3d_instance_floor").on(table.floorPlan3dId),
  index("idx_3d_instance_device").on(table.deviceId),
  index("idx_3d_instance_machine").on(table.machineId),
]);

// IoT Technician Notification Preferences - Cấu hình thông báo cho kỹ thuật viên
export const iotTechnicianNotificationPrefs = mysqlTable("iot_technician_notification_prefs", {
  id: int().autoincrement().primaryKey(),
  technicianId: int("technician_id").notNull(), // FK to iot_technicians
  // Push Notification
  pushEnabled: tinyint("push_enabled").default(1).notNull(),
  pushToken: text("push_token"), // Firebase FCM token
  pushPlatform: mysqlEnum("push_platform", ['web','android','ios']).default('web'),
  // SMS Notification
  smsEnabled: tinyint("sms_enabled").default(0).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  phoneCountryCode: varchar("phone_country_code", { length: 5 }).default('+84'),
  // Email Notification
  emailEnabled: tinyint("email_enabled").default(1).notNull(),
  email: varchar({ length: 100 }),
  // Notification Types
  notifyNewWorkOrder: tinyint("notify_new_work_order").default(1).notNull(),
  notifyAssigned: tinyint("notify_assigned").default(1).notNull(),
  notifyStatusChange: tinyint("notify_status_change").default(1).notNull(),
  notifyDueSoon: tinyint("notify_due_soon").default(1).notNull(),
  notifyOverdue: tinyint("notify_overdue").default(1).notNull(),
  notifyComment: tinyint("notify_comment").default(0).notNull(),
  // Priority Filter
  minPriorityForPush: mysqlEnum("min_priority_for_push", ['low','medium','high','critical']).default('medium'),
  minPriorityForSms: mysqlEnum("min_priority_for_sms", ['low','medium','high','critical']).default('high'),
  // Quiet Hours
  quietHoursEnabled: tinyint("quiet_hours_enabled").default(0).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default('22:00'),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default('07:00'),
  // Metadata
  lastPushAt: timestamp("last_push_at", { mode: 'string' }),
  lastSmsAt: timestamp("last_sms_at", { mode: 'string' }),
  lastEmailAt: timestamp("last_email_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_notif_pref_technician").on(table.technicianId),
]);

// IoT Work Order Notifications - Lịch sử thông báo work order
export const iotWorkOrderNotifications = mysqlTable("iot_work_order_notifications", {
  id: int().autoincrement().primaryKey(),
  workOrderId: int("work_order_id").notNull(),
  technicianId: int("technician_id").notNull(),
  notificationType: mysqlEnum("notification_type", ['new_work_order','assigned','status_change','due_soon','overdue','comment','escalation']).notNull(),
  channel: mysqlEnum(['push','sms','email']).notNull(),
  title: varchar({ length: 255 }).notNull(),
  message: text().notNull(),
  // Delivery status
  status: mysqlEnum(['pending','sent','delivered','failed','read']).default('pending'),
  sentAt: timestamp("sent_at", { mode: 'string' }),
  deliveredAt: timestamp("delivered_at", { mode: 'string' }),
  readAt: timestamp("read_at", { mode: 'string' }),
  failedAt: timestamp("failed_at", { mode: 'string' }),
  failureReason: text("failure_reason"),
  // External IDs
  externalMessageId: varchar("external_message_id", { length: 100 }), // Firebase/Twilio message ID
  // Metadata
  metadata: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_wo_notif_work_order").on(table.workOrderId),
  index("idx_wo_notif_technician").on(table.technicianId),
  index("idx_wo_notif_status").on(table.status),
  index("idx_wo_notif_type").on(table.notificationType),
  index("idx_wo_notif_created").on(table.createdAt),
]);

// IoT SMS Config - Cấu hình Twilio SMS
export const iotSmsConfig = mysqlTable("iot_sms_config", {
  id: int().autoincrement().primaryKey(),
  provider: mysqlEnum(['twilio','nexmo','aws_sns']).default('twilio'),
  accountSid: varchar("account_sid", { length: 100 }),
  authToken: varchar("auth_token", { length: 100 }),
  fromNumber: varchar("from_number", { length: 20 }),
  // Rate limiting
  maxSmsPerDay: int("max_sms_per_day").default(100),
  maxSmsPerHour: int("max_sms_per_hour").default(20),
  cooldownMinutes: int("cooldown_minutes").default(5),
  // Status
  isEnabled: tinyint("is_enabled").default(0).notNull(),
  lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
  testResult: text("test_result"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT Push Config - Cấu hình Firebase Push Notification
export const iotPushConfig = mysqlTable("iot_push_config", {
  id: int().autoincrement().primaryKey(),
  provider: mysqlEnum(['firebase','onesignal','pusher']).default('firebase'),
  projectId: varchar("project_id", { length: 100 }),
  serverKey: text("server_key"),
  vapidPublicKey: text("vapid_public_key"),
  vapidPrivateKey: text("vapid_private_key"),
  // Status
  isEnabled: tinyint("is_enabled").default(0).notNull(),
  lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
  testResult: text("test_result"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// IoT MTTR/MTBF Statistics - Thống kê MTTR/MTBF
export const iotMttrMtbfStats = mysqlTable("iot_mttr_mtbf_stats", {
  id: int().autoincrement().primaryKey(),
  // Target (device, machine, or production line)
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  // Time period
  periodType: mysqlEnum("period_type", ['daily','weekly','monthly','quarterly','yearly']).notNull(),
  periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
  periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
  // MTTR - Mean Time To Repair (minutes)
  mttr: decimal({ precision: 10, scale: 2 }), // Average repair time
  mttrMin: decimal("mttr_min", { precision: 10, scale: 2 }), // Minimum repair time
  mttrMax: decimal("mttr_max", { precision: 10, scale: 2 }), // Maximum repair time
  mttrStdDev: decimal("mttr_std_dev", { precision: 10, scale: 2 }), // Standard deviation
  // MTBF - Mean Time Between Failures (hours)
  mtbf: decimal({ precision: 12, scale: 2 }), // Average time between failures
  mtbfMin: decimal("mtbf_min", { precision: 12, scale: 2 }),
  mtbfMax: decimal("mtbf_max", { precision: 12, scale: 2 }),
  mtbfStdDev: decimal("mtbf_std_dev", { precision: 12, scale: 2 }),
  // MTTF - Mean Time To Failure (hours)
  mttf: decimal({ precision: 12, scale: 2 }),
  // Availability
  availability: decimal({ precision: 5, scale: 4 }), // MTBF / (MTBF + MTTR)
  // Counts
  totalFailures: int("total_failures").default(0),
  totalRepairs: int("total_repairs").default(0),
  totalDowntimeMinutes: int("total_downtime_minutes").default(0),
  totalUptimeHours: decimal("total_uptime_hours", { precision: 12, scale: 2 }).default('0'),
  // Work order breakdown
  correctiveWorkOrders: int("corrective_work_orders").default(0),
  preventiveWorkOrders: int("preventive_work_orders").default(0),
  predictiveWorkOrders: int("predictive_work_orders").default(0),
  emergencyWorkOrders: int("emergency_work_orders").default(0),
  // Cost analysis
  totalLaborCost: decimal("total_labor_cost", { precision: 12, scale: 2 }).default('0'),
  totalPartsCost: decimal("total_parts_cost", { precision: 12, scale: 2 }).default('0'),
  totalMaintenanceCost: decimal("total_maintenance_cost", { precision: 12, scale: 2 }).default('0'),
  // Metadata
  calculatedAt: timestamp("calculated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_mttr_mtbf_target").on(table.targetType, table.targetId),
  index("idx_mttr_mtbf_period").on(table.periodType, table.periodStart),
  index("idx_mttr_mtbf_calculated").on(table.calculatedAt),
]);

// IoT Failure Events - Sự kiện hỏng hóc để tính MTBF
export const iotFailureEvents = mysqlTable("iot_failure_events", {
  id: int().autoincrement().primaryKey(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  workOrderId: int("work_order_id"), // Link to work order
  // Failure details
  failureCode: varchar("failure_code", { length: 50 }),
  failureType: mysqlEnum("failure_type", ['breakdown','degradation','intermittent','planned_stop']).default('breakdown'),
  severity: mysqlEnum(['minor','moderate','major','critical']).default('moderate'),
  description: text(),
  // Timing
  failureStartAt: timestamp("failure_start_at", { mode: 'string' }).notNull(),
  failureEndAt: timestamp("failure_end_at", { mode: 'string' }),
  repairStartAt: timestamp("repair_start_at", { mode: 'string' }),
  repairEndAt: timestamp("repair_end_at", { mode: 'string' }),
  // Calculated durations (minutes)
  downtimeDuration: int("downtime_duration"), // Total downtime
  repairDuration: int("repair_duration"), // Time spent repairing
  waitingDuration: int("waiting_duration"), // Time waiting for parts/technician
  // Root cause
  rootCauseCategory: mysqlEnum("root_cause_category", ['mechanical','electrical','software','operator_error','wear','environmental','unknown']).default('unknown'),
  rootCause: text("root_cause"),
  // Resolution
  resolutionType: mysqlEnum("resolution_type", ['repair','replace','adjust','reset','other']).default('repair'),
  resolution: text(),
  // Previous failure reference (for MTBF calculation)
  previousFailureId: int("previous_failure_id"),
  timeSincePreviousFailure: decimal("time_since_previous_failure", { precision: 12, scale: 2 }), // hours
  // Metadata
  reportedBy: int("reported_by"),
  verifiedBy: int("verified_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_failure_target").on(table.targetType, table.targetId),
  index("idx_failure_work_order").on(table.workOrderId),
  index("idx_failure_start").on(table.failureStartAt),
  index("idx_failure_type").on(table.failureType),
  index("idx_failure_severity").on(table.severity),
]);

// Type exports for Phase 98
export type Iot3dModel = typeof iot3dModels.$inferSelect;
export type InsertIot3dModel = typeof iot3dModels.$inferInsert;
export type Iot3dModelInstance = typeof iot3dModelInstances.$inferSelect;
export type InsertIot3dModelInstance = typeof iot3dModelInstances.$inferInsert;
export type IotTechnicianNotificationPref = typeof iotTechnicianNotificationPrefs.$inferSelect;
export type InsertIotTechnicianNotificationPref = typeof iotTechnicianNotificationPrefs.$inferInsert;
export type IotWorkOrderNotification = typeof iotWorkOrderNotifications.$inferSelect;
export type InsertIotWorkOrderNotification = typeof iotWorkOrderNotifications.$inferInsert;
export type IotSmsConfig = typeof iotSmsConfig.$inferSelect;
export type InsertIotSmsConfig = typeof iotSmsConfig.$inferInsert;
export type IotPushConfig = typeof iotPushConfig.$inferSelect;
export type InsertIotPushConfig = typeof iotPushConfig.$inferInsert;
export type IotMttrMtbfStat = typeof iotMttrMtbfStats.$inferSelect;
export type InsertIotMttrMtbfStat = typeof iotMttrMtbfStats.$inferInsert;
export type IotFailureEvent = typeof iotFailureEvents.$inferSelect;
export type InsertIotFailureEvent = typeof iotFailureEvents.$inferInsert;

// Phase 102 - Notification Preferences
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int().autoincrement().notNull().primaryKey(),
  userId: int("user_id").notNull(),
  // Email settings
  emailEnabled: int("email_enabled").default(1).notNull(),
  emailAddress: varchar("email_address", { length: 255 }),
  // Telegram settings
  telegramEnabled: int("telegram_enabled").default(0).notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  // Push notification settings
  pushEnabled: int("push_enabled").default(1).notNull(),
  // Severity filter: 'all', 'warning_up', 'critical_only'
  severityFilter: mysqlEnum("severity_filter", ['all', 'warning_up', 'critical_only']).default('warning_up').notNull(),
  // Quiet hours
  quietHoursEnabled: int("quiet_hours_enabled").default(0).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default('22:00'),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default('07:00'),
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_notification_user").on(table.userId),
]);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// Scheduled MTTR/MTBF Reports - Cấu hình báo cáo định kỳ
export const scheduledMttrMtbfReports = mysqlTable("scheduled_mttr_mtbf_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 200 }).notNull(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  targetName: varchar("target_name", { length: 255 }).notNull(),
  frequency: mysqlEnum(['daily','weekly','monthly']).notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  timeOfDay: varchar("time_of_day", { length: 5 }).default('08:00').notNull(),
  recipients: text().notNull(), // JSON array of emails
  format: mysqlEnum(['excel','pdf','both']).default('excel').notNull(),
  notificationChannel: mysqlEnum("notification_channel", ['email','telegram','both']).default('email').notNull(),
  telegramConfigId: int("telegram_config_id"), // Reference to telegram_config table
  isActive: int("is_active").default(1).notNull(),
  lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
  lastSentStatus: mysqlEnum("last_sent_status", ['success','failed','pending']),
  lastSentError: text("last_sent_error"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_scheduled_mttr_target").on(table.targetType, table.targetId),
  index("idx_scheduled_mttr_active").on(table.isActive),
]);

// Phase 106 - MTTR/MTBF Thresholds for Auto Alert
export const mttrMtbfThresholds = mysqlTable("mttr_mtbf_thresholds", {
  id: int().autoincrement().primaryKey(),
  // Target type and ID
  targetType: mysqlEnum("target_type", ['device','machine','production_line','all']).notNull(),
  targetId: int("target_id"), // null means apply to all targets of this type
  // MTTR thresholds (in minutes)
  mttrWarningThreshold: decimal("mttr_warning_threshold", { precision: 10, scale: 2 }), // Warning if MTTR exceeds this
  mttrCriticalThreshold: decimal("mttr_critical_threshold", { precision: 10, scale: 2 }), // Critical if MTTR exceeds this
  // MTBF thresholds (in minutes)
  mtbfWarningThreshold: decimal("mtbf_warning_threshold", { precision: 10, scale: 2 }), // Warning if MTBF below this
  mtbfCriticalThreshold: decimal("mtbf_critical_threshold", { precision: 10, scale: 2 }), // Critical if MTBF below this
  // Availability thresholds (0-1)
  availabilityWarningThreshold: decimal("availability_warning_threshold", { precision: 5, scale: 4 }),
  availabilityCriticalThreshold: decimal("availability_critical_threshold", { precision: 5, scale: 4 }),
  // Alert settings
  enabled: int().default(1).notNull(),
  alertEmails: text("alert_emails"), // Comma-separated emails
  alertTelegram: int("alert_telegram").default(0), // Send to Telegram
  cooldownMinutes: int("cooldown_minutes").default(60), // Minimum time between alerts
  lastAlertAt: timestamp("last_alert_at", { mode: 'string' }),
  lastAlertType: varchar("last_alert_type", { length: 50 }),
  // Metadata
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_target_type_id").on(table.targetType, table.targetId),
  index("idx_enabled").on(table.enabled),
]);

// Alert history for MTTR/MTBF
export const mttrMtbfAlertHistory = mysqlTable("mttr_mtbf_alert_history", {
  id: int().autoincrement().primaryKey(),
  thresholdId: int("threshold_id").notNull(),
  targetType: mysqlEnum("target_type", ['device','machine','production_line']).notNull(),
  targetId: int("target_id").notNull(),
  targetName: varchar("target_name", { length: 255 }),
  // Alert details
  alertType: mysqlEnum("alert_type", ['mttr_warning','mttr_critical','mtbf_warning','mtbf_critical','availability_warning','availability_critical']).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 4 }),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }),
  message: text(),
  // Notification status
  emailSent: int("email_sent").default(0),
  telegramSent: int("telegram_sent").default(0),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
  acknowledgedBy: int("acknowledged_by"),
  // Metadata
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_threshold_id").on(table.thresholdId),
  index("idx_target").on(table.targetType, table.targetId),
  index("idx_alert_type").on(table.alertType),
  index("idx_created_at").on(table.createdAt),
]);

export type MttrMtbfThreshold = typeof mttrMtbfThresholds.$inferSelect;
export type InsertMttrMtbfThreshold = typeof mttrMtbfThresholds.$inferInsert;
export type MttrMtbfAlertHistory = typeof mttrMtbfAlertHistory.$inferSelect;
export type InsertMttrMtbfAlertHistory = typeof mttrMtbfAlertHistory.$inferInsert;


// Phase 113 - Scheduled OEE Reports (Telegram/Slack)
export const scheduledOeeReports = mysqlTable("scheduled_oee_reports", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  // Target
  productionLineIds: json("production_line_ids").notNull(), // Array of production line IDs
  // Schedule
  frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly (0=Sunday)
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  hour: int().default(8).notNull(), // Hour to send (0-23)
  minute: int().default(0).notNull(), // Minute to send (0-59)
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  // Notification channels
  notificationChannel: mysqlEnum("notification_channel", ['telegram','slack','both']).default('telegram').notNull(),
  telegramConfigId: int("telegram_config_id"), // Reference to telegram_config
  slackWebhookUrl: varchar("slack_webhook_url", { length: 500 }),
  // Report settings
  includeAvailability: int("include_availability").default(1).notNull(),
  includePerformance: int("include_performance").default(1).notNull(),
  includeQuality: int("include_quality").default(1).notNull(),
  includeComparison: int("include_comparison").default(1).notNull(),
  includeTrend: int("include_trend").default(1).notNull(),
  // Status
  isActive: int("is_active").default(1).notNull(),
  lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
  nextScheduledAt: timestamp("next_scheduled_at", { mode: 'string' }),
  // Metadata
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_scheduled_oee_active").on(table.isActive),
  index("idx_scheduled_oee_next").on(table.nextScheduledAt),
]);

// History of sent OEE reports
export const scheduledOeeReportHistory = mysqlTable("scheduled_oee_report_history", {
  id: int().autoincrement().primaryKey(),
  reportId: int("report_id").notNull(),
  reportName: varchar("report_name", { length: 200 }),
  // Sent details
  sentAt: timestamp("sent_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  channel: mysqlEnum(['telegram','slack']).notNull(),
  status: mysqlEnum(['sent','failed']).notNull(),
  errorMessage: text("error_message"),
  // Report data snapshot
  reportData: json("report_data"), // Snapshot of OEE data sent
  // Metadata
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_oee_report_history_report").on(table.reportId),
  index("idx_oee_report_history_sent").on(table.sentAt),
]);

export type ScheduledOeeReport = typeof scheduledOeeReports.$inferSelect;
export type InsertScheduledOeeReport = typeof scheduledOeeReports.$inferInsert;
export type ScheduledOeeReportHistory = typeof scheduledOeeReportHistory.$inferSelect;
export type InsertScheduledOeeReportHistory = typeof scheduledOeeReportHistory.$inferInsert;


// ============================================
// Phase 14 - Edge Gateway, TimescaleDB, Anomaly Detection
// ============================================

// Edge Gateway Management
export const edgeGateways = mysqlTable("edge_gateways", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayCode: varchar("gateway_code", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	productionLineId: int("production_line_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	macAddress: varchar("mac_address", { length: 17 }),
	status: mysqlEnum(['online', 'offline', 'syncing', 'error', 'maintenance']).default('offline').notNull(),
	lastHeartbeat: bigint("last_heartbeat", { mode: 'number' }),
	lastSyncAt: bigint("last_sync_at", { mode: 'number' }),
	bufferCapacity: int("buffer_capacity").default(10000),
	currentBufferSize: int("current_buffer_size").default(0),
	syncInterval: int("sync_interval").default(60),
	cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
	memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
	diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
	firmwareVersion: varchar("firmware_version", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_gateway_code").on(table.gatewayCode),
	index("idx_gateway_status").on(table.status),
	index("idx_gateway_line").on(table.productionLineId),
]);

// Edge Devices connected to Gateway
export const edgeDevices = mysqlTable("edge_devices", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	deviceCode: varchar("device_code", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	deviceType: mysqlEnum("device_type", ['sensor', 'plc', 'actuator', 'meter', 'camera']).notNull(),
	protocol: mysqlEnum(['modbus_tcp', 'modbus_rtu', 'opcua', 'mqtt', 'http', 'serial']).default('modbus_tcp'),
	address: varchar({ length: 255 }),
	pollingInterval: int("polling_interval").default(1000),
	dataType: mysqlEnum("data_type", ['int16', 'int32', 'float32', 'float64', 'bool', 'string']).default('float32'),
	scaleFactor: decimal("scale_factor", { precision: 10, scale: 4 }).default('1.0000'),
	offset: decimal({ precision: 10, scale: 4 }).default('0.0000'),
	unit: varchar({ length: 20 }),
	status: mysqlEnum(['active', 'inactive', 'error', 'disconnected']).default('inactive'),
	lastValue: decimal("last_value", { precision: 15, scale: 6 }),
	lastReadAt: bigint("last_read_at", { mode: 'number' }),
	errorCount: int("error_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_device_gateway").on(table.gatewayId),
	index("idx_device_code").on(table.deviceCode),
	index("idx_device_status").on(table.status),
]);

// Edge Data Buffer for offline storage
export const edgeDataBuffer = mysqlTable("edge_data_buffer", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	deviceId: int("device_id").notNull(),
	value: decimal({ precision: 15, scale: 6 }).notNull(),
	rawValue: varchar("raw_value", { length: 100 }),
	quality: mysqlEnum(['good', 'uncertain', 'bad']).default('good'),
	capturedAt: bigint("captured_at", { mode: 'number' }).notNull(),
	syncedAt: bigint("synced_at", { mode: 'number' }),
	syncStatus: mysqlEnum("sync_status", ['pending', 'synced', 'failed']).default('pending'),
},
(table) => [
	index("idx_buffer_gateway").on(table.gatewayId),
	index("idx_buffer_device").on(table.deviceId),
	index("idx_buffer_sync_status").on(table.syncStatus),
	index("idx_buffer_captured").on(table.capturedAt),
]);

// Edge Sync Logs
export const edgeSyncLogs = mysqlTable("edge_sync_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	gatewayId: int("gateway_id").notNull(),
	syncType: mysqlEnum("sync_type", ['full', 'incremental', 'manual']).default('incremental'),
	startedAt: bigint("started_at", { mode: 'number' }).notNull(),
	completedAt: bigint("completed_at", { mode: 'number' }),
	recordsSynced: int("records_synced").default(0),
	recordsFailed: int("records_failed").default(0),
	latencyMs: int("latency_ms"),
	status: mysqlEnum(['running', 'completed', 'failed', 'partial']).default('running'),
	errorMessage: text("error_message"),
},
(table) => [
	index("idx_sync_gateway").on(table.gatewayId),
	index("idx_sync_started").on(table.startedAt),
]);

// Time-Series Data Storage
export const sensorDataTimeseries = mysqlTable("sensor_data_ts", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	gatewayId: int("gateway_id"),
	timestamp: bigint({ mode: 'number' }).notNull(),
	timeBucket: bigint("time_bucket", { mode: 'number' }).notNull(),
	value: decimal({ precision: 15, scale: 6 }).notNull(),
	sensorType: varchar("sensor_type", { length: 50 }),
	unit: varchar({ length: 20 }),
	quality: mysqlEnum(['good', 'uncertain', 'bad']).default('good'),
	sourceType: mysqlEnum("source_type", ['edge', 'direct', 'import']).default('direct'),
	sourceId: varchar("source_id", { length: 50 }),
},
(table) => [
	index("idx_ts_device_time").on(table.deviceId, table.timestamp),
	index("idx_ts_bucket").on(table.timeBucket),
	index("idx_ts_gateway").on(table.gatewayId),
]);

// Hourly Aggregates
export const sensorDataHourly = mysqlTable("sensor_data_hourly", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	hourBucket: bigint("hour_bucket", { mode: 'number' }).notNull(),
	minValue: decimal("min_value", { precision: 15, scale: 6 }),
	maxValue: decimal("max_value", { precision: 15, scale: 6 }),
	avgValue: decimal("avg_value", { precision: 15, scale: 6 }),
	sumValue: decimal("sum_value", { precision: 20, scale: 6 }),
	sampleCount: int("sample_count").default(0),
	stdDev: decimal("std_dev", { precision: 15, scale: 6 }),
	variance: decimal({ precision: 15, scale: 6 }),
	goodCount: int("good_count").default(0),
	badCount: int("bad_count").default(0),
},
(table) => [
	index("idx_hourly_device").on(table.deviceId),
	index("idx_hourly_bucket").on(table.hourBucket),
]);

// Daily Aggregates
export const sensorDataDaily = mysqlTable("sensor_data_daily", {
	id: int().autoincrement().notNull().primaryKey(),
	deviceId: int("device_id").notNull(),
	dayBucket: bigint("day_bucket", { mode: 'number' }).notNull(),
	minValue: decimal("min_value", { precision: 15, scale: 6 }),
	maxValue: decimal("max_value", { precision: 15, scale: 6 }),
	avgValue: decimal("avg_value", { precision: 15, scale: 6 }),
	sumValue: decimal("sum_value", { precision: 20, scale: 6 }),
	sampleCount: int("sample_count").default(0),
	stdDev: decimal("std_dev", { precision: 15, scale: 6 }),
	variance: decimal({ precision: 15, scale: 6 }),
	uptimePercent: decimal("uptime_percent", { precision: 5, scale: 2 }),
	goodCount: int("good_count").default(0),
	badCount: int("bad_count").default(0),
	p50: decimal({ precision: 15, scale: 6 }),
	p95: decimal({ precision: 15, scale: 6 }),
	p99: decimal({ precision: 15, scale: 6 }),
},
(table) => [
	index("idx_daily_device").on(table.deviceId),
	index("idx_daily_bucket").on(table.dayBucket),
]);

// Isolation Forest Models
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
export const scheduledCpkJobs = mysqlTable("scheduled_cpk_jobs", {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  frequency: varchar({ length: 50 }).notNull(), // 'daily', 'weekly', 'monthly'
  runTime: varchar("run_time", { length: 10 }).notNull(), // HH:mm format
  dayOfWeek: int("day_of_week"), // 0-6 for weekly
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  productCode: varchar("product_code", { length: 100 }),
  stationName: varchar("station_name", { length: 255 }),
  warningThreshold: int("warning_threshold").default(1330), // 1.33 * 1000
  criticalThreshold: int("critical_threshold").default(1000), // 1.0 * 1000
  emailRecipients: text("email_recipients"),
  enableEmail: boolean("enable_email").default(true),
  enableOwnerNotification: boolean("enable_owner_notification").default(true),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at", { mode: 'date' }),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow(),
});


// ===== Phase 10: Quality Images & Image Comparison =====

export const qualityImages = mysqlTable("quality_images", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }).notNull(),
	imageType: mysqlEnum("image_type", ['before', 'after', 'reference', 'defect', 'camera_capture']).default('before').notNull(),
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	batchNumber: varchar("batch_number", { length: 100 }),
	captureSource: mysqlEnum("capture_source", ['upload', 'camera', 'api']).default('upload').notNull(),
	aiAnalysis: json("ai_analysis"),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	severity: mysqlEnum(['none', 'minor', 'major', 'critical']).default('none'),
	notes: text(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_quality_images_user").on(table.userId),
	index("idx_quality_images_product").on(table.productCode),
	index("idx_quality_images_line").on(table.productionLineId),
	index("idx_quality_images_type").on(table.imageType),
	index("idx_quality_images_created").on(table.createdAt),
]);

export const imageComparisons = mysqlTable("image_comparisons", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	beforeImageId: int("before_image_id").notNull(),
	afterImageId: int("after_image_id").notNull(),
	comparisonType: mysqlEnum("comparison_type", ['quality_improvement', 'defect_fix', 'process_change', 'before_after']).default('before_after').notNull(),
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	aiComparisonResult: json("ai_comparison_result"),
	improvementScore: decimal("improvement_score", { precision: 5, scale: 2 }),
	beforeScore: decimal("before_score", { precision: 5, scale: 2 }),
	afterScore: decimal("after_score", { precision: 5, scale: 2 }),
	summary: text(),
	recommendations: json(),
	status: mysqlEnum(['pending', 'analyzing', 'completed', 'failed']).default('pending').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_comparisons_user").on(table.userId),
	index("idx_comparisons_product").on(table.productCode),
	index("idx_comparisons_status").on(table.status),
	index("idx_comparisons_created").on(table.createdAt),
]);

export const alertEmailConfigs = mysqlTable("alert_email_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isActive: int("is_active").default(1).notNull(),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productCode: varchar("product_code", { length: 100 }),
	alertTypes: json("alert_types"),
	severityThreshold: mysqlEnum("severity_threshold", ['minor', 'major', 'critical']).default('major').notNull(),
	emailRecipients: json("email_recipients"),
	emailSubjectTemplate: varchar("email_subject_template", { length: 500 }),
	emailBodyTemplate: text("email_body_template"),
	includeImage: int("include_image").default(1).notNull(),
	includeAiAnalysis: int("include_ai_analysis").default(1).notNull(),
	cooldownMinutes: int("cooldown_minutes").default(30).notNull(),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	totalAlertsSent: int("total_alerts_sent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_alert_configs_user").on(table.userId),
	index("idx_alert_configs_active").on(table.isActive),
	index("idx_alert_configs_line").on(table.productionLineId),
]);

export const alertEmailHistory = mysqlTable("alert_email_history", {
	id: int().autoincrement().notNull().primaryKey(),
	configId: int("config_id").notNull(),
	qualityImageId: int("quality_image_id"),
	comparisonId: int("comparison_id"),
	alertType: varchar("alert_type", { length: 100 }).notNull(),
	severity: mysqlEnum(['minor', 'major', 'critical']).notNull(),
	subject: varchar({ length: 500 }).notNull(),
	body: text().notNull(),
	recipients: json().notNull(),
	status: mysqlEnum(['pending', 'sent', 'failed']).default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_alert_history_config").on(table.configId),
	index("idx_alert_history_status").on(table.status),
	index("idx_alert_history_created").on(table.createdAt),
	index("idx_alert_history_severity").on(table.severity),
]);


// ============================================
// Phase 10 - Auto-capture, Webhook Notification, Quality Trend Report
// ============================================

// Auto-capture Schedule - Lịch chụp ảnh tự động
export const autoCaptureSchedules = mysqlTable("auto_capture_schedules", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Target configuration
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productCode: varchar("product_code", { length: 100 }),
	// Camera configuration
	cameraId: varchar("camera_id", { length: 100 }),
	cameraUrl: varchar("camera_url", { length: 500 }),
	cameraType: mysqlEnum("camera_type", ['ip_camera', 'usb_camera', 'rtsp', 'http_snapshot']).default('ip_camera'),
	// Schedule configuration
	intervalSeconds: int("interval_seconds").default(60).notNull(), // Capture interval in seconds
	scheduleType: mysqlEnum("schedule_type", ['continuous', 'time_range', 'cron']).default('continuous'),
	startTime: varchar("start_time", { length: 5 }), // HH:mm format
	endTime: varchar("end_time", { length: 5 }), // HH:mm format
	daysOfWeek: json("days_of_week"), // [0-6], 0=Sunday
	cronExpression: varchar("cron_expression", { length: 100 }),
	timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
	// Analysis settings
	enableAiAnalysis: int("enable_ai_analysis").default(1).notNull(),
	analysisType: mysqlEnum("analysis_type", ['quality_check', 'defect_detection', 'measurement', 'all']).default('quality_check'),
	qualityThreshold: decimal("quality_threshold", { precision: 5, scale: 2 }).default('80.00'),
	// Alert settings
	alertOnDefect: int("alert_on_defect").default(1).notNull(),
	alertSeverityThreshold: mysqlEnum("alert_severity_threshold", ['minor', 'major', 'critical']).default('major'),
	webhookConfigIds: json("webhook_config_ids"), // IDs of webhook configs to notify
	emailRecipients: json("email_recipients"),
	// Status
	status: mysqlEnum(['active', 'paused', 'stopped']).default('paused').notNull(),
	lastCaptureAt: timestamp("last_capture_at", { mode: 'string' }),
	lastAnalysisResult: json("last_analysis_result"),
	totalCaptures: int("total_captures").default(0).notNull(),
	totalDefectsFound: int("total_defects_found").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_auto_capture_user").on(table.userId),
	index("idx_auto_capture_status").on(table.status),
	index("idx_auto_capture_line").on(table.productionLineId),
	index("idx_auto_capture_workstation").on(table.workstationId),
]);

export type AutoCaptureSchedule = typeof autoCaptureSchedules.$inferSelect;
export type InsertAutoCaptureSchedule = typeof autoCaptureSchedules.$inferInsert;

// Auto-capture History - Lịch sử chụp ảnh tự động
export const autoCaptureHistory = mysqlTable("auto_capture_history", {
	id: int().autoincrement().notNull().primaryKey(),
	scheduleId: int("schedule_id").notNull(),
	qualityImageId: int("quality_image_id"), // Reference to quality_images table
	// Capture details
	capturedAt: timestamp("captured_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	imageUrl: varchar("image_url", { length: 500 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Analysis results
	analysisStatus: mysqlEnum("analysis_status", ['pending', 'analyzing', 'completed', 'failed']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	severity: mysqlEnum(['none', 'minor', 'major', 'critical']).default('none'),
	aiAnalysis: json("ai_analysis"),
	// Alert status
	alertSent: int("alert_sent").default(0).notNull(),
	alertChannels: json("alert_channels"), // Which channels were notified
	// Error handling
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	processingTimeMs: int("processing_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_auto_capture_hist_schedule").on(table.scheduleId),
	index("idx_auto_capture_hist_captured").on(table.capturedAt),
	index("idx_auto_capture_hist_status").on(table.analysisStatus),
	index("idx_auto_capture_hist_severity").on(table.severity),
]);

export type AutoCaptureHistory = typeof autoCaptureHistory.$inferSelect;
export type InsertAutoCaptureHistory = typeof autoCaptureHistory.$inferInsert;

// Unified Webhook Notification Config - Cấu hình webhook thống nhất cho Slack/Teams
export const unifiedWebhookConfigs = mysqlTable("unified_webhook_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Channel type
	channelType: mysqlEnum("channel_type", ['slack', 'teams', 'discord', 'custom']).notNull(),
	// Webhook URL
	webhookUrl: varchar("webhook_url", { length: 500 }).notNull(),
	// Slack specific
	slackChannel: varchar("slack_channel", { length: 100 }),
	slackUsername: varchar("slack_username", { length: 100 }),
	slackIconEmoji: varchar("slack_icon_emoji", { length: 50 }),
	// Teams specific
	teamsTitle: varchar("teams_title", { length: 200 }),
	teamsThemeColor: varchar("teams_theme_color", { length: 10 }),
	// Custom webhook
	customHeaders: json("custom_headers"),
	customBodyTemplate: text("custom_body_template"),
	// Event subscriptions
	events: json("events"), // ['spc_violation', 'cpk_alert', 'auto_capture_defect', 'quality_alert']
	// Filters
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	minSeverity: mysqlEnum("min_severity", ['info', 'minor', 'major', 'critical']).default('major'),
	// Rate limiting
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastNotifiedAt: timestamp("last_notified_at", { mode: 'string' }),
	// Status
	isActive: int("is_active").default(1).notNull(),
	// Stats
	totalNotificationsSent: int("total_notifications_sent").default(0).notNull(),
	lastSuccessAt: timestamp("last_success_at", { mode: 'string' }),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	lastErrorMessage: text("last_error_message"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_unified_webhook_user").on(table.userId),
	index("idx_unified_webhook_type").on(table.channelType),
	index("idx_unified_webhook_active").on(table.isActive),
]);

export type UnifiedWebhookConfig = typeof unifiedWebhookConfigs.$inferSelect;
export type InsertUnifiedWebhookConfig = typeof unifiedWebhookConfigs.$inferInsert;

// Webhook Notification Logs - Lịch sử gửi webhook
export const unifiedWebhookLogs = mysqlTable("unified_webhook_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	webhookConfigId: int("webhook_config_id").notNull(),
	// Event details
	eventType: varchar("event_type", { length: 100 }).notNull(),
	eventTitle: varchar("event_title", { length: 255 }).notNull(),
	eventMessage: text("event_message"),
	eventData: json("event_data"),
	severity: mysqlEnum(['info', 'minor', 'major', 'critical']).default('info'),
	// Source reference
	sourceType: varchar("source_type", { length: 50 }), // 'auto_capture', 'spc_analysis', 'quality_check'
	sourceId: int("source_id"),
	// Request/Response
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	// Status
	status: mysqlEnum(['pending', 'sent', 'failed']).default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	processingTimeMs: int("processing_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_unified_webhook_log_config").on(table.webhookConfigId),
	index("idx_unified_webhook_log_event").on(table.eventType),
	index("idx_unified_webhook_log_status").on(table.status),
	index("idx_unified_webhook_log_created").on(table.createdAt),
]);

export type UnifiedWebhookLog = typeof unifiedWebhookLogs.$inferSelect;
export type InsertUnifiedWebhookLog = typeof unifiedWebhookLogs.$inferInsert;

// Quality Trend Report Config - Cấu hình báo cáo xu hướng chất lượng
export const qualityTrendReportConfigs = mysqlTable("quality_trend_report_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Report scope
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	// Time range
	periodType: mysqlEnum("period_type", ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('weekly'),
	comparisonPeriods: int("comparison_periods").default(4), // Number of periods to compare
	// Metrics to include
	includeCpk: int("include_cpk").default(1).notNull(),
	includePpk: int("include_ppk").default(1).notNull(),
	includeDefectRate: int("include_defect_rate").default(1).notNull(),
	includeViolationCount: int("include_violation_count").default(1).notNull(),
	includeQualityScore: int("include_quality_score").default(1).notNull(),
	// Chart types
	enableLineChart: int("enable_line_chart").default(1).notNull(),
	enableBarChart: int("enable_bar_chart").default(1).notNull(),
	enablePieChart: int("enable_pie_chart").default(1).notNull(),
	enableHeatmap: int("enable_heatmap").default(0).notNull(),
	// Schedule (optional)
	scheduleEnabled: int("schedule_enabled").default(0).notNull(),
	scheduleFrequency: mysqlEnum("schedule_frequency", ['daily', 'weekly', 'monthly']),
	scheduleTime: varchar("schedule_time", { length: 5 }), // HH:mm
	scheduleDayOfWeek: int("schedule_day_of_week"), // 0-6
	scheduleDayOfMonth: int("schedule_day_of_month"), // 1-31
	// Delivery
	emailRecipients: json("email_recipients"),
	webhookConfigIds: json("webhook_config_ids"),
	// Status
	isActive: int("is_active").default(1).notNull(),
	lastGeneratedAt: timestamp("last_generated_at", { mode: 'string' }),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_trend_report_user").on(table.userId),
	index("idx_trend_report_active").on(table.isActive),
]);

export type QualityTrendReportConfig = typeof qualityTrendReportConfigs.$inferSelect;
export type InsertQualityTrendReportConfig = typeof qualityTrendReportConfigs.$inferInsert;

// Quality Trend Report History - Lịch sử báo cáo xu hướng
export const qualityTrendReportHistory = mysqlTable("quality_trend_report_history", {
	id: int().autoincrement().notNull().primaryKey(),
	configId: int("config_id").notNull(),
	reportName: varchar("report_name", { length: 255 }).notNull(),
	// Report period
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	periodType: varchar("period_type", { length: 20 }).notNull(),
	// Report data
	reportData: json("report_data"), // Full report data including all metrics and charts
	// Summary metrics
	avgCpk: decimal("avg_cpk", { precision: 10, scale: 4 }),
	avgPpk: decimal("avg_ppk", { precision: 10, scale: 4 }),
	avgDefectRate: decimal("avg_defect_rate", { precision: 10, scale: 4 }),
	totalViolations: int("total_violations").default(0),
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	// Trend analysis
	cpkTrend: mysqlEnum("cpk_trend", ['improving', 'stable', 'declining']),
	cpkTrendPercent: decimal("cpk_trend_percent", { precision: 10, scale: 2 }),
	defectTrend: mysqlEnum("defect_trend", ['improving', 'stable', 'declining']),
	defectTrendPercent: decimal("defect_trend_percent", { precision: 10, scale: 2 }),
	// Delivery status
	emailSent: int("email_sent").default(0).notNull(),
	webhookSent: int("webhook_sent").default(0).notNull(),
	deliveryStatus: mysqlEnum("delivery_status", ['pending', 'sent', 'partial', 'failed']).default('pending'),
	deliveryError: text("delivery_error"),
	// Metadata
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_trend_history_config").on(table.configId),
	index("idx_trend_history_period").on(table.periodStart, table.periodEnd),
	index("idx_trend_history_generated").on(table.generatedAt),
]);

export type QualityTrendReportHistory = typeof qualityTrendReportHistory.$inferSelect;
export type InsertQualityTrendReportHistory = typeof qualityTrendReportHistory.$inferInsert;


// Webhook Templates - Template tùy chỉnh cho các hệ thống thông báo (Telegram, Zalo, etc.)
export const webhookTemplates = mysqlTable("webhook_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Channel type: telegram, zalo, slack, teams, discord, custom
	channelType: mysqlEnum("channel_type", ['telegram', 'zalo', 'slack', 'teams', 'discord', 'custom']).notNull(),
	// Template content
	templateTitle: varchar("template_title", { length: 500 }),
	templateBody: text("template_body").notNull(), // Supports placeholders like {{cpk}}, {{product}}, etc.
	templateFormat: mysqlEnum("template_format", ['text', 'markdown', 'html', 'json']).default('text').notNull(),
	// Zalo specific
	zaloOaId: varchar("zalo_oa_id", { length: 100 }),
	zaloAccessToken: varchar("zalo_access_token", { length: 500 }),
	zaloTemplateId: varchar("zalo_template_id", { length: 100 }),
	// Telegram specific
	telegramBotToken: varchar("telegram_bot_token", { length: 255 }),
	telegramChatId: varchar("telegram_chat_id", { length: 100 }),
	telegramParseMode: mysqlEnum("telegram_parse_mode", ['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
	// Custom webhook
	webhookUrl: varchar("webhook_url", { length: 500 }),
	webhookMethod: mysqlEnum("webhook_method", ['GET', 'POST', 'PUT']).default('POST'),
	webhookHeaders: json("webhook_headers"), // Custom headers as JSON
	webhookAuthType: mysqlEnum("webhook_auth_type", ['none', 'bearer', 'basic', 'api_key']),
	webhookAuthValue: varchar("webhook_auth_value", { length: 500 }),
	// Event subscriptions
	events: json("events"), // ['spc_violation', 'cpk_alert', 'quality_issue', 'maintenance', 'system']
	// Filters
	productionLineIds: json("production_line_ids"),
	workstationIds: json("workstation_ids"),
	productCodes: json("product_codes"),
	minSeverity: mysqlEnum("min_severity", ['info', 'warning', 'critical']).default('warning'),
	// Rate limiting
	rateLimitMinutes: int("rate_limit_minutes").default(5),
	lastSentAt: timestamp("last_sent_at", { mode: 'string' }),
	// Status
	isActive: int("is_active").default(1).notNull(),
	isDefault: int("is_default").default(0).notNull(),
	// Stats
	totalSent: int("total_sent").default(0).notNull(),
	totalFailed: int("total_failed").default(0).notNull(),
	lastError: text("last_error"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_webhook_template_user").on(table.userId),
	index("idx_webhook_template_channel").on(table.channelType),
	index("idx_webhook_template_active").on(table.isActive),
]);

export type WebhookTemplate = typeof webhookTemplates.$inferSelect;
export type InsertWebhookTemplate = typeof webhookTemplates.$inferInsert;

// Webhook Template Logs - Lịch sử gửi thông báo qua template
export const webhookTemplateLogs = mysqlTable("webhook_template_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	templateId: int("template_id").notNull(),
	// Event details
	eventType: varchar("event_type", { length: 100 }).notNull(),
	eventTitle: varchar("event_title", { length: 255 }).notNull(),
	eventMessage: text("event_message"),
	eventData: json("event_data"),
	severity: mysqlEnum(['info', 'warning', 'critical']).default('info'),
	// Rendered content
	renderedTitle: varchar("rendered_title", { length: 500 }),
	renderedBody: text("rendered_body"),
	// Request/Response
	requestPayload: text("request_payload"),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	// Status
	status: mysqlEnum(['pending', 'sent', 'failed', 'rate_limited']).default('pending').notNull(),
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	// Timing
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_webhook_template_log_template").on(table.templateId),
	index("idx_webhook_template_log_event").on(table.eventType),
	index("idx_webhook_template_log_status").on(table.status),
	index("idx_webhook_template_log_created").on(table.createdAt),
]);

export type WebhookTemplateLog = typeof webhookTemplateLogs.$inferSelect;
export type InsertWebhookTemplateLog = typeof webhookTemplateLogs.$inferInsert;


// ============================================================
// PHASE 10 - Scheduled Reports, AI Vision Dashboard, Line Comparison
// ============================================================

// Scheduled Reports - Báo cáo tự động theo lịch
export const scheduledReports = mysqlTable("scheduled_reports", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// User who created the report
	userId: int("user_id").notNull(),
	createdBy: int("created_by"),
	// Report type
	reportType: mysqlEnum("report_type", ['spc_summary', 'cpk_analysis', 'violation_report', 'production_line_status', 'ai_vision_dashboard', 'radar_chart_comparison', 'oee', 'cpk', 'oee_cpk_combined', 'production_summary']).default('spc_summary').notNull(),
	// Schedule configuration (legacy fields)
	scheduleType: mysqlEnum("schedule_type", ['daily', 'weekly', 'monthly']).default('daily').notNull(),
	scheduleTime: varchar("schedule_time", { length: 10 }).default('08:00').notNull(),
	scheduleDayOfWeek: int("schedule_day_of_week"),
	scheduleDayOfMonth: int("schedule_day_of_month"),
	// New schedule fields (used by OEE router)
	frequency: mysqlEnum("frequency", ['daily', 'weekly', 'monthly']).default('daily'),
	dayOfWeek: int("day_of_week"),
	dayOfMonth: int("day_of_month"),
	timeOfDay: varchar("time_of_day", { length: 10 }).default('08:00'),
	// Filter configuration
	productionLineIds: json("production_line_ids"),
	productIds: json("product_ids"),
	machineIds: json("machine_ids"),
	includeCharts: tinyint("include_charts").default(1).notNull(),
	includeRawData: tinyint("include_raw_data").default(0).notNull(),
	includeTrends: tinyint("include_trends").default(1),
	includeAlerts: tinyint("include_alerts").default(1),
	format: varchar("format", { length: 20 }).default('html'),
	// Email recipients
	recipients: json("recipients").notNull(),
	ccRecipients: json("cc_recipients"),
	// Status
	isActive: tinyint("is_active").default(1).notNull(),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	lastRunStatus: mysqlEnum("last_run_status", ['success', 'failed', 'pending']),
	lastRunError: text("last_run_error"),
	nextRunAt: timestamp("next_run_at", { mode: 'string' }),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_scheduled_report_user").on(table.userId),
	index("idx_scheduled_report_active").on(table.isActive),
	index("idx_scheduled_report_next_run").on(table.nextRunAt),
]);

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;

// Scheduled Report Logs - Lịch sử chạy báo cáo
export const scheduledReportLogs = mysqlTable("scheduled_report_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	reportId: int("report_id").notNull(),
	// Execution details
	startedAt: timestamp("started_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	status: mysqlEnum(['running', 'success', 'failed']).default('running').notNull(),
	errorMessage: text("error_message"),
	// Report details
	recipientCount: int("recipient_count").default(0).notNull(),
	emailsSent: int("emails_sent").default(0).notNull(),
	reportSize: int("report_size"), // in bytes
	// Generated report file
	reportFileUrl: text("report_file_url"),
	reportFileName: varchar("report_file_name", { length: 255 }),
},
(table) => [
	index("idx_scheduled_report_log_report").on(table.reportId),
	index("idx_scheduled_report_log_status").on(table.status),
	index("idx_scheduled_report_log_started").on(table.startedAt),
]);

export type ScheduledReportLog = typeof scheduledReportLogs.$inferSelect;
export type InsertScheduledReportLog = typeof scheduledReportLogs.$inferInsert;

// Line Comparison Sessions - Phiên so sánh dây chuyền
export const lineComparisonSessions = mysqlTable("line_comparison_sessions", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	userId: int("user_id").notNull(),
	// Comparison configuration
	productionLineIds: json("production_line_ids").notNull(), // Array of production line IDs to compare
	productId: int("product_id"), // Optional: filter by product
	dateFrom: timestamp("date_from", { mode: 'string' }).notNull(),
	dateTo: timestamp("date_to", { mode: 'string' }).notNull(),
	// Metrics to compare
	compareMetrics: json("compare_metrics"), // Array of metrics: ['cpk', 'ppk', 'ng_rate', 'oee', etc.]
	// Results cache
	comparisonResults: json("comparison_results"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_line_comparison_user").on(table.userId),
	index("idx_line_comparison_created").on(table.createdAt),
]);

export type LineComparisonSession = typeof lineComparisonSessions.$inferSelect;
export type InsertLineComparisonSession = typeof lineComparisonSessions.$inferInsert;

// AI Vision Dashboard Configs - Cấu hình dashboard AI Vision cho từng user
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
export const userNotifications = mysqlTable("user_notifications", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	// Notification type
	type: mysqlEnum("type", ['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).notNull(),
	severity: mysqlEnum("severity", ['info', 'warning', 'critical']).default('info').notNull(),
	// Content
	title: varchar("title", { length: 255 }).notNull(),
	message: text("message").notNull(),
	// Reference data
	referenceType: varchar("reference_type", { length: 50 }), // 'report', 'spc_plan', 'analysis', etc.
	referenceId: int("reference_id"),
	// Metadata
	metadata: json("metadata"), // Additional data like report URL, CPK value, etc.
	// Status
	isRead: tinyint("is_read").default(0).notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	// Timestamps
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_user_notifications_user").on(table.userId),
	index("idx_user_notifications_type").on(table.type),
	index("idx_user_notifications_read").on(table.isRead),
	index("idx_user_notifications_created").on(table.createdAt),
]);
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// Scheduled Report PDF History - Lịch sử PDF báo cáo đã xuất
export const scheduledReportPdfHistory = mysqlTable("scheduled_report_pdf_history", {
	id: int().autoincrement().notNull().primaryKey(),
	reportId: int("report_id").notNull(),
	// PDF file info
	pdfUrl: varchar("pdf_url", { length: 500 }).notNull(),
	fileSize: int("file_size"), // bytes
	// Generation info
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	generationTimeMs: int("generation_time_ms"),
	// Status
	status: mysqlEnum("status", ['success', 'failed']).default('success').notNull(),
	errorMessage: text("error_message"),
	// Metadata
	reportData: json("report_data"), // Snapshot of report data at generation time
},
(table) => [
	index("idx_pdf_history_report").on(table.reportId),
	index("idx_pdf_history_generated").on(table.generatedAt),
]);
export type ScheduledReportPdfHistory = typeof scheduledReportPdfHistory.$inferSelect;
export type InsertScheduledReportPdfHistory = typeof scheduledReportPdfHistory.$inferInsert;


// Login Attempts - Theo dõi số lần đăng nhập thất bại
export const loginAttempts = mysqlTable("login_attempts", {
	id: int().autoincrement().notNull().primaryKey(),
	username: varchar("username", { length: 100 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	success: tinyint("success").default(0).notNull(),
	failureReason: varchar("failure_reason", { length: 255 }),
	attemptedAt: timestamp("attempted_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_login_attempts_username").on(table.username),
	index("idx_login_attempts_ip").on(table.ipAddress),
	index("idx_login_attempts_time").on(table.attemptedAt),
]);
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// Auth Audit Logs - Ghi log chi tiết cho các hoạt động authentication
export const authAuditLogs = mysqlTable("auth_audit_logs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id"),
	username: varchar("username", { length: 100 }),
	// Event type: login_success, login_failed, logout, password_change, password_reset, 2fa_enabled, 2fa_disabled, account_locked, account_unlocked
	eventType: mysqlEnum("event_type", [
		'login_success', 'login_failed', 'logout', 
		'password_change', 'password_reset', 
		'2fa_enabled', '2fa_disabled', '2fa_verified',
		'account_locked', 'account_unlocked',
		'session_expired', 'token_refresh'
	]).notNull(),
	// Auth method: local, oauth, 2fa
	authMethod: mysqlEnum("auth_method", ['local', 'oauth', '2fa']).default('local'),
	// Details
	details: text("details"), // JSON string with additional info
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	// Location info (optional)
	country: varchar("country", { length: 100 }),
	city: varchar("city", { length: 100 }),
	// Status
	severity: mysqlEnum("severity", ['info', 'warning', 'critical']).default('info').notNull(),
	// Timestamps
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_auth_audit_user").on(table.userId),
	index("idx_auth_audit_username").on(table.username),
	index("idx_auth_audit_event").on(table.eventType),
	index("idx_auth_audit_time").on(table.createdAt),
	index("idx_auth_audit_severity").on(table.severity),
]);
export type AuthAuditLog = typeof authAuditLogs.$inferSelect;
export type InsertAuthAuditLog = typeof authAuditLogs.$inferInsert;


// ============================================
// Phase 15: Factory/Workshop Hierarchy - Hoàn thiện 100% yêu cầu
// ============================================

// Factories - Quản lý nhà máy
export const factories = mysqlTable("factories", {
  id: int().autoincrement().primaryKey(),
  code: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  address: text(),
  city: varchar({ length: 100 }),
  country: varchar({ length: 100 }),
  timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh'),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  imageUrl: varchar("image_url", { length: 500 }),
  latitude: decimal({ precision: 10, scale: 7 }),
  longitude: decimal({ precision: 10, scale: 7 }),
  capacity: int(),
  status: mysqlEnum(['active','inactive','maintenance']).default('active').notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_factories_code").on(table.code),
  index("idx_factories_status").on(table.status),
  index("idx_factories_active").on(table.isActive),
]);
export type Factory = typeof factories.$inferSelect;
export type InsertFactory = typeof factories.$inferInsert;

// Workshops - Quản lý nhà xưởng (thuộc nhà máy)
export const workshops = mysqlTable("workshops", {
  id: int().autoincrement().primaryKey(),
  factoryId: int("factory_id").notNull(),
  code: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  floor: varchar({ length: 50 }),
  building: varchar({ length: 100 }),
  area: decimal({ precision: 10, scale: 2 }),
  areaUnit: varchar("area_unit", { length: 20 }).default('m2'),
  capacity: int(),
  managerName: varchar("manager_name", { length: 255 }),
  managerPhone: varchar("manager_phone", { length: 50 }),
  managerEmail: varchar("manager_email", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  floorPlanUrl: varchar("floor_plan_url", { length: 500 }),
  status: mysqlEnum(['active','inactive','maintenance']).default('active').notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_workshops_factory").on(table.factoryId),
  index("idx_workshops_code").on(table.code),
  index("idx_workshops_status").on(table.status),
  index("idx_workshops_active").on(table.isActive),
]);
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = typeof workshops.$inferInsert;

// Measurement Remarks - Ghi chú cho điểm đo
export const measurementRemarks = mysqlTable("measurement_remarks", {
  id: int().autoincrement().primaryKey(),
  measurementId: int("measurement_id").notNull(),
  measurementType: mysqlEnum("measurement_type", ['machine_measurement','spc_analysis','inspection']).notNull(),
  remark: text().notNull(),
  remarkType: mysqlEnum("remark_type", ['note','issue','correction','observation','action']).default('note'),
  severity: mysqlEnum(['info','warning','critical']).default('info'),
  imageUrls: json("image_urls"),
  attachmentUrls: json("attachment_urls"),
  createdBy: int("created_by"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_measurement_remarks_measurement").on(table.measurementId),
  index("idx_measurement_remarks_type").on(table.measurementType),
  index("idx_measurement_remarks_created_by").on(table.createdBy),
]);
export type MeasurementRemark = typeof measurementRemarks.$inferSelect;
export type InsertMeasurementRemark = typeof measurementRemarks.$inferInsert;

// Inspection Remarks - Ghi chú cho kết quả kiểm tra
export const inspectionRemarks = mysqlTable("inspection_remarks", {
  id: int().autoincrement().primaryKey(),
  inspectionId: int("inspection_id").notNull(),
  remark: text().notNull(),
  remarkType: mysqlEnum("remark_type", ['note','defect_detail','root_cause','corrective_action','observation']).default('note'),
  severity: mysqlEnum(['info','warning','critical']).default('info'),
  defectCategory: varchar("defect_category", { length: 100 }),
  imageUrls: json("image_urls"),
  attachmentUrls: json("attachment_urls"),
  createdBy: int("created_by"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_inspection_remarks_inspection").on(table.inspectionId),
  index("idx_inspection_remarks_type").on(table.remarkType),
  index("idx_inspection_remarks_created_by").on(table.createdBy),
]);
export type InspectionRemark = typeof inspectionRemarks.$inferSelect;
export type InsertInspectionRemark = typeof inspectionRemarks.$inferInsert;


// Workshop Production Lines - Quan hệ nhiều-nhiều giữa Workshop và Production Line
export const workshopProductionLines = mysqlTable("workshop_production_lines", {
  id: int().autoincrement().primaryKey(),
  workshopId: int("workshop_id").notNull(),
  productionLineId: int("production_line_id").notNull(),
  assignedAt: timestamp("assigned_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  assignedBy: int("assigned_by"),
  notes: text(),
  isActive: int("is_active").default(1).notNull(),
},
(table) => [
  index("idx_workshop_production_lines_workshop").on(table.workshopId),
  index("idx_workshop_production_lines_line").on(table.productionLineId),
  index("idx_workshop_production_lines_unique").on(table.workshopId, table.productionLineId),
]);
export type WorkshopProductionLine = typeof workshopProductionLines.$inferSelect;
export type InsertWorkshopProductionLine = typeof workshopProductionLines.$inferInsert;


// Capacity Plans - Kế hoạch công suất cho Workshop
export const capacityPlans = mysqlTable("capacity_plans", {
  id: int().autoincrement().primaryKey(),
  workshopId: int("workshop_id").notNull(),
  productId: int("product_id"),
  planDate: date("plan_date", { mode: 'string' }).notNull(),
  plannedCapacity: int("planned_capacity").notNull(),
  actualCapacity: int("actual_capacity").default(0),
  targetEfficiency: decimal("target_efficiency", { precision: 5, scale: 2 }).default('85.00'),
  actualEfficiency: decimal("actual_efficiency", { precision: 5, scale: 2 }),
  shiftType: mysqlEnum("shift_type", ['morning', 'afternoon', 'night', 'full_day']).default('full_day'),
  notes: text(),
  status: mysqlEnum(['draft', 'approved', 'in_progress', 'completed', 'cancelled']).default('draft').notNull(),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_capacity_plans_workshop").on(table.workshopId),
  index("idx_capacity_plans_date").on(table.planDate),
  index("idx_capacity_plans_status").on(table.status),
  index("idx_capacity_plans_workshop_date").on(table.workshopId, table.planDate),
]);
export type CapacityPlan = typeof capacityPlans.$inferSelect;
export type InsertCapacityPlan = typeof capacityPlans.$inferInsert;

// Capacity Plan History - Lịch sử cập nhật công suất thực tế
export const capacityPlanHistory = mysqlTable("capacity_plan_history", {
  id: int().autoincrement().primaryKey(),
  capacityPlanId: int("capacity_plan_id").notNull(),
  previousActualCapacity: int("previous_actual_capacity"),
  newActualCapacity: int("new_actual_capacity").notNull(),
  previousEfficiency: decimal("previous_efficiency", { precision: 5, scale: 2 }),
  newEfficiency: decimal("new_efficiency", { precision: 5, scale: 2 }),
  changeReason: text("change_reason"),
  changedBy: int("changed_by"),
  changedAt: timestamp("changed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_capacity_plan_history_plan").on(table.capacityPlanId),
  index("idx_capacity_plan_history_changed_at").on(table.changedAt),
]);
export type CapacityPlanHistory = typeof capacityPlanHistory.$inferSelect;
export type InsertCapacityPlanHistory = typeof capacityPlanHistory.$inferInsert;


// ============================================================
// PHASE 12 - Dashboard Customization & Batch Image Analysis
// ============================================================

// Widget Templates - Định nghĩa các loại widget có sẵn
export const widgetTemplates = mysqlTable("widget_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	key: varchar({ length: 100 }).notNull(), // Unique identifier: 'cpk_chart', 'spc_chart', 'alert_summary', etc.
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['chart', 'stats', 'table', 'alert', 'ai', 'custom']).default('chart').notNull(),
	// Widget configuration schema
	defaultConfig: json("default_config"), // Default settings for this widget type
	// Size constraints
	minWidth: int("min_width").default(1).notNull(), // Grid units
	minHeight: int("min_height").default(1).notNull(),
	maxWidth: int("max_width").default(4).notNull(),
	maxHeight: int("max_height").default(4).notNull(),
	defaultWidth: int("default_width").default(2).notNull(),
	defaultHeight: int("default_height").default(2).notNull(),
	// Component reference
	componentName: varchar("component_name", { length: 100 }).notNull(), // React component name
	// Permissions
	requiredRole: mysqlEnum("required_role", ['user', 'manager', 'admin']).default('user'),
	// Status
	isActive: int("is_active").default(1).notNull(),
	isDefault: int("is_default").default(0).notNull(), // Show by default for new users
	displayOrder: int("display_order").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("widget_templates_key_unique").on(table.key),
	index("idx_widget_template_category").on(table.category),
	index("idx_widget_template_active").on(table.isActive),
]);

export type WidgetTemplate = typeof widgetTemplates.$inferSelect;
export type InsertWidgetTemplate = typeof widgetTemplates.$inferInsert;

// Dashboard Widget Config - Cấu hình widget của từng user
export const dashboardWidgetConfigs = mysqlTable("dashboard_widget_configs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	widgetTemplateId: int("widget_template_id").notNull(),
	// Layout position (grid-based)
	gridX: int("grid_x").default(0).notNull(), // Column position
	gridY: int("grid_y").default(0).notNull(), // Row position
	gridWidth: int("grid_width").default(2).notNull(), // Width in grid units
	gridHeight: int("grid_height").default(2).notNull(), // Height in grid units
	// Widget-specific configuration
	config: json("config"), // Custom settings for this widget instance
	// Visibility
	isVisible: int("is_visible").default(1).notNull(),
	// Dashboard assignment (for multiple dashboards per user)
	dashboardId: int("dashboard_id"), // Optional: for multiple dashboards
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_dashboard_widget_user").on(table.userId),
	index("idx_dashboard_widget_template").on(table.widgetTemplateId),
	index("idx_dashboard_widget_dashboard").on(table.dashboardId),
]);

export type DashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferSelect;
export type InsertDashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferInsert;

// User Dashboard Layouts - Lưu layout dashboard của user
export const userDashboardLayouts = mysqlTable("user_dashboard_layouts", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).default('Default Dashboard').notNull(),
	description: text(),
	// Layout settings
	gridColumns: int("grid_columns").default(12).notNull(), // Number of columns in grid
	rowHeight: int("row_height").default(100).notNull(), // Height of each row in pixels
	// Theme
	theme: mysqlEnum(['light', 'dark', 'auto']).default('auto'),
	// Status
	isDefault: int("is_default").default(0).notNull(),
	isActive: int("is_active").default(1).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_user_dashboard_layout_user").on(table.userId),
	index("idx_user_dashboard_layout_default").on(table.isDefault),
]);

export type UserDashboardLayout = typeof userDashboardLayouts.$inferSelect;
export type InsertUserDashboardLayout = typeof userDashboardLayouts.$inferInsert;

// Batch Image Analysis Jobs - Batch job phân tích hình ảnh
export const batchImageAnalysisJobs = mysqlTable("batch_image_analysis_jobs", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Job configuration
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'comparison', 'ocr', 'custom']).default('defect_detection').notNull(),
	// Filter context
	productCode: varchar("product_code", { length: 100 }),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Progress tracking
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('pending').notNull(),
	totalImages: int("total_images").default(0).notNull(),
	processedImages: int("processed_images").default(0).notNull(),
	successImages: int("success_images").default(0).notNull(),
	failedImages: int("failed_images").default(0).notNull(),
	// Results summary
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	defectsSummary: json("defects_summary"), // Summary of defect types found
	// Timing
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	processingTimeMs: int("processing_time_ms"),
	// Error handling
	errorMessage: text("error_message"),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_batch_image_job_user").on(table.userId),
	index("idx_batch_image_job_status").on(table.status),
	index("idx_batch_image_job_created").on(table.createdAt),
]);

export type BatchImageAnalysisJob = typeof batchImageAnalysisJobs.$inferSelect;
export type InsertBatchImageAnalysisJob = typeof batchImageAnalysisJobs.$inferInsert;

// Batch Image Items - Từng hình ảnh trong batch
export const batchImageItems = mysqlTable("batch_image_items", {
	id: int().autoincrement().notNull().primaryKey(),
	jobId: int("job_id").notNull(),
	// Image info
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: int("file_size"), // in bytes
	imageUrl: varchar("image_url", { length: 500 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	// Processing status
	status: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
	processOrder: int("process_order").default(0).notNull(),
	// Analysis results
	result: mysqlEnum(['ok', 'ng', 'warning', 'unknown']).default('unknown'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	confidence: decimal("confidence", { precision: 5, scale: 4 }),
	// Defect details
	defectsFound: int("defects_found").default(0),
	defectTypes: json("defect_types"), // Array of defect types found
	defectLocations: json("defect_locations"), // Bounding boxes for defects
	// AI analysis
	aiAnalysis: json("ai_analysis"), // Full AI response
	aiModelUsed: varchar("ai_model_used", { length: 100 }),
	// Timing
	processingTimeMs: int("processing_time_ms"),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	// Error handling
	errorMessage: text("error_message"),
	retryCount: int("retry_count").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_batch_image_item_job").on(table.jobId),
	index("idx_batch_image_item_status").on(table.status),
	index("idx_batch_image_item_result").on(table.result),
]);

export type BatchImageItem = typeof batchImageItems.$inferSelect;
export type InsertBatchImageItem = typeof batchImageItems.$inferInsert;


// ============================================
// Custom Widgets - Widget tùy chỉnh với SQL/API
// ============================================
export const customWidgets = mysqlTable("custom_widgets", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	widgetType: mysqlEnum("widget_type", ['sql_query', 'api_endpoint', 'chart', 'table', 'kpi_card', 'gauge', 'custom']).notNull(),
	// SQL Query config
	sqlQuery: text("sql_query"),
	// API Endpoint config
	apiEndpoint: varchar("api_endpoint", { length: 1000 }),
	apiMethod: mysqlEnum("api_method", ['GET', 'POST']).default('GET'),
	apiHeaders: json("api_headers"),
	apiBody: json("api_body"),
	// Display config
	width: int().default(1).notNull(),
	height: int().default(1).notNull(),
	position: int().default(0).notNull(),
	refreshInterval: int("refresh_interval").default(60).notNull(),
	chartType: mysqlEnum("chart_type", ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar']),
	chartConfig: json("chart_config"),
	// Access control
	userId: int("user_id").notNull(),
	isPublic: int("is_public").default(0).notNull(),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_custom_widgets_user").on(table.userId),
	index("idx_custom_widgets_type").on(table.widgetType),
	index("idx_custom_widgets_public").on(table.isPublic),
]);

export type CustomWidget = typeof customWidgets.$inferSelect;
export type InsertCustomWidget = typeof customWidgets.$inferInsert;

// ============================================
// Camera Configs - Cấu hình camera AVI/AOI
// ============================================
export const cameraConfigs = mysqlTable("camera_configs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	cameraType: mysqlEnum("camera_type", ['avi', 'aoi', 'ip_camera', 'usb_camera', 'rtsp', 'http_stream']).notNull(),
	connectionUrl: varchar("connection_url", { length: 1000 }).notNull(),
	// Authentication
	username: varchar({ length: 100 }),
	password: varchar({ length: 255 }),
	apiKey: varchar("api_key", { length: 255 }),
	// Analysis config
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).default('quality_inspection'),
	analysisModelId: int("analysis_model_id"),
	analysisConfig: json("analysis_config"),
	// Production line association
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	machineId: int("machine_id"),
	// Alert config
	alertEnabled: int("alert_enabled").default(1).notNull(),
	alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }).default('0.80'),
	alertEmails: text("alert_emails"),
	// Status
	status: mysqlEnum(['active', 'inactive', 'error', 'disconnected']).default('inactive').notNull(),
	lastConnectedAt: timestamp("last_connected_at", { mode: 'string' }),
	lastErrorMessage: text("last_error_message"),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_configs_type").on(table.cameraType),
	index("idx_camera_configs_status").on(table.status),
	index("idx_camera_configs_line").on(table.productionLineId),
]);

export type CameraConfig = typeof cameraConfigs.$inferSelect;
export type InsertCameraConfig = typeof cameraConfigs.$inferInsert;

// ============================================
// SN Images - Ảnh theo Serial Number với điểm đo
// ============================================
export const snImages = mysqlTable("sn_images", {
	id: int().autoincrement().notNull(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	imageUrl: varchar("image_url", { length: 1000 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
	// Measurement data
	measurementPoints: json("measurement_points"), // [{x, y, label, value, unit, result, tolerance: {min, max}}]
	defectLocations: json("defect_locations"), // [{x, y, width, height, type, severity}]
	// Analysis results
	analysisResult: mysqlEnum("analysis_result", ['ok', 'ng', 'warning', 'pending']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0).notNull(),
	measurementsCount: int("measurements_count").default(0).notNull(),
	// Source info
	cameraId: int("camera_id"),
	batchJobId: int("batch_job_id"),
	source: mysqlEnum(['camera', 'upload', 'api', 'batch_job']).default('upload'),
	// Product/Line association
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Metadata
	capturedAt: timestamp("captured_at", { mode: 'string' }),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	analyzedBy: int("analyzed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_sn_images_sn").on(table.serialNumber),
	index("idx_sn_images_result").on(table.analysisResult),
	index("idx_sn_images_camera").on(table.cameraId),
	index("idx_sn_images_product").on(table.productId),
	index("idx_sn_images_line").on(table.productionLineId),
	index("idx_sn_images_captured").on(table.capturedAt),
]);

export type SnImage = typeof snImages.$inferSelect;
export type InsertSnImage = typeof snImages.$inferInsert;


// ============================================
// Phase 72: Camera Capture, Annotations & AI Comparison
// ============================================

// Camera Capture Sessions - Phiên chụp ảnh từ camera
export const cameraSessions = mysqlTable("camera_sessions", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	sessionName: varchar("session_name", { length: 255 }),
	// Camera configuration
	cameraId: int("camera_id"),
	cameraStreamUrl: varchar("camera_stream_url", { length: 500 }),
	resolution: varchar({ length: 50 }), // e.g., "1920x1080"
	// Session status
	status: mysqlEnum(['active', 'paused', 'completed', 'cancelled']).default('active').notNull(),
	// Product/Line association
	productId: int("product_id"),
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	// Capture settings
	captureInterval: int("capture_interval"), // in seconds, null = manual capture
	autoCapture: boolean("auto_capture").default(false),
	captureCount: int("capture_count").default(0).notNull(),
	// Timestamps
	startedAt: timestamp("started_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_sessions_user").on(table.userId),
	index("idx_camera_sessions_status").on(table.status),
	index("idx_camera_sessions_camera").on(table.cameraId),
	index("idx_camera_sessions_line").on(table.productionLineId),
]);

export type CameraSession = typeof cameraSessions.$inferSelect;
export type InsertCameraSession = typeof cameraSessions.$inferInsert;

// Image Annotations - Ghi chú trên ảnh
export const imageAnnotations = mysqlTable("image_annotations", {
	id: int().autoincrement().notNull().primaryKey(),
	imageId: int("image_id").notNull(), // Reference to snImages or qualityImages
	imageType: mysqlEnum("image_type", ['sn_image', 'quality_image', 'comparison']).default('sn_image').notNull(),
	userId: int("user_id").notNull(),
	// Annotation type
	annotationType: mysqlEnum("annotation_type", ['rectangle', 'circle', 'ellipse', 'arrow', 'freehand', 'text', 'highlight', 'measurement']).notNull(),
	// Position and dimensions (normalized 0-1 for responsiveness)
	x: decimal({ precision: 10, scale: 6 }).notNull(),
	y: decimal({ precision: 10, scale: 6 }).notNull(),
	width: decimal({ precision: 10, scale: 6 }),
	height: decimal({ precision: 10, scale: 6 }),
	// For arrows and lines
	endX: decimal("end_x", { precision: 10, scale: 6 }),
	endY: decimal("end_y", { precision: 10, scale: 6 }),
	// For freehand paths
	pathData: json("path_data"), // SVG path data or array of points
	// Styling
	color: varchar({ length: 20 }).default('#ff0000'),
	strokeWidth: int("stroke_width").default(2),
	fillColor: varchar("fill_color", { length: 20 }),
	opacity: decimal({ precision: 3, scale: 2 }).default('1.00'),
	// Content
	label: varchar({ length: 255 }),
	description: text(),
	// For measurement annotations
	measurementValue: decimal("measurement_value", { precision: 15, scale: 6 }),
	measurementUnit: varchar("measurement_unit", { length: 20 }),
	// Metadata
	isVisible: boolean("is_visible").default(true),
	zIndex: int("z_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_annotations_image").on(table.imageId, table.imageType),
	index("idx_annotations_user").on(table.userId),
	index("idx_annotations_type").on(table.annotationType),
]);

export type ImageAnnotation = typeof imageAnnotations.$inferSelect;
export type InsertImageAnnotation = typeof imageAnnotations.$inferInsert;

// AI Image Comparison Results - Kết quả phân tích AI chi tiết
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
export const annotationTemplates = mysqlTable("annotation_templates", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Template data
	annotations: json().notNull(), // Array of annotation objects
	// Categorization
	category: varchar({ length: 100 }),
	tags: json(), // Array of tags
	// Usage tracking
	usageCount: int("usage_count").default(0).notNull(),
	// Sharing
	isPublic: boolean("is_public").default(false),
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_annotation_templates_user").on(table.userId),
	index("idx_annotation_templates_category").on(table.category),
	index("idx_annotation_templates_public").on(table.isPublic),
]);

export type AnnotationTemplate = typeof annotationTemplates.$inferSelect;
export type InsertAnnotationTemplate = typeof annotationTemplates.$inferInsert;

// Camera Configurations - Cấu hình camera
export const cameraConfigurations = mysqlTable("camera_configurations", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Connection settings
	streamUrl: varchar("stream_url", { length: 500 }).notNull(),
	streamType: mysqlEnum("stream_type", ['rtsp', 'http', 'webrtc', 'mjpeg', 'hls']).default('http').notNull(),
	username: varchar({ length: 100 }),
	password: varchar({ length: 255 }),
	// Camera settings
	resolution: varchar({ length: 50 }).default('1920x1080'),
	frameRate: int("frame_rate").default(30),
	// Location
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	position: varchar({ length: 100 }), // e.g., "entrance", "exit", "inspection"
	// Status
	isActive: boolean("is_active").default(true),
	lastConnectedAt: timestamp("last_connected_at", { mode: 'string' }),
	connectionStatus: mysqlEnum("connection_status", ['connected', 'disconnected', 'error', 'unknown']).default('unknown'),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_camera_config_line").on(table.productionLineId),
	index("idx_camera_config_workstation").on(table.workstationId),
	index("idx_camera_config_active").on(table.isActive),
]);

export type CameraConfiguration = typeof cameraConfigurations.$inferSelect;
export type InsertCameraConfiguration = typeof cameraConfigurations.$inferInsert;


// Camera Auto-Capture Schedules
export const cameraCaptureSchedules = mysqlTable("camera_capture_schedules", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	// Camera reference
	cameraId: int("camera_id").notNull(),
	// Schedule settings
	isEnabled: boolean("is_enabled").default(true).notNull(),
	captureIntervalSeconds: int("capture_interval_seconds").default(60).notNull(), // Interval between captures
	captureIntervalUnit: mysqlEnum("capture_interval_unit", ['seconds', 'minutes', 'hours']).default('minutes').notNull(),
	// Time window
	startTime: varchar("start_time", { length: 10 }), // HH:mm format, null = 00:00
	endTime: varchar("end_time", { length: 10 }), // HH:mm format, null = 23:59
	// Days of week (JSON array of 0-6, 0=Sunday)
	activeDays: json("active_days"), // e.g., [1,2,3,4,5] for weekdays
	// Production context
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productId: int("product_id"),
	// Auto-analysis settings
	autoAnalyze: boolean("auto_analyze").default(true).notNull(),
	analysisType: mysqlEnum("analysis_type", ['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).default('quality_inspection'),
	// Notification settings
	notifyOnNg: boolean("notify_on_ng").default(true).notNull(),
	notifyOnWarning: boolean("notify_on_warning").default(false).notNull(),
	notificationEmails: json("notification_emails"), // Array of email addresses
	webhookUrl: varchar("webhook_url", { length: 500 }),
	// Statistics
	totalCaptures: int("total_captures").default(0).notNull(),
	successCaptures: int("success_captures").default(0).notNull(),
	failedCaptures: int("failed_captures").default(0).notNull(),
	lastCaptureAt: timestamp("last_capture_at", { mode: 'string' }),
	lastCaptureStatus: mysqlEnum("last_capture_status", ['success', 'failed', 'pending']).default('pending'),
	lastCaptureError: text("last_capture_error"),
	// Metadata
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_capture_schedule_camera").on(table.cameraId),
	index("idx_capture_schedule_enabled").on(table.isEnabled),
	index("idx_capture_schedule_line").on(table.productionLineId),
]);

export type CameraCaptureSchedule = typeof cameraCaptureSchedules.$inferSelect;
export type InsertCameraCaptureSchedule = typeof cameraCaptureSchedules.$inferInsert;

// Camera Capture Logs
export const cameraCaptureLog = mysqlTable("camera_capture_log", {
	id: int().autoincrement().notNull().primaryKey(),
	scheduleId: int("schedule_id").notNull(),
	cameraId: int("camera_id").notNull(),
	// Capture result
	status: mysqlEnum(['success', 'failed', 'timeout', 'error']).default('success').notNull(),
	errorMessage: text("error_message"),
	// Image info
	imageId: int("image_id"), // Reference to sn_images
	imageUrl: varchar("image_url", { length: 1000 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Analysis result
	analysisResult: mysqlEnum("analysis_result", ['ok', 'ng', 'warning', 'pending', 'skipped']).default('pending'),
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	defectsFound: int("defects_found").default(0),
	// Timing
	captureStartedAt: timestamp("capture_started_at", { mode: 'string' }),
	captureCompletedAt: timestamp("capture_completed_at", { mode: 'string' }),
	analysisDurationMs: int("analysis_duration_ms"),
	// Metadata
	serialNumber: varchar("serial_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_capture_log_schedule").on(table.scheduleId),
	index("idx_capture_log_camera").on(table.cameraId),
	index("idx_capture_log_status").on(table.status),
	index("idx_capture_log_created").on(table.createdAt),
]);

export type CameraCaptureLog = typeof cameraCaptureLog.$inferSelect;
export type InsertCameraCaptureLog = typeof cameraCaptureLog.$inferInsert;

// Quality Statistics Report
export const qualityStatisticsReports = mysqlTable("quality_statistics_reports", {
	id: int().autoincrement().notNull().primaryKey(),
	// Report period
	reportDate: date("report_date").notNull(),
	periodType: mysqlEnum("period_type", ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily').notNull(),
	// Scope
	productionLineId: int("production_line_id"),
	workstationId: int("workstation_id"),
	productId: int("product_id"),
	// Statistics
	totalSamples: int("total_samples").default(0).notNull(),
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	okRate: decimal("ok_rate", { precision: 5, scale: 2 }), // Percentage
	ngRate: decimal("ng_rate", { precision: 5, scale: 2 }),
	// Quality metrics
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	minQualityScore: decimal("min_quality_score", { precision: 5, scale: 2 }),
	maxQualityScore: decimal("max_quality_score", { precision: 5, scale: 2 }),
	stdDevQualityScore: decimal("std_dev_quality_score", { precision: 5, scale: 2 }),
	// CPK/SPC metrics
	avgCpk: decimal("avg_cpk", { precision: 5, scale: 3 }),
	minCpk: decimal("min_cpk", { precision: 5, scale: 3 }),
	maxCpk: decimal("max_cpk", { precision: 5, scale: 3 }),
	// Defect analysis
	totalDefects: int("total_defects").default(0).notNull(),
	defectsByType: json("defects_by_type"), // { type: count }
	topDefectTypes: json("top_defect_types"), // Array of top defect types
	// Trend data
	trendData: json("trend_data"), // Array of { date, okRate, ngRate, avgScore }
	// Comparison with previous period
	prevPeriodOkRate: decimal("prev_period_ok_rate", { precision: 5, scale: 2 }),
	okRateChange: decimal("ok_rate_change", { precision: 5, scale: 2 }), // Percentage change
	trendDirection: mysqlEnum("trend_direction", ['improving', 'stable', 'declining']).default('stable'),
	// Metadata
	generatedAt: timestamp("generated_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	generatedBy: int("generated_by"),
},
(table) => [
	index("idx_quality_stats_date").on(table.reportDate),
	index("idx_quality_stats_period").on(table.periodType),
	index("idx_quality_stats_line").on(table.productionLineId),
	index("idx_quality_stats_product").on(table.productId),
]);

export type QualityStatisticsReport = typeof qualityStatisticsReports.$inferSelect;
export type InsertQualityStatisticsReport = typeof qualityStatisticsReports.$inferInsert;


// =============================================
// AOI/AVI Integration Tables
// =============================================

// Defect Types for AOI/AVI
export const aoiAviDefectTypes = mysqlTable("aoi_avi_defect_types", {
	id: int().autoincrement().notNull().primaryKey(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: mysqlEnum(['visual', 'dimensional', 'surface', 'structural', 'other']).default('visual').notNull(),
	severity: mysqlEnum(['critical', 'major', 'minor', 'cosmetic']).default('minor').notNull(),
	inspectionType: mysqlEnum("inspection_type", ['aoi', 'avi', 'both']).default('both').notNull(),
	isActive: int("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_defect_type_code").on(table.code),
	index("idx_defect_type_category").on(table.category),
	index("idx_defect_type_severity").on(table.severity),
]);
export type AoiAviDefectType = typeof aoiAviDefectTypes.$inferSelect;
export type InsertAoiAviDefectType = typeof aoiAviDefectTypes.$inferInsert;

// AOI Inspection Records
export const aoiInspectionRecords = mysqlTable("aoi_inspection_records", {
	id: int().autoincrement().notNull().primaryKey(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Inspection result
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass').notNull(),
	defectCount: int("defect_count").default(0).notNull(),
	defectTypes: json("defect_types"), // Array of defect type IDs
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	// Image references
	imageUrl: varchar("image_url", { length: 1000 }),
	imageKey: varchar("image_key", { length: 255 }),
	// Timing
	inspectionStartedAt: timestamp("inspection_started_at", { mode: 'string' }),
	inspectionCompletedAt: timestamp("inspection_completed_at", { mode: 'string' }),
	inspectionDurationMs: int("inspection_duration_ms"),
	// Metadata
	operatorId: int("operator_id"),
	shiftId: varchar("shift_id", { length: 50 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_aoi_serial").on(table.serialNumber),
	index("idx_aoi_machine").on(table.machineId),
	index("idx_aoi_line").on(table.productionLineId),
	index("idx_aoi_result").on(table.result),
	index("idx_aoi_created").on(table.createdAt),
]);
export type AoiInspectionRecord = typeof aoiInspectionRecords.$inferSelect;
export type InsertAoiInspectionRecord = typeof aoiInspectionRecords.$inferInsert;

// AVI Inspection Records
export const aviInspectionRecords = mysqlTable("avi_inspection_records", {
	id: int().autoincrement().notNull().primaryKey(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Inspection result
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass').notNull(),
	defectCount: int("defect_count").default(0).notNull(),
	defectTypes: json("defect_types"), // Array of defect type IDs
	qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
	// Video/Image references
	videoUrl: varchar("video_url", { length: 1000 }),
	videoKey: varchar("video_key", { length: 255 }),
	thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
	// Timing
	inspectionStartedAt: timestamp("inspection_started_at", { mode: 'string' }),
	inspectionCompletedAt: timestamp("inspection_completed_at", { mode: 'string' }),
	inspectionDurationMs: int("inspection_duration_ms"),
	// Metadata
	operatorId: int("operator_id"),
	shiftId: varchar("shift_id", { length: 50 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_avi_serial").on(table.serialNumber),
	index("idx_avi_machine").on(table.machineId),
	index("idx_avi_line").on(table.productionLineId),
	index("idx_avi_result").on(table.result),
	index("idx_avi_created").on(table.createdAt),
]);
export type AviInspectionRecord = typeof aviInspectionRecords.$inferSelect;
export type InsertAviInspectionRecord = typeof aviInspectionRecords.$inferInsert;

// Golden Sample Images
export const goldenSampleImages = mysqlTable("golden_sample_images", {
	id: int().autoincrement().notNull().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productId: int("product_id"),
	machineId: int("machine_id"),
	// Image info
	imageUrl: varchar("image_url", { length: 1000 }).notNull(),
	imageKey: varchar("image_key", { length: 255 }).notNull(),
	imageType: mysqlEnum("image_type", ['front', 'back', 'top', 'bottom', 'left', 'right', 'angle', 'other']).default('front').notNull(),
	// Metadata
	version: varchar({ length: 20 }).default('1.0'),
	isActive: int("is_active").default(1).notNull(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_golden_product").on(table.productId),
	index("idx_golden_machine").on(table.machineId),
	index("idx_golden_type").on(table.imageType),
	index("idx_golden_active").on(table.isActive),
]);
export type GoldenSampleImage = typeof goldenSampleImages.$inferSelect;
export type InsertGoldenSampleImage = typeof goldenSampleImages.$inferInsert;

// AOI/AVI Yield Statistics
export const aoiAviYieldStats = mysqlTable("aoi_avi_yield_stats", {
	id: int().autoincrement().notNull().primaryKey(),
	// Period
	reportDate: date("report_date").notNull(),
	periodType: mysqlEnum("period_type", ['hourly', 'daily', 'weekly', 'monthly']).default('daily').notNull(),
	hour: int(), // For hourly stats
	// Scope
	inspectionType: mysqlEnum("inspection_type", ['aoi', 'avi', 'combined']).default('combined').notNull(),
	machineId: int("machine_id"),
	productionLineId: int("production_line_id"),
	productId: int("product_id"),
	// Statistics
	totalInspected: int("total_inspected").default(0).notNull(),
	passCount: int("pass_count").default(0).notNull(),
	failCount: int("fail_count").default(0).notNull(),
	warningCount: int("warning_count").default(0).notNull(),
	yieldRate: decimal("yield_rate", { precision: 5, scale: 2 }), // Percentage
	defectRate: decimal("defect_rate", { precision: 5, scale: 2 }), // Percentage
	// Quality metrics
	avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }),
	// Defect breakdown
	defectsByType: json("defects_by_type"), // { defectTypeId: count }
	topDefects: json("top_defects"), // Array of { defectTypeId, count, percentage }
	// Metadata
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("idx_yield_date").on(table.reportDate),
	index("idx_yield_period").on(table.periodType),
	index("idx_yield_type").on(table.inspectionType),
	index("idx_yield_machine").on(table.machineId),
	index("idx_yield_line").on(table.productionLineId),
]);
export type AoiAviYieldStat = typeof aoiAviYieldStats.$inferSelect;
export type InsertAoiAviYieldStat = typeof aoiAviYieldStats.$inferInsert;


// ============ Yield/Defect Alert History ============
export const yieldDefectAlertHistory = mysqlTable("yield_defect_alert_history", {
  id: int("id").primaryKey().autoincrement(),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // yield_low, defect_high, spc_violation
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, critical
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, acknowledged, resolved, dismissed
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  source: varchar("source", { length: 100 }), // machine, line, station
  sourceId: varchar("source_id", { length: 100 }),
  sourceName: varchar("source_name", { length: 255 }),
  metricName: varchar("metric_name", { length: 100 }),
  metricValue: decimal("metric_value", { precision: 15, scale: 6 }),
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 6 }),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  resolvedNote: text("resolved_note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_alert_type").on(table.alertType),
  index("idx_alert_severity").on(table.severity),
  index("idx_alert_status").on(table.status),
  index("idx_alert_created").on(table.createdAt),
]);
export type YieldDefectAlertHistory = typeof yieldDefectAlertHistory.$inferSelect;
export type InsertYieldDefectAlertHistory = typeof yieldDefectAlertHistory.$inferInsert;

// ============================================================
// AVI/AOI Enhancement Module - Additional Tables
// ============================================================

// Reference Images - Ảnh tham chiếu cho so sánh
export const referenceImages = mysqlTable("reference_images", {
	id: int().autoincrement().notNull().primaryKey(),
	productId: int("product_id"),
	machineId: int("machine_id"),
	stationId: int("station_id"),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	imageType: mysqlEnum("image_type", ['golden_sample', 'reference', 'standard']).default('reference').notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	metadata: json("metadata"),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_ref_img_product").on(table.productId),
	index("idx_ref_img_machine").on(table.machineId),
]);
export type ReferenceImage = typeof referenceImages.$inferSelect;
export type InsertReferenceImage = typeof referenceImages.$inferInsert;

// NTF Confirmations - Xác nhận No Trouble Found
export const ntfConfirmations = mysqlTable("ntf_confirmations", {
	id: int().autoincrement().notNull().primaryKey(),
	inspectionId: int("inspection_id"),
	originalResult: mysqlEnum("original_result", ['ng', 'ok', 'ntf']).notNull(),
	confirmedResult: mysqlEnum("confirmed_result", ['ng', 'ok', 'ntf']).notNull(),
	reason: text(),
	confirmedBy: int("confirmed_by"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("idx_ntf_inspection").on(table.inspectionId),
	index("idx_ntf_confirmed_by").on(table.confirmedBy),
]);
export type NtfConfirmation = typeof ntfConfirmations.$inferSelect;
export type InsertNtfConfirmation = typeof ntfConfirmations.$inferInsert;

// Inspection Measurement Points - Điểm đo kiểm tra
export const inspectionMeasurementPoints = mysqlTable("inspection_measurement_points", {
	id: int().autoincrement().notNull().primaryKey(),
	inspectionId: int("inspection_id"),
	pointName: varchar("point_name", { length: 255 }).notNull(),
	measuredValue: decimal("measured_value", { precision: 15, scale: 6 }),
	nominalValue: decimal("nominal_value", { precision: 15, scale: 6 }),
	upperLimit: decimal("upper_limit", { precision: 15, scale: 6 }),
	lowerLimit: decimal("lower_limit", { precision: 15, scale: 6 }),
	unit: varchar({ length: 50 }),
	result: mysqlEnum(['pass', 'fail', 'warning']).default('pass'),
	coordinates: json("coordinates"), // {x, y} position on image
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
	index("idx_measure_point_inspection").on(table.inspectionId),
]);
export type InspectionMeasurementPoint = typeof inspectionMeasurementPoints.$inferSelect;
export type InsertInspectionMeasurementPoint = typeof inspectionMeasurementPoints.$inferInsert;

// Machine Yield Statistics - Thống kê yield theo máy
export const machineYieldStatistics = mysqlTable("machine_yield_statistics", {
	id: int().autoincrement().notNull().primaryKey(),
	machineId: int("machine_id").notNull(),
	productId: int("product_id"),
	date: varchar({ length: 10 }).notNull(), // YYYY-MM-DD
	shift: varchar({ length: 20 }),
	totalInspected: int("total_inspected").default(0).notNull(),
	okCount: int("ok_count").default(0).notNull(),
	ngCount: int("ng_count").default(0).notNull(),
	ntfCount: int("ntf_count").default(0).notNull(),
	yieldRate: decimal("yield_rate", { precision: 8, scale: 4 }),
	firstPassYield: decimal("first_pass_yield", { precision: 8, scale: 4 }),
	topDefects: json("top_defects"),
	metadata: json("metadata"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_yield_machine").on(table.machineId),
	index("idx_yield_date").on(table.date),
	index("idx_yield_product").on(table.productId),
]);
export type MachineYieldStatistic = typeof machineYieldStatistics.$inferSelect;
export type InsertMachineYieldStatistic = typeof machineYieldStatistics.$inferInsert;

// AI Image Analysis Results - Kết quả phân tích ảnh AI
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
