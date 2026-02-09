import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SystemProvider } from "./contexts/SystemContext";
import { LicenseAccessProvider } from "./contexts/LicenseAccessContext";
import { PushNotificationProvider } from "./components/PushNotificationProvider";
import { ServiceWorkerUpdater, OfflineIndicator } from "./components/ServiceWorkerUpdater";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration với exponential backoff
      retry: (failureCount, error) => {
        // Không retry nếu là lỗi authentication
        if (error instanceof TRPCClientError) {
          if (error.message === UNAUTHED_ERR_MSG) return false;
          // Không retry nếu là lỗi 4xx (client error)
          const httpStatus = error.data?.httpStatus;
          if (httpStatus && httpStatus >= 400 && httpStatus < 500) return false;
        }
        // Retry tối đa 3 lần
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * Math.pow(2, attemptIndex), 8000);
      },
      // Stale time 30 giây
      staleTime: 30 * 1000,
      // Refetch khi window focus
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Retry mutations 1 lần cho network errors
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          // Chỉ retry nếu là network error
          if (error.message.includes('fetch') || error.message.includes('network')) {
            return failureCount < 1;
          }
        }
        return false;
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Register Service Worker for PWA with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                console.log('SW updated and activated');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SystemProvider>
          <LicenseAccessProvider>
            <PushNotificationProvider>
              <App />
              <ServiceWorkerUpdater />
              <OfflineIndicator />
            </PushNotificationProvider>
          </LicenseAccessProvider>
        </SystemProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
