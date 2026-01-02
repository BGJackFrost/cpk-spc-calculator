import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSwipeableTabs } from '@/hooks/useSwipeGesture';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Circle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface SwipeableDashboardProps {
  sections: DashboardSection[];
  defaultSection?: string;
  onSectionChange?: (sectionId: string) => void;
  className?: string;
  showNavigation?: boolean;
  showIndicators?: boolean;
  fullScreenMode?: boolean;
}

export function SwipeableDashboard({
  sections,
  defaultSection,
  onSectionChange,
  className,
  showNavigation = true,
  showIndicators = true,
  fullScreenMode = false
}: SwipeableDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(fullScreenMode);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sectionIds = sections.map(s => s.id);
  const initialSection = defaultSection || sectionIds[0];

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
  } = useSwipeableTabs(sectionIds, initialSection, {
    threshold: 50,
    trackMouse: true,
    onSwipeEnd: (direction) => {
      // Haptic feedback on mobile (if supported)
      if (navigator.vibrate && direction) {
        navigator.vibrate(10);
      }
    }
  });

  // Notify parent of section change
  useEffect(() => {
    onSectionChange?.(activeTab);
  }, [activeTab, onSectionChange]);

  // Bind swipe to container
  useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  const currentSection = sections.find(s => s.id === activeTab);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrev) {
        goToPrev();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoNext, canGoPrev, goToNext, goToPrev]);

  return (
    <div className={cn(
      'relative',
      isFullScreen && 'fixed inset-0 z-50 bg-background',
      className
    )}>
      {/* Header with navigation */}
      {showNavigation && (
        <div className="flex items-center justify-between mb-4 px-2">
          {/* Section tabs - scrollable on mobile */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    section.id === activeTab
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  )}
                >
                  {section.icon}
                  <span className="hidden sm:inline">{section.title}</span>
                  {section.badge !== undefined && (
                    <Badge variant={section.badgeVariant || 'secondary'} className="ml-1 text-xs">
                      {section.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Full screen toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 shrink-0"
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Swipe hint for mobile */}
      {isMobile && (
        <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
          <ChevronLeft className="h-3 w-3 animate-pulse" />
          <span>Vuốt để chuyển đổi</span>
          <ChevronRight className="h-3 w-3 animate-pulse" />
        </div>
      )}

      {/* Main content with swipe */}
      <div
        ref={containerRef}
        className={cn(
          'overflow-hidden touch-pan-y',
          isFullScreen && 'flex-1'
        )}
        style={{ cursor: isSwiping ? 'grabbing' : isMobile ? 'default' : 'grab' }}
      >
        <div
          className="transition-transform duration-300 ease-out"
          style={{
            transform: isSwiping ? `translateX(${swipeOffset * 0.5}px)` : 'translateX(0)',
            opacity: isSwiping ? 0.9 : 1
          }}
        >
          {currentSection && (
            <Card className={cn(
              'border-2 transition-shadow',
              isSwiping && 'shadow-lg'
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentSection.icon && (
                      <div className="p-2 rounded-lg bg-primary/10">
                        {currentSection.icon}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{currentSection.title}</CardTitle>
                      {currentSection.description && (
                        <CardDescription>{currentSection.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  {/* Desktop navigation arrows */}
                  {!isMobile && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToPrev}
                        disabled={!canGoPrev}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        {currentIndex + 1} / {sections.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToNext}
                        disabled={!canGoNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className={cn(
                isFullScreen && 'h-[calc(100vh-200px)] overflow-auto'
              )}>
                {currentSection.content}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Indicators */}
      {showIndicators && sections.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={cn(
                'transition-all duration-200 rounded-full',
                index === currentIndex
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to ${section.title}`}
            />
          ))}
        </div>
      )}

      {/* Mobile swipe progress indicator */}
      {isMobile && isSwiping && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-background/90 rounded-full shadow-lg border">
          <div className="flex items-center gap-2">
            {swipeOffset > 30 && canGoPrev && (
              <>
                <ChevronLeft className="h-4 w-4 text-primary" />
                <span className="text-sm">{sections[currentIndex - 1]?.title}</span>
              </>
            )}
            {swipeOffset < -30 && canGoNext && (
              <>
                <span className="text-sm">{sections[currentIndex + 1]?.title}</span>
                <ChevronRight className="h-4 w-4 text-primary" />
              </>
            )}
            {Math.abs(swipeOffset) <= 30 && (
              <span className="text-sm text-muted-foreground">Tiếp tục vuốt...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified version for production line switching
interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'warning';
  cpk?: number;
  oee?: number;
}

interface SwipeableProductionLinesProps {
  lines: ProductionLine[];
  selectedLine: string;
  onSelectLine: (lineId: string) => void;
  renderLineContent: (line: ProductionLine) => React.ReactNode;
  className?: string;
}

export function SwipeableProductionLines({
  lines,
  selectedLine,
  onSelectLine,
  renderLineContent,
  className
}: SwipeableProductionLinesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineIds = lines.map(l => l.id);

  const {
    bind,
    activeTab,
    setActiveTab,
    currentIndex,
    isSwiping,
    swipeOffset
  } = useSwipeableTabs(lineIds, selectedLine, {
    threshold: 40,
    trackMouse: true
  });

  useEffect(() => {
    if (activeTab !== selectedLine) {
      onSelectLine(activeTab);
    }
  }, [activeTab, selectedLine, onSelectLine]);

  useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  const currentLine = lines.find(l => l.id === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Line selector - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {lines.map((line) => (
          <button
            key={line.id}
            onClick={() => setActiveTab(line.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap transition-all shrink-0',
              line.id === activeTab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', getStatusColor(line.status))} />
            <span className="text-sm font-medium">{line.name}</span>
            {line.cpk !== undefined && (
              <Badge variant={line.cpk >= 1.33 ? 'default' : 'destructive'} className="text-xs">
                CPK: {line.cpk.toFixed(2)}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content with swipe */}
      <div
        ref={containerRef}
        className="touch-pan-y"
        style={{ cursor: isSwiping ? 'grabbing' : 'default' }}
      >
        <div
          className="transition-transform duration-200"
          style={{
            transform: isSwiping ? `translateX(${swipeOffset * 0.3}px)` : 'translateX(0)'
          }}
        >
          {currentLine && renderLineContent(currentLine)}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-1.5">
        {lines.map((line, index) => (
          <button
            key={line.id}
            onClick={() => setActiveTab(line.id)}
            className={cn(
              'transition-all duration-200 rounded-full',
              index === currentIndex
                ? 'w-4 h-1.5 bg-primary'
                : 'w-1.5 h-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Mobile hint */}
      <p className="text-center text-xs text-muted-foreground md:hidden">
        ← Vuốt để chuyển dây chuyền →
      </p>
    </div>
  );
}
