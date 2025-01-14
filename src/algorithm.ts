export interface TimeRange {
  /** Time of day in minutes from midnight */
  startMinutes: number
  /** Time of day in minutes from midnight */
  endMinutes: number
}

export interface Slot {
  id: string
  name: string
  /** Periods of time within a week that Tasks can be scheduled into */
  durations: {
    /** 0-6, where 0 is Sunday */
    dayOfWeek: number
    timeRange: TimeRange
  }[]
}

export enum TaskStatus {
  /** Task has not been started */
  NOT_STARTED = 'NOT_STARTED',
  /** Task is in progress */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Task has been completed */
  COMPLETED = 'COMPLETED',
}

export interface Task {
  id: string
  name: string
  /** Duration in minutes */
  duration: number
  /** The ID of the Slot this Task must be scheduled within */
  slotId: string
  /** The current status of this Task */
  status: TaskStatus
  /** When this Task was completed, if it has been */
  completedAt?: Date
  scheduledStartDate?: Date
  scheduledEndDate?: Date
}

export interface ScheduleOptions {
  startDate: Date
  endDate: Date
}

export function schedule(
  tasks: Task[],
  slots: Slot[],
  options: ScheduleOptions,
): Task[] {
  return tasks
}
