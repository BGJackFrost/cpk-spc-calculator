/**
 * Escalation Scheduler
 * Chạy định kỳ để kiểm tra và escalate các alerts chưa được xử lý
 */

import { processEscalations, getEscalationConfig } from './alertEscalationService';

let escalationInterval: NodeJS.Timeout | null = null;
const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Start the escalation scheduler
 */
export function startEscalationScheduler(intervalMs: number = DEFAULT_CHECK_INTERVAL): void {
  if (escalationInterval) {
    console.log('[EscalationScheduler] Already running, stopping first...');
    stopEscalationScheduler();
  }

  console.log(`[EscalationScheduler] Starting with interval ${intervalMs / 1000}s`);

  // Run immediately on start
  runEscalationCheck();

  // Then run at intervals
  escalationInterval = setInterval(runEscalationCheck, intervalMs);
}

/**
 * Stop the escalation scheduler
 */
export function stopEscalationScheduler(): void {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    console.log('[EscalationScheduler] Stopped');
  }
}

/**
 * Run a single escalation check
 */
async function runEscalationCheck(): Promise<void> {
  try {
    const config = await getEscalationConfig();
    
    if (!config.enabled) {
      console.log('[EscalationScheduler] Escalation is disabled, skipping check');
      return;
    }

    console.log('[EscalationScheduler] Running escalation check...');
    const result = await processEscalations();
    
    if (result.escalated > 0) {
      console.log(`[EscalationScheduler] Escalated ${result.escalated} alerts`);
    }
  } catch (error) {
    console.error('[EscalationScheduler] Error during escalation check:', error);
  }
}

/**
 * Check if scheduler is running
 */
export function isEscalationSchedulerRunning(): boolean {
  return escalationInterval !== null;
}

/**
 * Get scheduler status
 */
export function getEscalationSchedulerStatus(): {
  running: boolean;
  intervalMs: number;
} {
  return {
    running: escalationInterval !== null,
    intervalMs: DEFAULT_CHECK_INTERVAL,
  };
}
