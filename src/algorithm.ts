export interface TimeRange {
  /** Time of day in minutes from midnight */
  startMinutes: number
  /** Time of day in minutes from midnight */
  endMinutes: number
}

export interface Schedule {
  id: string
  name: string
  /** Periods of time within a week that Tasks can be scheduled into */
  slots: {
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

export enum TaskChunkStatus {
  /** Task chunk has not been started */
  NOT_STARTED = 'NOT_STARTED',
  /** Task chunk is in progress */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Task chunk has been completed */
  COMPLETED = 'COMPLETED',
}

export interface TaskChunk {
  /** The ID of the Task this chunk belongs to */
  taskId: string
  /** The start time of this chunk */
  start: Date
  /** The end time of this chunk */
  end: Date
  /** The duration of this chunk in minutes */
  duration: number
  /** The status of this chunk */
  status: TaskChunkStatus
}

export interface Task {
  id: string
  name: string
  /** Duration in minutes */
  duration: number
  /** The ID of the Schedule this Task must be scheduled within */
  scheduleId: string
  /** The current status of this Task */
  status: TaskStatus
  /** When this Task was completed, if it has been */
  completedAt?: Date
  /** When this Task was scheduled to start */
  scheduledStartDate?: Date
  /** When this Task was scheduled to end */
  scheduledEndDate?: Date
  /** The smallest unit of available time this Task can be scheduled in. */
  chunkSize?: number
  /** The chunks of this Task */
  chunks: TaskChunk[]
}

export interface ScheduleOptions {
  startDate: Date
  endDate: Date
}

function findSlotForTask(task: Task, slots: Schedule[]): Schedule | undefined {
  return slots.find((slot) => slot.id === task.scheduleId)
}

function getAvailableDurationsForDate(
  date: Date,
  slot: Schedule,
  lastEndTime?: Date,
): { dayOfWeek: number; timeRange: TimeRange }[] {
  const dayOfWeek = date.getDay()
  const lastEndMinutes =
    lastEndTime && isSameDay(date, lastEndTime)
      ? lastEndTime.getHours() * 60 + lastEndTime.getMinutes()
      : 0

  return slot.slots
    .filter((d) => d.dayOfWeek === dayOfWeek)
    .filter((d) => {
      // If this duration ends before the last task ended, skip it
      if (d.timeRange.endMinutes <= lastEndMinutes) {
        return false
      }
      // If this duration starts before the last task ended,
      // it needs to have enough time remaining
      if (d.timeRange.startMinutes < lastEndMinutes) {
        return d.timeRange.endMinutes - lastEndMinutes > 0
      }
      return true
    })
    .sort((a, b) => a.timeRange.startMinutes - b.timeRange.startMinutes)
}

function getNextAvailableTime(
  date: Date,
  slot: Schedule,
  taskDuration: number,
  lastEndTime?: Date,
): { start: Date; end: Date } | undefined {
  const currentDate = new Date(date)
  const endDate = new Date(date)
  endDate.setFullYear(endDate.getFullYear() + 1) // Look ahead up to a year

  // If we have a lastEndTime and it's after our start date,
  // start from there instead
  if (lastEndTime && lastEndTime > currentDate) {
    currentDate.setTime(lastEndTime.getTime())
  }

  while (currentDate <= endDate) {
    const durations = getAvailableDurationsForDate(
      currentDate,
      slot,
      lastEndTime,
    )

    // Try each duration for this day
    for (const duration of durations) {
      const start = new Date(currentDate)
      // If we're on the same day as the last task and this duration overlaps,
      // start from the end of the last task
      if (
        lastEndTime &&
        isSameDay(start, lastEndTime) &&
        duration.timeRange.startMinutes <
          lastEndTime.getHours() * 60 + lastEndTime.getMinutes()
      ) {
        start.setTime(lastEndTime.getTime())
      } else {
        start.setHours(
          Math.floor(duration.timeRange.startMinutes / 60),
          duration.timeRange.startMinutes % 60,
          0,
          0,
        )
      }

      const end = new Date(start)
      end.setMinutes(end.getMinutes() + taskDuration)

      const endMinutes = end.getHours() * 60 + end.getMinutes()

      // Check if the task fits within this duration
      if (endMinutes <= duration.timeRange.endMinutes) {
        return { start, end }
      }
    }

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1)
    currentDate.setHours(0, 0, 0, 0)
  }

  return undefined
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function canTaskFitInSlot(task: Task, slot: Schedule): boolean {
  return slot.slots.some(
    (d) => d.timeRange.endMinutes - d.timeRange.startMinutes >= task.duration,
  )
}

export function schedule(
  tasks: Task[],
  slots: Schedule[],
  options: ScheduleOptions,
): Task[] {
  const result = [...tasks]
  let lastEndTime: Date | undefined

  for (const task of result) {
    // Skip completed tasks
    if (task.status === TaskStatus.COMPLETED) {
      continue
    }

    const slot = findSlotForTask(task, slots)
    if (!slot) {
      continue
    }

    // If the task is too long to fit in any slot duration, skip it
    if (!canTaskFitInSlot(task, slot)) {
      continue
    }

    const nextTime = getNextAvailableTime(
      options.startDate,
      slot,
      task.duration,
      lastEndTime,
    )

    if (nextTime && nextTime.end <= options.endDate) {
      task.scheduledStartDate = nextTime.start
      task.scheduledEndDate = nextTime.end
      lastEndTime = nextTime.end
    }
  }

  return result
}
