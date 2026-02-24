/**
 * OPC-UA Client Service
 * Kết nối với OPC-UA server từ PLC/SCADA để lấy dữ liệu sản xuất
 */

import {
  OPCUAClient,
  ClientSession,
  ClientSubscription,
  ClientMonitoredItem,
  AttributeIds,
  TimestampsToReturn,
  MonitoringParametersOptions,
  ReadValueIdOptions,
  DataValue,
  StatusCodes,
  MessageSecurityMode,
  SecurityPolicy,
  UserIdentityInfo,
  UserTokenType,
} from 'node-opcua';
import { EventEmitter } from 'events';

// Types
export interface OpcuaConfig {
  endpointUrl: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  applicationName?: string;
  sessionTimeout?: number;
  keepAliveInterval?: number;
}

export interface OpcuaNodeConfig {
  nodeId: string;
  displayName: string;
  samplingInterval?: number;
  queueSize?: number;
  discardOldest?: boolean;
}

export interface OpcuaDataPoint {
  nodeId: string;
  displayName: string;
  value: any;
  dataType: string;
  quality: string;
  timestamp: Date;
  sourceTimestamp?: Date;
}

// Default configuration
const DEFAULT_CONFIG: Partial<OpcuaConfig> = {
  securityMode: 'None',
  applicationName: 'SPC Calculator OPC-UA Client',
  sessionTimeout: 60000,
  keepAliveInterval: 10000,
};

// OPC-UA Service Class
class OpcuaService extends EventEmitter {
  private client: OPCUAClient | null = null;
  private session: ClientSession | null = null;
  private subscription: ClientSubscription | null = null;
  private monitoredItems: Map<string, ClientMonitoredItem> = new Map();
  private config: OpcuaConfig;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private dataHistory: Map<string, OpcuaDataPoint[]> = new Map();
  private maxHistorySize = 1000;

  constructor(config: OpcuaConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Kết nối đến OPC-UA server
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    try {
      console.log(`[OPC-UA] Connecting to ${this.config.endpointUrl}...`);

      // Create client
      this.client = OPCUAClient.create({
        applicationName: this.config.applicationName,
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 3,
          maxDelay: 10000,
        },
        securityMode: this.getSecurityMode(),
        securityPolicy: this.getSecurityPolicy(),
        endpointMustExist: false,
        keepAliveInterval: this.config.keepAliveInterval,
      });

      // Connect to endpoint
      await this.client.connect(this.config.endpointUrl);
      console.log('[OPC-UA] Connected to endpoint');

      // Create session
      const userIdentity = this.getUserIdentity();
      this.session = await this.client.createSession(userIdentity);
      console.log('[OPC-UA] Session created');

      // Setup event handlers
      this.setupEventHandlers();

      this.isConnected = true;
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('[OPC-UA] Connection error:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Ngắt kết nối
   */
  async disconnect(): Promise<void> {
    try {
      // Stop reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Close subscription
      if (this.subscription) {
        await this.subscription.terminate();
        this.subscription = null;
      }

      // Close session
      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      // Disconnect client
      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      this.isConnected = false;
      this.monitoredItems.clear();
      console.log('[OPC-UA] Disconnected');
      this.emit('disconnected');
    } catch (error) {
      console.error('[OPC-UA] Disconnect error:', error);
    }
  }

  /**
   * Đọc giá trị từ một node
   */
  async readNode(nodeId: string): Promise<OpcuaDataPoint | null> {
    if (!this.session) {
      throw new Error('Not connected to OPC-UA server');
    }

    try {
      const dataValue = await this.session.read({
        nodeId,
        attributeId: AttributeIds.Value,
      });

      return this.parseDataValue(nodeId, nodeId, dataValue);
    } catch (error) {
      console.error(`[OPC-UA] Read error for ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Đọc nhiều nodes cùng lúc
   */
  async readNodes(nodeIds: string[]): Promise<OpcuaDataPoint[]> {
    if (!this.session) {
      throw new Error('Not connected to OPC-UA server');
    }

    try {
      const nodesToRead: ReadValueIdOptions[] = nodeIds.map(nodeId => ({
        nodeId,
        attributeId: AttributeIds.Value,
      }));

      const dataValues = await this.session.read(nodesToRead);
      
      return dataValues.map((dv, i) => 
        this.parseDataValue(nodeIds[i], nodeIds[i], dv)
      ).filter((dp): dp is OpcuaDataPoint => dp !== null);
    } catch (error) {
      console.error('[OPC-UA] Batch read error:', error);
      return [];
    }
  }

  /**
   * Ghi giá trị vào một node
   */
  async writeNode(nodeId: string, value: any): Promise<boolean> {
    if (!this.session) {
      throw new Error('Not connected to OPC-UA server');
    }

    try {
      const statusCode = await this.session.write({
        nodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: {
            dataType: this.inferDataType(value),
            value,
          },
        },
      });

      return statusCode.isGood();
    } catch (error) {
      console.error(`[OPC-UA] Write error for ${nodeId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe một node để nhận updates
   */
  async subscribeNode(config: OpcuaNodeConfig): Promise<boolean> {
    if (!this.session) {
      throw new Error('Not connected to OPC-UA server');
    }

    try {
      // Create subscription if not exists
      if (!this.subscription) {
        this.subscription = await this.session.createSubscription2({
          requestedPublishingInterval: 1000,
          requestedLifetimeCount: 100,
          requestedMaxKeepAliveCount: 10,
          maxNotificationsPerPublish: 100,
          publishingEnabled: true,
          priority: 10,
        });

        this.subscription.on('keepalive', () => {
          console.log('[OPC-UA] Subscription keepalive');
        });
      }

      // Create monitored item
      const itemToMonitor: ReadValueIdOptions = {
        nodeId: config.nodeId,
        attributeId: AttributeIds.Value,
      };

      const parameters: MonitoringParametersOptions = {
        samplingInterval: config.samplingInterval || 1000,
        discardOldest: config.discardOldest !== false,
        queueSize: config.queueSize || 10,
      };

      const monitoredItem = await this.subscription.monitor(
        itemToMonitor,
        parameters,
        TimestampsToReturn.Both
      );

      // Handle value changes
      monitoredItem.on('changed', (dataValue: DataValue) => {
        const dataPoint = this.parseDataValue(config.nodeId, config.displayName, dataValue);
        if (dataPoint) {
          // Store in history
          this.storeInHistory(config.nodeId, dataPoint);
          
          // Emit event
          this.emit('dataChanged', dataPoint);
        }
      });

      this.monitoredItems.set(config.nodeId, monitoredItem);
      console.log(`[OPC-UA] Subscribed to ${config.nodeId}`);
      
      return true;
    } catch (error) {
      console.error(`[OPC-UA] Subscribe error for ${config.nodeId}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe một node
   */
  async unsubscribeNode(nodeId: string): Promise<void> {
    const item = this.monitoredItems.get(nodeId);
    if (item) {
      await item.terminate();
      this.monitoredItems.delete(nodeId);
      console.log(`[OPC-UA] Unsubscribed from ${nodeId}`);
    }
  }

  /**
   * Browse nodes từ một node cha
   */
  async browseNodes(nodeId: string = 'RootFolder'): Promise<any[]> {
    if (!this.session) {
      throw new Error('Not connected to OPC-UA server');
    }

    try {
      const browseResult = await this.session.browse(nodeId);
      
      return browseResult.references?.map(ref => ({
        nodeId: ref.nodeId.toString(),
        browseName: ref.browseName.toString(),
        displayName: ref.displayName.text,
        nodeClass: ref.nodeClass,
        typeDefinition: ref.typeDefinition?.toString(),
      })) || [];
    } catch (error) {
      console.error(`[OPC-UA] Browse error for ${nodeId}:`, error);
      return [];
    }
  }

  /**
   * Lấy trạng thái kết nối
   */
  getStatus(): {
    connected: boolean;
    endpointUrl: string;
    subscribedNodes: string[];
    sessionId?: string;
  } {
    return {
      connected: this.isConnected,
      endpointUrl: this.config.endpointUrl,
      subscribedNodes: Array.from(this.monitoredItems.keys()),
      sessionId: this.session?.sessionId?.toString(),
    };
  }

  /**
   * Lấy lịch sử data của một node
   */
  getHistory(nodeId: string, limit = 100): OpcuaDataPoint[] {
    const history = this.dataHistory.get(nodeId) || [];
    return history.slice(-limit);
  }

  /**
   * Xóa lịch sử
   */
  clearHistory(nodeId?: string): void {
    if (nodeId) {
      this.dataHistory.delete(nodeId);
    } else {
      this.dataHistory.clear();
    }
  }

  // Private methods

  private getSecurityMode(): MessageSecurityMode {
    switch (this.config.securityMode) {
      case 'Sign': return MessageSecurityMode.Sign;
      case 'SignAndEncrypt': return MessageSecurityMode.SignAndEncrypt;
      default: return MessageSecurityMode.None;
    }
  }

  private getSecurityPolicy(): SecurityPolicy {
    if (!this.config.securityPolicy) {
      return SecurityPolicy.None;
    }
    return this.config.securityPolicy as SecurityPolicy;
  }

  private getUserIdentity(): UserIdentityInfo {
    if (this.config.username && this.config.password) {
      return {
        type: UserTokenType.UserName,
        userName: this.config.username,
        password: this.config.password,
      };
    }
    return { type: UserTokenType.Anonymous };
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connection_lost', () => {
      console.log('[OPC-UA] Connection lost');
      this.isConnected = false;
      this.emit('connectionLost');
      this.scheduleReconnect();
    });

    this.client.on('connection_reestablished', () => {
      console.log('[OPC-UA] Connection reestablished');
      this.isConnected = true;
      this.emit('connectionReestablished');
    });

    this.client.on('close', () => {
      console.log('[OPC-UA] Client closed');
      this.isConnected = false;
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      console.log('[OPC-UA] Attempting reconnect...');
      await this.connect();
    }, 5000);
  }

  private parseDataValue(nodeId: string, displayName: string, dataValue: DataValue): OpcuaDataPoint | null {
    if (!dataValue || !dataValue.value) {
      return null;
    }

    return {
      nodeId,
      displayName,
      value: dataValue.value.value,
      dataType: dataValue.value.dataType?.toString() || 'Unknown',
      quality: dataValue.statusCode?.isGood() ? 'Good' : dataValue.statusCode?.toString() || 'Unknown',
      timestamp: dataValue.serverTimestamp || new Date(),
      sourceTimestamp: dataValue.sourceTimestamp || undefined,
    };
  }

  private storeInHistory(nodeId: string, dataPoint: OpcuaDataPoint): void {
    if (!this.dataHistory.has(nodeId)) {
      this.dataHistory.set(nodeId, []);
    }
    
    const history = this.dataHistory.get(nodeId)!;
    history.push(dataPoint);
    
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private inferDataType(value: any): number {
    if (typeof value === 'boolean') return 1; // Boolean
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return 6; // Int32
      return 11; // Double
    }
    if (typeof value === 'string') return 12; // String
    return 0; // Null
  }
}

// Connection manager for multiple OPC-UA connections
class OpcuaConnectionManager {
  private connections: Map<string, OpcuaService> = new Map();

  /**
   * Tạo hoặc lấy connection
   */
  getConnection(id: string, config?: OpcuaConfig): OpcuaService | null {
    if (this.connections.has(id)) {
      return this.connections.get(id)!;
    }

    if (config) {
      const service = new OpcuaService(config);
      this.connections.set(id, service);
      return service;
    }

    return null;
  }

  /**
   * Xóa connection
   */
  async removeConnection(id: string): Promise<void> {
    const service = this.connections.get(id);
    if (service) {
      await service.disconnect();
      this.connections.delete(id);
    }
  }

  /**
   * Lấy tất cả connections
   */
  getAllConnections(): Map<string, OpcuaService> {
    return this.connections;
  }

  /**
   * Ngắt tất cả connections
   */
  async disconnectAll(): Promise<void> {
    for (const [id, service] of this.connections) {
      await service.disconnect();
    }
    this.connections.clear();
  }
}

// Singleton instances
let opcuaManagerInstance: OpcuaConnectionManager | null = null;

export function getOpcuaManager(): OpcuaConnectionManager {
  if (!opcuaManagerInstance) {
    opcuaManagerInstance = new OpcuaConnectionManager();
  }
  return opcuaManagerInstance;
}

export { OpcuaService, OpcuaConnectionManager };
