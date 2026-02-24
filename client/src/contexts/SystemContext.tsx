import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { SystemConfig, SYSTEMS, DEFAULT_SYSTEM, getSystemMenu, SystemMenuConfig } from "@/config/systemMenu";

interface SystemContextType {
  activeSystem: string;
  setActiveSystem: (systemId: string) => void;
  systemConfig: SystemConfig | null;
  systemMenu: SystemMenuConfig | null;
  allSystems: SystemConfig[];
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [activeSystem, setActiveSystemState] = useState<string>(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem("activeSystem");
    return saved || DEFAULT_SYSTEM;
  });

  const setActiveSystem = useCallback((systemId: string) => {
    setActiveSystemState(systemId);
    localStorage.setItem("activeSystem", systemId);
  }, []);

  // Get current system config
  const systemConfig = SYSTEMS[activeSystem.toUpperCase()] || SYSTEMS.SPC;
  const systemMenu = getSystemMenu(activeSystem);
  const allSystems = Object.values(SYSTEMS);

  // Sync with URL path to auto-switch system
  useEffect(() => {
    const path = window.location.pathname;
    
    // Auto-detect system from URL
    if (path.startsWith("/ai-") || path.startsWith("/anomaly-detection") || path.startsWith("/cpk-forecast")) {
      setActiveSystemState("ai");
    } else if (path.startsWith("/iot-") || path.startsWith("/mqtt-") || path.startsWith("/opcua-") || path.startsWith("/sensor-") || path.startsWith("/alarm-threshold") || path.startsWith("/realtime-machine") || path.startsWith("/realtime-history")) {
      setActiveSystemState("iot");
    } else if (path.startsWith("/license-")) {
      setActiveSystemState("license");
    } else if (path.startsWith("/oee-") || path.startsWith("/maintenance-") || path.startsWith("/spare-") || path.startsWith("/predictive-") || path.startsWith("/plant-kpi") || path.startsWith("/unified-dashboard")) {
      setActiveSystemState("mms");
    } else if (path.startsWith("/production-line-management") || path.startsWith("/workstation") || path.startsWith("/machine") || path.startsWith("/fixture") || path.startsWith("/process") || path.startsWith("/products") || path.startsWith("/measurement-")) {
      setActiveSystemState("production");
    } else if (path.startsWith("/users") || path.startsWith("/local-users") || path.startsWith("/settings") || path.startsWith("/database-") || path.startsWith("/backup-") || path.startsWith("/audit-") || path.startsWith("/smtp") || path.startsWith("/webhook") || path.startsWith("/organization") || path.startsWith("/module-permission") || path.startsWith("/approval-")) {
      setActiveSystemState("system");
    }
    // Default to SPC for other paths
  }, []);

  return (
    <SystemContext.Provider
      value={{
        activeSystem,
        setActiveSystem,
        systemConfig,
        systemMenu,
        allSystems,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error("useSystem must be used within a SystemProvider");
  }
  return context;
}
