/**
 * DashboardSkeletons - Skeleton loading components for Dashboard and SPC Analysis pages
 * Provides smooth loading experience with realistic placeholder layouts
 */

import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Dashboard Stats Card Skeleton
 */
export const DashboardStatsCardSkeleton = memo(function DashboardStatsCardSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <Card className={cn("bg-card rounded-xl border border-border/50 shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
});

/**
 * Dashboard Stats Grid Skeleton
 */
export const DashboardStatsGridSkeleton = memo(function DashboardStatsGridSkeleton({ 
  count = 4,
  className 
}: { 
  count?: number;
  className?: string 
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <DashboardStatsCardSkeleton key={i} />
      ))}
    </div>
  );
});

/**
 * Quick Actions Skeleton
 */
export const QuickActionsSkeleton = memo(function QuickActionsSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader>
              <Skeleton className="w-10 h-10 rounded-lg mb-2" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
});

/**
 * Widget Grid Skeleton
 */
export const WidgetGridSkeleton = memo(function WidgetGridSkeleton({ 
  count = 6,
  className 
}: { 
  count?: number;
  className?: string 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
              <Skeleton className="h-16 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

/**
 * Recent Analysis List Skeleton
 */
export const RecentAnalysisListSkeleton = memo(function RecentAnalysisListSkeleton({ 
  count = 5,
  className 
}: { 
  count?: number;
  className?: string 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

/**
 * Full Dashboard Page Skeleton
 */
export const DashboardPageSkeleton = memo(function DashboardPageSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("space-y-8 animate-pulse", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Stats Grid */}
      <DashboardStatsGridSkeleton />

      {/* Quick Actions */}
      <QuickActionsSkeleton />

      {/* Widget Grid */}
      <WidgetGridSkeleton />

      {/* Recent Analysis */}
      <RecentAnalysisListSkeleton />
    </div>
  );
});

/**
 * SPC Analysis Form Skeleton
 */
export const SpcAnalysisFormSkeleton = memo(function SpcAnalysisFormSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <Card className={cn("bg-card rounded-xl border border-border/50 shadow-md", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 flex-1 rounded-md" />
          ))}
        </div>

        {/* Form Fields */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* Advanced Options */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
          <Skeleton className="h-4 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * SPC Results Skeleton
 */
export const SpcResultsSkeleton = memo(function SpcResultsSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              {i === 1 && <Skeleton className="h-3 w-16 mt-1" />}
              {i === 3 && <Skeleton className="h-3 w-12 mt-1" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Control Limits Card */}
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-64 relative">
                {/* Y-axis */}
                <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-8" />
                  ))}
                </div>
                {/* Chart area */}
                <div className="absolute left-14 right-0 top-0 bottom-8">
                  <Skeleton className="w-full h-full rounded-lg opacity-30" />
                </div>
                {/* X-axis */}
                <div className="absolute left-14 right-0 bottom-0 h-6 flex justify-between">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-8" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

/**
 * Full SPC Analysis Page Skeleton
 */
export const SpcAnalysisPageSkeleton = memo(function SpcAnalysisPageSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Form */}
      <SpcAnalysisFormSkeleton />

      {/* Results */}
      <SpcResultsSkeleton />
    </div>
  );
});

/**
 * Realtime Card Skeleton
 */
export const RealtimeCardSkeleton = memo(function RealtimeCardSkeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPK Value */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-20" />
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
        
        {/* Mini Chart */}
        <Skeleton className="h-16 w-full rounded" />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center p-2 bg-muted/30 rounded">
              <Skeleton className="h-4 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Realtime Dashboard Skeleton
 */
export const RealtimeDashboardSkeleton = memo(function RealtimeDashboardSkeleton({ 
  count = 6,
  className 
}: { 
  count?: number;
  className?: string 
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RealtimeCardSkeleton key={i} />
      ))}
    </div>
  );
});

export default {
  DashboardStatsCardSkeleton,
  DashboardStatsGridSkeleton,
  QuickActionsSkeleton,
  WidgetGridSkeleton,
  RecentAnalysisListSkeleton,
  DashboardPageSkeleton,
  SpcAnalysisFormSkeleton,
  SpcResultsSkeleton,
  SpcAnalysisPageSkeleton,
  RealtimeCardSkeleton,
  RealtimeDashboardSkeleton
};
