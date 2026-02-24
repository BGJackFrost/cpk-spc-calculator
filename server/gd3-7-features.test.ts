import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("GĐ3.7 - AI Backend Completion, DB Indexes, About Page", () => {
  describe("AnomalyDetection.tsx - tRPC Integration", () => {
    const filePath = path.join(__dirname, "../client/src/pages/AnomalyDetection.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should import trpc", () => {
      expect(content).toContain("import { trpc }");
    });

    it("should use anomalyDetectionAI.listModels query", () => {
      expect(content).toContain("anomalyDetectionAI.listModels");
    });

    it("should use anomalyDetectionAI.stats query", () => {
      expect(content).toContain("anomalyDetectionAI.stats");
    });

    it("should use anomalyAlert queries", () => {
      expect(content).toContain("anomalyAlert.");
    });

    it("should not have mock/demo data", () => {
      expect(content).not.toMatch(/const\s+(mockData|demoData|DEMO_|MOCK_)/);
    });
  });

  describe("AiModelTraining.tsx - tRPC Integration", () => {
    const filePath = path.join(__dirname, "../client/src/pages/AiModelTraining.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should use ai.training.listJobs query", () => {
      expect(content).toContain("ai.training.listJobs");
    });

    it("should use ai.models.list query for trained models", () => {
      expect(content).toContain("ai.models.list");
    });

    it("should use useMemo for derived data", () => {
      expect(content).toContain("useMemo");
    });

    it("should not have setTrainingJobs or setTrainedModels local state setters", () => {
      expect(content).not.toContain("setTrainingJobs(prev");
      expect(content).not.toContain("setTrainedModels(prev");
    });
  });

  describe("About.tsx - License Comparison & Version Update", () => {
    const filePath = path.join(__dirname, "../client/src/pages/About.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should have updated version to 4.0.0", () => {
      expect(content).toContain('"4.0.0"');
    });

    it("should have updated build date to 2026-02-10", () => {
      expect(content).toContain('"2026-02-10"');
    });

    it("should have license comparison table", () => {
      expect(content).toContain("So sánh các gói License");
    });

    it("should list all license tiers in comparison", () => {
      expect(content).toContain("Trial");
      expect(content).toContain("Standard");
      expect(content).toContain("Professional");
      expect(content).toContain("Enterprise");
    });

    it("should include AI features in comparison table", () => {
      expect(content).toContain("AI Anomaly Detection");
      expect(content).toContain("AI Root Cause Analysis");
    });

    it("should use trpc for license activation", () => {
      expect(content).toContain("trpc.license.activateOnline");
      expect(content).toContain("trpc.license.activateOffline");
    });
  });

  describe("Database Schema Files", () => {
    it("should have machineOeeData in production schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema/production.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("machineOeeData");
    });

    it("should have workOrders in core schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema/core.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("workOrders");
    });

    it("should have iotDataPoints in iot schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema/iot.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("iotDataPoints");
    });
  });

  describe("AiDashboard.tsx - Already Connected", () => {
    const filePath = path.join(__dirname, "../client/src/pages/AiDashboard.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should have tRPC queries", () => {
      expect(content).toContain("trpc.");
    });

    it("should not have mock/demo data", () => {
      expect(content).not.toMatch(/const\s+(mockData|demoData|DEMO_|MOCK_)/);
    });
  });
});
