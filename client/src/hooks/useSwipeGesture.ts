import { useEffect, useRef, useState, useCallback } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface UseSwipeGestureOptions {
  threshold?: number; // Minimum distance to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: (direction: SwipeState['direction']) => void;
  onSwiping?: (state: SwipeState) => void;
  preventScrollOnSwipe?: boolean;
  trackMouse?: boolean;
}

export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
    onSwiping,
    preventScrollOnSwipe = false,
    trackMouse = false
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
    direction: null
  });

  const startTimeRef = useRef<number>(0);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startTimeRef.current = Date.now();
    setSwipeState({
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
      isSwiping: true,
      direction: null
    });
    onSwipeStart?.();
  }, [onSwipeStart]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    setSwipeState(prev => {
      if (!prev.isSwiping) return prev;

      const deltaX = clientX - prev.startX;
      const deltaY = clientY - prev.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction: SwipeState['direction'] = null;
      if (absDeltaX > absDeltaY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (absDeltaY > absDeltaX) {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const newState = {
        ...prev,
        currentX: clientX,
        currentY: clientY,
        deltaX,
        deltaY,
        direction
      };

      onSwiping?.(newState);
      return newState;
    });
  }, [onSwiping]);

  const handleEnd = useCallback(() => {
    setSwipeState(prev => {
      if (!prev.isSwiping) return prev;

      const duration = Date.now() - startTimeRef.current;
      const velocityX = Math.abs(prev.deltaX) / duration;
      const velocityY = Math.abs(prev.deltaY) / duration;

      const absDeltaX = Math.abs(prev.deltaX);
      const absDeltaY = Math.abs(prev.deltaY);

      let finalDirection: SwipeState['direction'] = null;

      // Check horizontal swipe
      if (absDeltaX > absDeltaY && (absDeltaX > threshold || velocityX > velocityThreshold)) {
        if (prev.deltaX > 0) {
          finalDirection = 'right';
          onSwipeRight?.();
        } else {
          finalDirection = 'left';
          onSwipeLeft?.();
        }
      }
      // Check vertical swipe
      else if (absDeltaY > absDeltaX && (absDeltaY > threshold || velocityY > velocityThreshold)) {
        if (prev.deltaY > 0) {
          finalDirection = 'down';
          onSwipeDown?.();
        } else {
          finalDirection = 'up';
          onSwipeUp?.();
        }
      }

      onSwipeEnd?.(finalDirection);

      return {
        ...prev,
        isSwiping: false,
        direction: finalDirection
      };
    });
  }, [threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventScrollOnSwipe && swipeState.isSwiping) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove, preventScrollOnSwipe, swipeState.isSwiping]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!trackMouse) return;
    handleStart(e.clientX, e.clientY);
  }, [handleStart, trackMouse]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!trackMouse || !swipeState.isSwiping) return;
    handleMove(e.clientX, e.clientY);
  }, [handleMove, trackMouse, swipeState.isSwiping]);

  const handleMouseUp = useCallback(() => {
    if (!trackMouse) return;
    handleEnd();
  }, [handleEnd, trackMouse]);

  // Bind events to element
  const bind = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      // Remove old listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      if (trackMouse) {
        elementRef.current.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }

    elementRef.current = element;

    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: !preventScrollOnSwipe });
      element.addEventListener('touchend', handleTouchEnd);
      if (trackMouse) {
        element.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, trackMouse, preventScrollOnSwipe]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchmove', handleTouchMove);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
        if (trackMouse) {
          elementRef.current.removeEventListener('mousedown', handleMouseDown);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, trackMouse]);

  return {
    bind,
    swipeState,
    isSwiping: swipeState.isSwiping,
    direction: swipeState.direction,
    deltaX: swipeState.deltaX,
    deltaY: swipeState.deltaY
  };
}

// Hook for swipeable tabs/carousel
export function useSwipeableTabs<T extends string | number>(
  tabs: T[],
  initialTab: T,
  options?: Omit<UseSwipeGestureOptions, 'onSwipeLeft' | 'onSwipeRight'>
) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const currentIndex = tabs.indexOf(activeTab);

  const goToNext = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, tabs.length - 1);
    setActiveTab(tabs[nextIndex]);
  }, [currentIndex, tabs]);

  const goToPrev = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    setActiveTab(tabs[prevIndex]);
  }, [currentIndex, tabs]);

  const { bind, swipeState, isSwiping } = useSwipeGesture({
    ...options,
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    onSwiping: (state) => {
      // Calculate offset for smooth animation
      const maxOffset = 100;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, state.deltaX));
      setSwipeOffset(offset);
      options?.onSwiping?.(state);
    },
    onSwipeEnd: (direction) => {
      setSwipeOffset(0);
      options?.onSwipeEnd?.(direction);
    }
  });

  const goToTab = useCallback((tab: T) => {
    setActiveTab(tab);
  }, []);

  return {
    bind,
    activeTab,
    setActiveTab: goToTab,
    currentIndex,
    goToNext,
    goToPrev,
    canGoNext: currentIndex < tabs.length - 1,
    canGoPrev: currentIndex > 0,
    isSwiping,
    swipeOffset,
    swipeState
  };
}
