import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// System and feature definitions
export const LICENSED_SYSTEMS = {
  spc: { id: "spc", name: "SPC/CPK", nameEn: "SPC/CPK" },
  mms: { id: "mms", name: "MMS", nameEn: "MMS" },
  production: { id: "production", name: "Sản xuất", nameEn: "Production" },
  license: { id: "license", name: "License", nameEn: "License" },
  system: { id: "system", name: "Hệ thống", nameEn: "System" },
} as const;

export type SystemId = keyof typeof LICENSED_SYSTEMS;

interface LicenseAccessContextType {
  // License info
  activeLicense: any | null;
  isLoading: boolean;
  
  // Access check functions
  hasSystemAccess: (systemId: SystemId) => boolean;
  hasFeatureAccess: (systemId: SystemId, featureId: string) => boolean;
  hasAnySystemAccess: () => boolean;
  
  // Get allowed systems/features
  getAllowedSystems: () => SystemId[];
  getAllowedFeatures: (systemId: SystemId) => string[];
  
  // UI helpers
  checkAccessAndNotify: (systemId: SystemId, featureId?: string) => boolean;
  
  // Refresh
  refreshLicense: () => void;
}

const LicenseAccessContext = createContext<LicenseAccessContextType | undefined>(undefined);

export function LicenseAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeLicense, setActiveLicense] = useState<any | null>(null);
  
  // Query active license
  const licenseQuery = trpc.license.getActive.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  
  useEffect(() => {
    if (licenseQuery.data) {
      setActiveLicense(licenseQuery.data);
    }
  }, [licenseQuery.data]);
  
  // Parse systems from license
  const parseSystems = (): SystemId[] => {
    if (!activeLicense?.systems) return [];
    try {
      return JSON.parse(activeLicense.systems) as SystemId[];
    } catch {
      return [];
    }
  };
  
  // Parse features from license
  const parseFeatures = (): Record<SystemId, string[]> => {
    if (!activeLicense?.systemFeatures) {
      return { spc: [], mms: [], production: [], license: [], system: [] };
    }
    try {
      return JSON.parse(activeLicense.systemFeatures) as Record<SystemId, string[]>;
    } catch {
      return { spc: [], mms: [], production: [], license: [], system: [] };
    }
  };
  
  // Check if user has access to a system
  const hasSystemAccess = (systemId: SystemId): boolean => {
    // Admin always has full access
    if (user?.role === "admin") return true;
    
    // If no license, check if it's a basic feature
    if (!activeLicense) return false;
    
    // Check if license is active and not expired
    if (activeLicense.isActive !== 1) return false;
    if (activeLicense.expiresAt && new Date(activeLicense.expiresAt) < new Date()) return false;
    
    const systems = parseSystems();
    return systems.includes(systemId);
  };
  
  // Check if user has access to a specific feature
  const hasFeatureAccess = (systemId: SystemId, featureId: string): boolean => {
    // Admin always has full access
    if (user?.role === "admin") return true;
    
    // First check system access
    if (!hasSystemAccess(systemId)) return false;
    
    const features = parseFeatures();
    return features[systemId]?.includes(featureId) || false;
  };
  
  // Check if user has access to any system
  const hasAnySystemAccess = (): boolean => {
    if (user?.role === "admin") return true;
    const systems = parseSystems();
    return systems.length > 0;
  };
  
  // Get all allowed systems
  const getAllowedSystems = (): SystemId[] => {
    if (user?.role === "admin") {
      return Object.keys(LICENSED_SYSTEMS) as SystemId[];
    }
    return parseSystems();
  };
  
  // Get allowed features for a system
  const getAllowedFeatures = (systemId: SystemId): string[] => {
    if (user?.role === "admin") return ["*"]; // All features
    const features = parseFeatures();
    return features[systemId] || [];
  };
  
  // Check access and show notification if denied
  const checkAccessAndNotify = (systemId: SystemId, featureId?: string): boolean => {
    if (featureId) {
      if (!hasFeatureAccess(systemId, featureId)) {
        toast.error("Không có quyền truy cập", {
          description: `Bạn cần license cho chức năng này. Vui lòng liên hệ quản trị viên.`,
        });
        return false;
      }
    } else {
      if (!hasSystemAccess(systemId)) {
        toast.error("Không có quyền truy cập", {
          description: `Bạn cần license cho hệ thống ${LICENSED_SYSTEMS[systemId].name}. Vui lòng liên hệ quản trị viên.`,
        });
        return false;
      }
    }
    return true;
  };
  
  // Refresh license data
  const refreshLicense = () => {
    licenseQuery.refetch();
  };
  
  const value: LicenseAccessContextType = {
    activeLicense,
    isLoading: licenseQuery.isLoading,
    hasSystemAccess,
    hasFeatureAccess,
    hasAnySystemAccess,
    getAllowedSystems,
    getAllowedFeatures,
    checkAccessAndNotify,
    refreshLicense,
  };
  
  return (
    <LicenseAccessContext.Provider value={value}>
      {children}
    </LicenseAccessContext.Provider>
  );
}

export function useLicenseAccess() {
  const context = useContext(LicenseAccessContext);
  if (context === undefined) {
    throw new Error("useLicenseAccess must be used within a LicenseAccessProvider");
  }
  return context;
}

// HOC to protect routes/components based on license
export function withLicenseAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredSystem: SystemId,
  requiredFeature?: string
) {
  return function WithLicenseAccessComponent(props: P) {
    const { hasSystemAccess, hasFeatureAccess, isLoading } = useLicenseAccess();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    const hasAccess = requiredFeature 
      ? hasFeatureAccess(requiredSystem, requiredFeature)
      : hasSystemAccess(requiredSystem);
    
    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground max-w-md">
            Bạn cần license cho {requiredFeature ? "chức năng" : "hệ thống"} này. 
            Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}
