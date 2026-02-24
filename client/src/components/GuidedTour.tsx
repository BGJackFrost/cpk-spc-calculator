import Joyride, { CallBackProps, Styles } from "react-joyride";
import { TourStep } from "@/hooks/useGuidedTour";

interface GuidedTourProps {
  run: boolean;
  stepIndex: number;
  steps: TourStep[];
  onCallback: (data: CallBackProps) => void;
}

const tourStyles: Partial<Styles> = {
  options: {
    primaryColor: "#3b82f6",
    zIndex: 10000,
    arrowColor: "#fff",
    backgroundColor: "#fff",
    textColor: "#1f2937",
    overlayColor: "rgba(0, 0, 0, 0.5)",
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  tooltipContainer: {
    textAlign: "left" as const,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  buttonNext: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
  },
  buttonBack: {
    color: "#6b7280",
    marginRight: 8,
  },
  buttonSkip: {
    color: "#9ca3af",
  },
  spotlight: {
    borderRadius: 8,
  },
  beacon: {
    display: "none",
  },
};

const locale = {
  back: "Quay lại",
  close: "Đóng",
  last: "Hoàn thành",
  next: "Tiếp theo",
  open: "Mở hướng dẫn",
  skip: "Bỏ qua",
};

export default function GuidedTour({ run, stepIndex, steps, onCallback }: GuidedTourProps) {
  return (
    <Joyride
      run={run}
      stepIndex={stepIndex}
      steps={steps}
      callback={onCallback}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose
      styles={tourStyles}
      locale={locale}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
