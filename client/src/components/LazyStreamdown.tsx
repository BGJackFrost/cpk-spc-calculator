import React, { Suspense } from "react";

// Lazy load Streamdown (and its dependency shiki ~8.9MB) only when needed
const StreamdownComponent = React.lazy(() =>
  import("streamdown").then((mod) => ({ default: mod.Streamdown }))
);

interface LazyStreamdownProps {
  children: string;
}

function StreamdownFallback({ children }: { children: string }) {
  // Show raw text with basic formatting while Streamdown loads
  return (
    <div className="animate-pulse">
      <div className="whitespace-pre-wrap text-sm opacity-80">{children}</div>
    </div>
  );
}

export function LazyStreamdown({ children }: LazyStreamdownProps) {
  return (
    <Suspense fallback={<StreamdownFallback>{children}</StreamdownFallback>}>
      <StreamdownComponent>{children}</StreamdownComponent>
    </Suspense>
  );
}

export default LazyStreamdown;
