/**
 * Sampling utilities for flexible time-based sampling
 */

export type TimeUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second";

export interface SamplingConfig {
  timeUnit: TimeUnit;
  sampleSize: number; // Number of samples per subgroup
  subgroupSize: number; // Number of measurements per subgroup
  intervalValue: number; // Interval value
  intervalUnit: TimeUnit; // Interval unit
}

/**
 * Calculate the start date based on time unit
 */
export function getStartDateByTimeUnit(timeUnit: TimeUnit, value: number = 1): Date {
  const now = new Date();
  const start = new Date(now);

  switch (timeUnit) {
    case "year":
      start.setFullYear(start.getFullYear() - value);
      break;
    case "month":
      start.setMonth(start.getMonth() - value);
      break;
    case "week":
      start.setDate(start.getDate() - value * 7);
      break;
    case "day":
      start.setDate(start.getDate() - value);
      break;
    case "hour":
      start.setHours(start.getHours() - value);
      break;
    case "minute":
      start.setMinutes(start.getMinutes() - value);
      break;
    case "second":
      start.setSeconds(start.getSeconds() - value);
      break;
  }

  return start;
}

/**
 * Get the next sample time based on interval
 */
export function getNextSampleTime(currentTime: Date, intervalValue: number, intervalUnit: TimeUnit): Date {
  const nextTime = new Date(currentTime);

  switch (intervalUnit) {
    case "year":
      nextTime.setFullYear(nextTime.getFullYear() + intervalValue);
      break;
    case "month":
      nextTime.setMonth(nextTime.getMonth() + intervalValue);
      break;
    case "week":
      nextTime.setDate(nextTime.getDate() + intervalValue * 7);
      break;
    case "day":
      nextTime.setDate(nextTime.getDate() + intervalValue);
      break;
    case "hour":
      nextTime.setHours(nextTime.getHours() + intervalValue);
      break;
    case "minute":
      nextTime.setMinutes(nextTime.getMinutes() + intervalValue);
      break;
    case "second":
      nextTime.setSeconds(nextTime.getSeconds() + intervalValue);
      break;
  }

  return nextTime;
}

/**
 * Generate sampling schedule for a given time range
 */
export function generateSamplingSchedule(
  startDate: Date,
  endDate: Date,
  intervalValue: number,
  intervalUnit: TimeUnit
): Date[] {
  const schedule: Date[] = [];
  let currentTime = new Date(startDate);

  while (currentTime <= endDate) {
    schedule.push(new Date(currentTime));
    currentTime = getNextSampleTime(currentTime, intervalValue, intervalUnit);
  }

  return schedule;
}

/**
 * Filter data points based on sampling schedule
 */
export function filterDataBySamplingSchedule(
  data: { value: number; timestamp: Date }[],
  samplingSchedule: Date[],
  toleranceMs: number = 60000 // 1 minute tolerance
): { value: number; timestamp: Date }[] {
  const filtered: { value: number; timestamp: Date }[] = [];

  for (const scheduleTime of samplingSchedule) {
    // Find data point closest to scheduled time within tolerance
    let closestPoint: { value: number; timestamp: Date } | null = null;
    let minDiff = toleranceMs;

    for (const dataPoint of data) {
      const diff = Math.abs(dataPoint.timestamp.getTime() - scheduleTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = dataPoint;
      }
    }

    if (closestPoint) {
      filtered.push(closestPoint);
    }
  }

  return filtered;
}

/**
 * Group data into subgroups for X-bar and R chart calculation
 */
export function groupDataIntoSubgroups(
  data: { value: number; timestamp: Date }[],
  subgroupSize: number
): { values: number[]; timestamp: Date }[] {
  const subgroups: { values: number[]; timestamp: Date }[] = [];

  for (let i = 0; i < data.length; i += subgroupSize) {
    const subgroup = data.slice(i, Math.min(i + subgroupSize, data.length));
    if (subgroup.length > 0) {
      subgroups.push({
        values: subgroup.map(d => d.value),
        timestamp: subgroup[0].timestamp,
      });
    }
  }

  return subgroups;
}

/**
 * Calculate subgroup statistics
 */
export function calculateSubgroupStats(subgroups: { values: number[]; timestamp: Date }[]) {
  return subgroups.map(sg => {
    const values = sg.values;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const range = Math.max(...values) - Math.min(...values);
    return {
      mean,
      range,
      timestamp: sg.timestamp,
      values,
    };
  });
}

/**
 * Validate sampling configuration
 */
export function validateSamplingConfig(config: SamplingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.sampleSize < 1) {
    errors.push("Sample size must be at least 1");
  }

  if (config.subgroupSize < 1) {
    errors.push("Subgroup size must be at least 1");
  }

  if (config.intervalValue < 1) {
    errors.push("Interval value must be at least 1");
  }

  const validTimeUnits: TimeUnit[] = ["year", "month", "week", "day", "hour", "minute", "second"];
  if (!validTimeUnits.includes(config.timeUnit)) {
    errors.push(`Invalid time unit: ${config.timeUnit}`);
  }

  if (!validTimeUnits.includes(config.intervalUnit)) {
    errors.push(`Invalid interval unit: ${config.intervalUnit}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable sampling description
 */
export function getSamplingDescription(config: SamplingConfig): string {
  const timeUnitLabels: Record<TimeUnit, string> = {
    year: "năm",
    month: "tháng",
    week: "tuần",
    day: "ngày",
    hour: "giờ",
    minute: "phút",
    second: "giây",
  };

  const intervalUnitLabels: Record<TimeUnit, string> = {
    year: "năm",
    month: "tháng",
    week: "tuần",
    day: "ngày",
    hour: "giờ",
    minute: "phút",
    second: "giây",
  };

  return `Lấy ${config.sampleSize} mẫu, mỗi ${config.intervalValue} ${intervalUnitLabels[config.intervalUnit]}, ` +
         `${config.subgroupSize} đo lường mỗi nhóm con`;
}

/**
 * Calculate time range for sampling based on time unit
 */
export function calculateTimeRangeForUnit(timeUnit: TimeUnit, numberOfUnits: number = 1): { start: Date; end: Date } {
  const end = new Date();
  const start = getStartDateByTimeUnit(timeUnit, numberOfUnits);

  return { start, end };
}

/**
 * Get the appropriate interval for sampling based on time range
 */
export function suggestSamplingInterval(
  startDate: Date,
  endDate: Date,
  desiredSampleCount: number = 20
): { intervalValue: number; intervalUnit: TimeUnit } {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = diffMs / (1000 * 60);

  // Calculate interval to get approximately desiredSampleCount samples
  if (diffDays > 365 * desiredSampleCount) {
    return { intervalValue: Math.ceil(diffDays / desiredSampleCount / 365), intervalUnit: "year" };
  } else if (diffDays > 30 * desiredSampleCount) {
    return { intervalValue: Math.ceil(diffDays / desiredSampleCount / 30), intervalUnit: "month" };
  } else if (diffDays > 7 * desiredSampleCount) {
    return { intervalValue: Math.ceil(diffDays / desiredSampleCount / 7), intervalUnit: "week" };
  } else if (diffDays > desiredSampleCount) {
    return { intervalValue: Math.ceil(diffDays / desiredSampleCount), intervalUnit: "day" };
  } else if (diffHours > desiredSampleCount) {
    return { intervalValue: Math.ceil(diffHours / desiredSampleCount), intervalUnit: "hour" };
  } else if (diffMinutes > desiredSampleCount) {
    return { intervalValue: Math.ceil(diffMinutes / desiredSampleCount), intervalUnit: "minute" };
  } else {
    return { intervalValue: Math.ceil(diffMs / desiredSampleCount / 1000), intervalUnit: "second" };
  }
}
