import { describe, it, expect, beforeEach } from 'vitest';
import {
  iotConnectionManager,
  createIoTConnection,
  getIoTConnection,
  getAllIoTConnections,
  deleteIoTConnection,
  getIoTConnectionStats,
  testIoTConnection,
} from './iotConnectionService';

describe('IoT Connection Service', () => {
  beforeEach(() => {
    // Clear all connections before each test
    const connections = getAllIoTConnections();
    connections.forEach(conn => deleteIoTConnection(conn.id));
  });

  describe('createIoTConnection', () => {
    it('should create a new MQTT connection', () => {
      const connection = createIoTConnection({
        name: 'Test MQTT Connection',
        description: 'Test connection for MQTT broker',
        config: {
          protocol: 'mqtt',
          host: 'mqtt.example.com',
          port: 1883,
          useTls: false,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: 'test/#', qos: 0 }],
        },
      });

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.name).toBe('Test MQTT Connection');
      expect(connection.config.protocol).toBe('mqtt');
      expect(connection.status).toBe('disconnected');
    });

    it('should create a new OPC-UA connection', () => {
      const connection = createIoTConnection({
        name: 'Test OPC-UA Connection',
        config: {
          protocol: 'opcua',
          endpointUrl: 'opc.tcp://localhost:4840',
          securityMode: 'None',
          securityPolicy: 'None',
          applicationName: 'TestApp',
          nodeIds: [
            { nodeId: 'ns=2;s=Temperature', displayName: 'Temperature', dataType: 'Float' },
          ],
          samplingInterval: 1000,
          publishingInterval: 1000,
        },
      });

      expect(connection).toBeDefined();
      expect(connection.config.protocol).toBe('opcua');
      expect(connection.status).toBe('disconnected');
    });

    it('should create a new Modbus connection', () => {
      const connection = createIoTConnection({
        name: 'Test Modbus Connection',
        config: {
          protocol: 'modbus',
          host: '192.168.1.100',
          port: 502,
          unitId: 1,
          registers: [
            { address: 0, type: 'holding', count: 1, name: 'Register1', dataType: 'Int16' },
          ],
          pollingInterval: 1000,
        },
      });

      expect(connection).toBeDefined();
      expect(connection.config.protocol).toBe('modbus');
    });
  });

  describe('getIoTConnection', () => {
    it('should return connection by ID', () => {
      const created = createIoTConnection({
        name: 'Test Connection',
        config: {
          protocol: 'mqtt',
          host: 'localhost',
          port: 1883,
          useTls: false,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: 'test', qos: 0 }],
        },
      });

      const retrieved = getIoTConnection(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent connection', () => {
      const result = getIoTConnection('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getAllIoTConnections', () => {
    it('should return all connections', () => {
      createIoTConnection({
        name: 'Connection 1',
        config: {
          protocol: 'mqtt',
          host: 'localhost',
          port: 1883,
          useTls: false,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: 'test', qos: 0 }],
        },
      });

      createIoTConnection({
        name: 'Connection 2',
        config: {
          protocol: 'opcua',
          endpointUrl: 'opc.tcp://localhost:4840',
          securityMode: 'None',
          securityPolicy: 'None',
          applicationName: 'TestApp',
          nodeIds: [],
          samplingInterval: 1000,
          publishingInterval: 1000,
        },
      });

      const connections = getAllIoTConnections();
      expect(connections.length).toBe(2);
    });
  });

  describe('deleteIoTConnection', () => {
    it('should delete a connection', () => {
      const connection = createIoTConnection({
        name: 'To Delete',
        config: {
          protocol: 'mqtt',
          host: 'localhost',
          port: 1883,
          useTls: false,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: 'test', qos: 0 }],
        },
      });

      const result = deleteIoTConnection(connection.id);
      expect(result).toBe(true);

      const retrieved = getIoTConnection(connection.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent connection', () => {
      const result = deleteIoTConnection('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getIoTConnectionStats', () => {
    it('should return correct statistics', () => {
      createIoTConnection({
        name: 'Connection 1',
        config: {
          protocol: 'mqtt',
          host: 'localhost',
          port: 1883,
          useTls: false,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: 'test', qos: 0 }],
        },
      });

      const stats = getIoTConnectionStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.disconnectedCount).toBe(1);
      expect(stats.connectedCount).toBe(0);
    });
  });

  describe('testIoTConnection', () => {
    it('should validate MQTT configuration', async () => {
      const result = await testIoTConnection({
        protocol: 'mqtt',
        host: 'mqtt.example.com',
        port: 1883,
        useTls: false,
        cleanSession: true,
        keepAlive: 60,
        reconnectPeriod: 5000,
        topics: [{ topic: 'test', qos: 0 }],
      });

      expect(result.success).toBe(true);
      expect(result.latency).toBeDefined();
    });

    it('should reject invalid MQTT configuration', async () => {
      const result = await testIoTConnection({
        protocol: 'mqtt',
        host: '',
        port: 1883,
        useTls: false,
        cleanSession: true,
        keepAlive: 60,
        reconnectPeriod: 5000,
        topics: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate OPC-UA configuration', async () => {
      const result = await testIoTConnection({
        protocol: 'opcua',
        endpointUrl: 'opc.tcp://localhost:4840',
        securityMode: 'None',
        securityPolicy: 'None',
        applicationName: 'TestApp',
        nodeIds: [{ nodeId: 'ns=2;s=Test', displayName: 'Test', dataType: 'Float' }],
        samplingInterval: 1000,
        publishingInterval: 1000,
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid OPC-UA configuration', async () => {
      const result = await testIoTConnection({
        protocol: 'opcua',
        endpointUrl: '',
        securityMode: 'None',
        securityPolicy: 'None',
        applicationName: 'TestApp',
        nodeIds: [],
        samplingInterval: 1000,
        publishingInterval: 1000,
      });

      expect(result.success).toBe(false);
    });
  });
});
