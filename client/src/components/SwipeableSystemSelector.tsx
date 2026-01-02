import React, { useRef, useEffect, useState } from 'react';
import { useSwipeableTabs } from '@/hooks/useSwipeGesture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface System {
  id: string;
  name: string;
  description?: string;
  status?: 'online' | 'offline' | 'warning';
  icon?: React.ReactNode;
  data?: Record<string, any>;
}

interface SwipeableSystemSelectorProps {
  systems: System[];
  selectedSystem: string;
  onSelectSystem: (systemId: string) => void;
  renderSystemContent?: (system: System) => React.ReactNode;
  className?: string;
  showIndicators?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function SwipeableSystemSelector({
  systems,
  selectedSystem,
  onSelectSystem,
  renderSystemContent,
  className,
  showIndicators = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000
}: SwipeableSystemSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const systemIds = systems.map(s => s.id);
  const {
    bind,
    activeTab,
    setActiveTab,
    currentIndex,
    goToNext,
    goToPrev,
    canGoNext,
    canGoPrev,
    isSwiping,
    swipeOffset
  } = useSwipeableTabs(systemIds, selectedSystem, {
    threshold: 50,
    trackMouse: true
  });

  // Sync with parent
  useEffect(() => {
    if (activeTab !== selectedSystem) {
      onSelectSystem(activeTab);
    }
  }, [activeTab, selectedSystem, onSelectSystem]);

  // Sync from parent
  useEffect(() => {
    if (selectedSystem !== activeTab) {
      setActiveTab(selectedSystem);
    }
  }, [selectedSystem, activeTab, setActiveTab]);

  // Bind swipe to container
  useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  // Auto play
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      if (canGoNext) {
        goToNext();
      } else {
        setActiveTab(systemIds[0]);
      }
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, canGoNext, goToNext, setActiveTab, systemIds]);

  const currentSystem = systems.find(s => s.id === activeTab);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Swipe hint for mobile */}
      {isMobile && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs opacity-70">
            <ChevronLeft className="h-3 w-3" />
            Vuốt
            <ChevronRight className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* Main content */}
      <div
        ref={containerRef}
        className="overflow-hidden touch-pan-y"
        style={{ cursor: isSwiping ? 'grabbing' : 'grab' }}
      >
        <div
          className="transition-transform duration-300 ease-out"
          style={{
            transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)'
          }}
        >
          {currentSystem && (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentSystem.icon}
                    <div>
                      <CardTitle className="text-lg">{currentSystem.name}</CardTitle>
                      {currentSystem.description && (
                        <p className="text-sm text-muted-foreground">{currentSystem.description}</p>
                      )}
                    </div>
                  </div>
                  {currentSystem.status && (
                    <Badge
                      variant="outline"
                      className={cn('gap-1', {
                        'border-green-500 text-green-500': currentSystem.status === 'online',
                        'border-red-500 text-red-500': currentSystem.status === 'offline',
                        'border-yellow-500 text-yellow-500': currentSystem.status === 'warning'
                      })}
                    >
                      <span className={cn('h-2 w-2 rounded-full', getStatusColor(currentSystem.status))} />
                      {currentSystem.status === 'online' ? 'Hoạt động' :
                       currentSystem.status === 'offline' ? 'Ngừng' : 'Cảnh báo'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renderSystemContent ? renderSystemContent(currentSystem) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chọn hệ thống để xem chi tiết
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {showArrows && !isMobile && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-lg"
            onClick={goToPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full shadow-lg"
            onClick={goToNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && systems.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {systems.map((system, index) => (
            <button
              key={system.id}
              onClick={() => setActiveTab(system.id)}
              className={cn(
                'transition-all duration-200',
                index === currentIndex
                  ? 'w-6 h-2 bg-primary rounded-full'
                  : 'w-2 h-2 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to ${system.name}`}
            />
          ))}
        </div>
      )}

      {/* System quick select (for desktop) */}
      {!isMobile && systems.length > 3 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {systems.map((system) => (
            <Button
              key={system.id}
              variant={system.id === activeTab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(system.id)}
              className="gap-2"
            >
              <span className={cn('h-2 w-2 rounded-full', getStatusColor(system.status))} />
              {system.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar/mobile
export function SwipeableSystemList({
  systems,
  selectedSystem,
  onSelectSystem,
  className
}: Omit<SwipeableSystemSelectorProps, 'renderSystemContent'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const systemIds = systems.map(s => s.id);
  
  const { bind, activeTab, setActiveTab, isSwiping, swipeOffset } = useSwipeableTabs(
    systemIds,
    selectedSystem,
    { threshold: 30, trackMouse: true }
  );

  useEffect(() => {
    if (activeTab !== selectedSystem) {
      onSelectSystem(activeTab);
    }
  }, [activeTab, selectedSystem, onSelectSystem]);

  useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide touch-pan-x pb-2"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {systems.map((system) => (
          <button
            key={system.id}
            onClick={() => setActiveTab(system.id)}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              'scroll-snap-align-start',
              system.id === activeTab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            <span className={cn('h-2 w-2 rounded-full', getStatusColor(system.status))} />
            <span className="text-sm font-medium whitespace-nowrap">{system.name}</span>
          </button>
        ))}
      </div>
      
      {/* Swipe indicator */}
      <div className="md:hidden text-center mt-2">
        <span className="text-xs text-muted-foreground">
          ← Vuốt để chọn hệ thống →
        </span>
      </div>
    </div>
  );
}
