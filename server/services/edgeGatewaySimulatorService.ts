/**
 * Edge Gateway Simulator Service
 * Tạo simulator để test data flow từ edge đến cloud mà không cần hardware thực
 */

import { getDb } from "../db";

// Types
export interface SimulatorConfig {
  id: number;
  name: string;
  description?: string | null;
  gatewayId?: number | null;
  sensorType: 'temperature' | 'humidity' | 'pressure' | 'vibration' | 'current' | 'voltage' | 'custom';
  baseValue: number;
  noiseLevel: number;
  driftRate: number;
  anomalyProbability: number;
  anomalyMagnitude: number;
  latencyMin: number;
  latencyMax: number;
  packetLossRate: number;
  bufferEnabled: boolean;
  bufferSize: number;
  offlineProbability: number;
  offlineDurationMin: number;
  offlineDurationMax: number;
  samplingInterval: number;
  isActive: boolean;
  createdBy?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SimulatorSession {
  id: number;
  configId: number;
  status: 'running' | 'stopped' | 'paused' | 'error';
  startedAt: number;
  stoppedAt?: number | null;
  totalDataPoints: number;
  totalAnomalies: number;
  totalPacketsLost: number;
  totalOfflineEvents: number;
  totalBufferedPoints: number;
  avgLatency: number;
  currentValue: number;
  isOffline: boolean;
  bufferCount: number;
  lastDataAt?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateSimulatorConfigInput {
  name: string;
  description?: string;
  gatewayId?: number;
  sensorType?: string;
  baseValue?: number;
  noiseLevel?: number;
  driftRate?: number;
  anomalyProbability?: number;
  anomalyMagnitude?: number;
  latencyMin?: number;
  latencyMax?: number;
  packetLossRate?: number;
  bufferEnabled?: boolean;
  bufferSize?: number;
  offlineProbability?: number;
  offlineDurationMin?: number;
  offlineDurationMax?: number;
  samplingInterval?: number;
  createdBy?: number;
}

// Active simulators
const activeSimulators = new Map<number, {
  intervalId: NodeJS.Timeout;
  sessionId: number;
  config: SimulatorConfig;
  state: any;
}>();

// Get all simulator configs
export async function getAllSimulatorConfigs(): Promise<SimulatorConfig[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const results = await db.execute(`SELECT * FROM edge_simulator_configs ORDER BY created_at DESC`);
    return ((results as any[]) || []).map(mapConfigFromDb);
  } catch (error) {
    console.error('[EdgeSimulator] Error fetching configs:', error);
    return [];
  }
}

// Get simulator config by ID
export async function getSimulatorConfigById(id: number): Promise<SimulatorConfig | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const results = await db.execute(`SELECT * FROM edge_simulator_configs WHERE id = ?`, [id]);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[EdgeSimulator] Error fetching config:', error);
    return null;
  }
}

// Create simulator config
export async function createSimulatorConfig(input: CreateSimulatorConfigInput): Promise<SimulatorConfig | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.execute(
      `INSERT INTO edge_simulator_configs (name, description, gateway_id, sensor_type, base_value, noise_level, drift_rate, anomaly_probability, anomaly_magnitude, latency_min, latency_max, packet_loss_rate, buffer_enabled, buffer_size, offline_probability, offline_duration_min, offline_duration_max, sampling_interval, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.description || null,
        input.gatewayId || null,
        input.sensorType || 'temperature',
        input.baseValue ?? 25,
        input.noiseLevel ?? 0.02,
        input.driftRate ?? 0,
        input.anomalyProbability ?? 0.01,
        input.anomalyMagnitude ?? 3,
        input.latencyMin ?? 10,
        input.latencyMax ?? 100,
        input.packetLossRate ?? 0,
        input.bufferEnabled ? 1 : 0,
        input.bufferSize ?? 1000,
        input.offlineProbability ?? 0.001,
        input.offlineDurationMin ?? 5,
        input.offlineDurationMax ?? 60,
        input.samplingInterval ?? 1000,
        input.createdBy || null,
      ]
    );
    const results = await db.execute(`SELECT * FROM edge_simulator_configs ORDER BY id DESC LIMIT 1`);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[EdgeSimulator] Error creating config:', error);
    return null;
  }
}

// Start simulator
export async function startSimulator(configId: number): Promise<{ success: boolean; sessionId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  if (activeSimulators.has(configId)) {
    return { success: false, error: 'Simulator already running' };
  }
  try {
    const config = await getSimulatorConfigById(configId);
    if (!config) {
      return { success: false, error: 'Config not found' };
    }
    const now = Date.now();
    await db.execute(
      `INSERT INTO edge_simulator_sessions (config_id, status, started_at, current_value) VALUES (?, 'running', ?, ?)`,
      [configId, now, config.baseValue]
    );
    const sessionResult = await db.execute(`SELECT id FROM edge_simulator_sessions ORDER BY id DESC LIMIT 1`);
    const sessionId = (sessionResult as any[])?.[0]?.id;
    const state = {
      currentValue: config.baseValue,
      drift: 0,
      isOffline: false,
      offlineUntil: 0,
      buffer: [] as any[],
      totalDataPoints: 0,
      totalAnomalies: 0,
      totalPacketsLost: 0,
      totalOfflineEvents: 0,
      totalBufferedPoints: 0,
      latencies: [] as number[],
    };
    const intervalId = setInterval(async () => {
      await simulationTick(configId, sessionId, config, state);
    }, config.samplingInterval);
    activeSimulators.set(configId, { intervalId, sessionId, config, state });
    await db.execute(`UPDATE edge_simulator_configs SET is_active = 1 WHERE id = ?`, [configId]);
    console.log(`[EdgeSimulator] Started simulator ${configId} with session ${sessionId}`);
    return { success: true, sessionId };
  } catch (error) {
    console.error('[EdgeSimulator] Error starting simulator:', error);
    return { success: false, error: String(error) };
  }
}

// Stop simulator
export async function stopSimulator(configId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const simulator = activeSimulators.get(configId);
  if (!simulator) return false;
  try {
    clearInterval(simulator.intervalId);
    const now = Date.now();
    const avgLatency = simulator.state.latencies.length > 0
      ? simulator.state.latencies.reduce((a: number, b: number) => a + b, 0) / simulator.state.latencies.length
      : 0;
    await db.execute(
      `UPDATE edge_simulator_sessions SET status = 'stopped', stopped_at = ?, total_data_points = ?, total_anomalies = ?, total_packets_lost = ?, total_offline_events = ?, total_buffered_points = ?, avg_latency = ? WHERE id = ?`,
      [now, simulator.state.totalDataPoints, simulator.state.totalAnomalies, simulator.state.totalPacketsLost, simulator.state.totalOfflineEvents, simulator.state.totalBufferedPoints, avgLatency, simulator.sessionId]
    );
    await db.execute(`UPDATE edge_simulator_configs SET is_active = 0 WHERE id = ?`, [configId]);
    activeSimulators.delete(configId);
    console.log(`[EdgeSimulator] Stopped simulator ${configId}`);
    return true;
  } catch (error) {
    console.error('[EdgeSimulator] Error stopping simulator:', error);
    return false;
  }
}

// Simulation tick
async function simulationTick(configId: number, sessionId: number, config: SimulatorConfig, state: any): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  if (state.isOffline && now < state.offlineUntil) {
    if (config.bufferEnabled) {
      const value = generateValue(config, state);
      state.buffer.push({ value, timestamp: now });
      if (state.buffer.length > config.bufferSize) state.buffer.shift();
      state.totalBufferedPoints++;
    }
    return;
  }
  if (Math.random() < config.offlineProbability) {
    state.isOffline = true;
    const duration = config.offlineDurationMin + Math.random() * (config.offlineDurationMax - config.offlineDurationMin);
    state.offlineUntil = now + duration * 1000;
    state.totalOfflineEvents++;
    return;
  }
  if (state.isOffline) {
    state.isOffline = false;
    state.buffer = [];
  }
  const value = generateValue(config, state);
  if (Math.random() < config.packetLossRate) {
    state.totalPacketsLost++;
    return;
  }
  const latency = config.latencyMin + Math.random() * (config.latencyMax - config.latencyMin);
  state.latencies.push(latency);
  if (state.latencies.length > 100) state.latencies.shift();
  state.totalDataPoints++;
  state.currentValue = value;
  try {
    await db.execute(
      `UPDATE edge_simulator_sessions SET total_data_points = ?, total_anomalies = ?, current_value = ?, last_data_at = ? WHERE config_id = ? AND status = 'running'`,
      [state.totalDataPoints, state.totalAnomalies, value, now, configId]
    );
  } catch (error) {
    console.error('[EdgeSimulator] Error updating session:', error);
  }
}

// Generate sensor value
function generateValue(config: SimulatorConfig, state: any): number {
  state.drift += config.driftRate;
  let value = config.baseValue + state.drift;
  const noise = (Math.random() - 0.5) * 2 * config.noiseLevel * config.baseValue;
  value += noise;
  if (Math.random() < config.anomalyProbability) {
    const sign = Math.random() > 0.5 ? 1 : -1;
    value += sign * config.anomalyMagnitude * config.noiseLevel * config.baseValue;
    state.totalAnomalies++;
  }
  state.currentValue = value;
  return value;
}

// Get simulator status
export function getSimulatorStatus(configId: number): { isRunning: boolean; sessionId?: number; stats?: any } {
  const simulator = activeSimulators.get(configId);
  if (!simulator) return { isRunning: false };
  const avgLatency = simulator.state.latencies.length > 0
    ? simulator.state.latencies.reduce((a: number, b: number) => a + b, 0) / simulator.state.latencies.length
    : 0;
  return {
    isRunning: true,
    sessionId: simulator.sessionId,
    stats: {
      totalDataPoints: simulator.state.totalDataPoints,
      totalAnomalies: simulator.state.totalAnomalies,
      totalPacketsLost: simulator.state.totalPacketsLost,
      totalOfflineEvents: simulator.state.totalOfflineEvents,
      avgLatency,
      currentValue: simulator.state.currentValue,
      isOffline: simulator.state.isOffline,
      bufferCount: simulator.state.buffer.length,
    },
  };
}

// Get active session
export async function getActiveSession(configId: number): Promise<SimulatorSession | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const results = await db.execute(
      `SELECT * FROM edge_simulator_sessions WHERE config_id = ? AND status = 'running' ORDER BY id DESC LIMIT 1`,
      [configId]
    );
    if (!results || (results as any[]).length === 0) return null;
    return mapSessionFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[EdgeSimulator] Error fetching session:', error);
    return null;
  }
}

// Get all running simulators
export function getAllRunningSimulators(): any[] {
  const running: any[] = [];
  for (const [configId, simulator] of activeSimulators) {
    const avgLatency = simulator.state.latencies.length > 0
      ? simulator.state.latencies.reduce((a: number, b: number) => a + b, 0) / simulator.state.latencies.length
      : 0;
    running.push({
      configId,
      sessionId: simulator.sessionId,
      config: simulator.config,
      stats: {
        totalDataPoints: simulator.state.totalDataPoints,
        totalAnomalies: simulator.state.totalAnomalies,
        totalPacketsLost: simulator.state.totalPacketsLost,
        avgLatency,
        currentValue: simulator.state.currentValue,
        isOffline: simulator.state.isOffline,
      },
    });
  }
  return running;
}

// Helper: Map config from database row
function mapConfigFromDb(row: any): SimulatorConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    gatewayId: row.gateway_id,
    sensorType: row.sensor_type || 'temperature',
    baseValue: row.base_value ? parseFloat(row.base_value) : 25,
    noiseLevel: row.noise_level ? parseFloat(row.noise_level) : 0.02,
    driftRate: row.drift_rate ? parseFloat(row.drift_rate) : 0,
    anomalyProbability: row.anomaly_probability ? parseFloat(row.anomaly_probability) : 0.01,
    anomalyMagnitude: row.anomaly_magnitude ? parseFloat(row.anomaly_magnitude) : 3,
    latencyMin: row.latency_min || 10,
    latencyMax: row.latency_max || 100,
    packetLossRate: row.packet_loss_rate ? parseFloat(row.packet_loss_rate) : 0,
    bufferEnabled: row.buffer_enabled === 1,
    bufferSize: row.buffer_size || 1000,
    offlineProbability: row.offline_probability ? parseFloat(row.offline_probability) : 0.001,
    offlineDurationMin: row.offline_duration_min || 5,
    offlineDurationMax: row.offline_duration_max || 60,
    samplingInterval: row.sampling_interval || 1000,
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Map session from database row
function mapSessionFromDb(row: any): SimulatorSession {
  return {
    id: row.id,
    configId: row.config_id,
    status: row.status || 'stopped',
    startedAt: row.started_at,
    stoppedAt: row.stopped_at,
    totalDataPoints: row.total_data_points || 0,
    totalAnomalies: row.total_anomalies || 0,
    totalPacketsLost: row.total_packets_lost || 0,
    totalOfflineEvents: row.total_offline_events || 0,
    totalBufferedPoints: row.total_buffered_points || 0,
    avgLatency: row.avg_latency ? parseFloat(row.avg_latency) : 0,
    currentValue: row.current_value ? parseFloat(row.current_value) : 0,
    isOffline: row.is_offline === 1,
    bufferCount: row.buffer_count || 0,
    lastDataAt: row.last_data_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
