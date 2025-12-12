import { useState, useEffect, useCallback } from "react";
import { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from "react-joyride";

const TOUR_STORAGE_KEY = "cpk-spc-guided-tour-completed";

export interface TourStep extends Step {
  id: string;
}

export function useGuidedTour(tourId: string, steps: TourStep[]) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  
  // Check if tour has been completed
  const getTourStatus = useCallback(() => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored) {
        const completed = JSON.parse(stored);
        return completed[tourId] === true;
      }
    } catch (e) {
      console.error("Error reading tour status:", e);
    }
    return false;
  }, [tourId]);
  
  // Mark tour as completed
  const completeTour = useCallback(() => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      const completed = stored ? JSON.parse(stored) : {};
      completed[tourId] = true;
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    } catch (e) {
      console.error("Error saving tour status:", e);
    }
  }, [tourId]);
  
  // Reset tour status
  const resetTour = useCallback(() => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      const completed = stored ? JSON.parse(stored) : {};
      delete completed[tourId];
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
      setStepIndex(0);
    } catch (e) {
      console.error("Error resetting tour status:", e);
    }
  }, [tourId]);
  
  // Start tour
  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);
  
  // Stop tour
  const stopTour = useCallback(() => {
    setRun(false);
  }, []);
  
  // Handle tour callback
  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      completeTour();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Update step index
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    }
  }, [completeTour]);
  
  // Auto-start tour for new users
  useEffect(() => {
    const hasCompleted = getTourStatus();
    if (!hasCompleted && steps.length > 0) {
      // Delay start to ensure DOM is ready
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [getTourStatus, steps.length]);
  
  return {
    run,
    stepIndex,
    steps,
    startTour,
    stopTour,
    resetTour,
    handleCallback,
    isCompleted: getTourStatus(),
  };
}

// Dashboard tour steps
export const dashboardTourSteps: TourStep[] = [
  {
    id: "welcome",
    target: "body",
    content: "Chào mừng bạn đến với SPC/CPK Calculator! Hãy để tôi hướng dẫn bạn các tính năng chính của hệ thống.",
    placement: "center",
    disableBeacon: true,
  },
  {
    id: "sidebar",
    target: '[data-tour="sidebar"]',
    content: "Đây là thanh điều hướng chính. Bạn có thể truy cập tất cả các tính năng từ đây.",
    placement: "right",
  },
  {
    id: "dashboard-stats",
    target: '[data-tour="dashboard-stats"]',
    content: "Khu vực này hiển thị các thống kê tổng quan: số mapping, phân tích gần đây, cảnh báo CPK và trạng thái hệ thống.",
    placement: "bottom",
  },
  {
    id: "quick-actions",
    target: '[data-tour="quick-actions"]',
    content: "Các thao tác nhanh giúp bạn truy cập nhanh vào các tính năng thường dùng nhất.",
    placement: "bottom",
  },
  {
    id: "analyze-button",
    target: '[data-tour="analyze-button"]',
    content: "Nhấn vào đây để bắt đầu phân tích SPC/CPK. Đây là tính năng chính của hệ thống.",
    placement: "bottom",
  },
  {
    id: "spc-plan",
    target: '[data-tour="spc-plan"]',
    content: "Quản lý kế hoạch SPC giúp bạn lên lịch và theo dõi các phân tích định kỳ.",
    placement: "bottom",
  },
  {
    id: "license-status",
    target: '[data-tour="license-status"]',
    content: "Kiểm tra trạng thái license và các giới hạn sử dụng của bạn tại đây.",
    placement: "left",
  },
];

// Analyze page tour steps
export const analyzeTourSteps: TourStep[] = [
  {
    id: "analyze-welcome",
    target: "body",
    content: "Đây là trang Phân tích SPC/CPK. Hãy làm theo các bước để thực hiện phân tích.",
    placement: "center",
    disableBeacon: true,
  },
  {
    id: "product-select",
    target: '[data-tour="product-select"]',
    content: "Bước 1: Chọn sản phẩm cần phân tích từ danh sách.",
    placement: "bottom",
  },
  {
    id: "station-select",
    target: '[data-tour="station-select"]',
    content: "Bước 2: Chọn trạm/công đoạn sản xuất.",
    placement: "bottom",
  },
  {
    id: "analyze-run",
    target: '[data-tour="analyze-run"]',
    content: "Bước 3: Nhấn nút này để chạy phân tích. Kết quả sẽ hiển thị bên dưới.",
    placement: "bottom",
  },
  {
    id: "export-buttons",
    target: '[data-tour="export-buttons"]',
    content: "Sau khi có kết quả, bạn có thể xuất báo cáo ra Excel hoặc PDF.",
    placement: "bottom",
  },
];
