import { schedule } from './algorithm'
import type { Task, Slot } from './algorithm'
import { TaskStatus } from './algorithm'
import { describe, expect, it } from 'bun:test'

describe('schedule', () => {
  const mondayNineAM = {
    dayOfWeek: 1,
    timeRange: {
      startMinutes: 9 * 60, // 9:00 AM
      endMinutes: 17 * 60, // 5:00 PM
    },
  }

  const tuesdayNineAM = {
    dayOfWeek: 2,
    timeRange: {
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
    },
  }

  const defaultSlot: Slot = {
    id: 'workday',
    name: 'Regular Workday',
    durations: [mondayNineAM, tuesdayNineAM],
  }

  it('should schedule a single task into the first available slot', () => {
    const startDate = new Date('2024-03-25') // A Monday
    const endDate = new Date('2024-03-29') // That Friday

    const task: Task = {
      id: '1',
      name: 'Simple task',
      duration: 60, // 1 hour
      slotId: 'workday',
      status: TaskStatus.NOT_STARTED,
    }

    const result = schedule([task], [defaultSlot], { startDate, endDate })

    expect(result).toHaveLength(1)
    expect(result[0].scheduledStartDate).toEqual(
      new Date('2024-03-25T09:00:00'),
    )
    expect(result[0].scheduledEndDate).toEqual(new Date('2024-03-25T10:00:00'))
  })

  it('should schedule multiple tasks sequentially in available slots', () => {
    const startDate = new Date('2024-03-25')
    const endDate = new Date('2024-03-29')

    const tasks: Task[] = [
      {
        id: '1',
        name: 'First task',
        duration: 120, // 2 hours
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
      {
        id: '2',
        name: 'Second task',
        duration: 60, // 1 hour
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
    ]

    const result = schedule(tasks, [defaultSlot], { startDate, endDate })

    expect(result).toHaveLength(2)
    // First task starts at 9 AM Monday
    expect(result[0].scheduledStartDate).toEqual(
      new Date('2024-03-25T09:00:00'),
    )
    expect(result[0].scheduledEndDate).toEqual(new Date('2024-03-25T11:00:00'))
    // Second task starts right after at 11 AM
    expect(result[1].scheduledStartDate).toEqual(
      new Date('2024-03-25T11:00:00'),
    )
    expect(result[1].scheduledEndDate).toEqual(new Date('2024-03-25T12:00:00'))
  })

  it('should not schedule completed tasks', () => {
    const startDate = new Date('2024-03-25')
    const endDate = new Date('2024-03-29')

    const tasks: Task[] = [
      {
        id: '1',
        name: 'Completed task',
        duration: 60,
        slotId: 'workday',
        status: TaskStatus.COMPLETED,
        completedAt: new Date('2024-03-24'),
      },
      {
        id: '2',
        name: 'Pending task',
        duration: 60,
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
    ]

    const result = schedule(tasks, [defaultSlot], { startDate, endDate })

    expect(result).toHaveLength(2)
    // Completed task should be returned unchanged
    expect(result[0].scheduledStartDate).toBeUndefined()
    expect(result[0].scheduledEndDate).toBeUndefined()
    // Pending task should be scheduled
    expect(result[1].scheduledStartDate).toEqual(
      new Date('2024-03-25T09:00:00'),
    )
    expect(result[1].scheduledEndDate).toEqual(new Date('2024-03-25T10:00:00'))
  })

  it('should schedule tasks across multiple days if needed', () => {
    const startDate = new Date('2024-03-25')
    const endDate = new Date('2024-03-29')

    const tasks: Task[] = [
      {
        id: '1',
        name: 'Long task',
        duration: 480, // 8 hours (full day)
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
      {
        id: '2',
        name: 'Next day task',
        duration: 60,
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
    ]

    const result = schedule(tasks, [defaultSlot], { startDate, endDate })

    expect(result).toHaveLength(2)
    // First task takes all of Monday
    expect(result[0].scheduledStartDate).toEqual(
      new Date('2024-03-25T09:00:00'),
    )
    expect(result[0].scheduledEndDate).toEqual(new Date('2024-03-25T17:00:00'))
    // Second task starts Tuesday morning
    expect(result[1].scheduledStartDate).toEqual(
      new Date('2024-03-26T09:00:00'),
    )
    expect(result[1].scheduledEndDate).toEqual(new Date('2024-03-26T10:00:00'))
  })

  it('should leave tasks unscheduled if they do not fit in the available time', () => {
    const startDate = new Date('2024-03-25')
    const endDate = new Date('2024-03-29')

    const tasks: Task[] = [
      {
        id: '1',
        name: 'Too long task',
        duration: 600, // 10 hours (longer than slot duration)
        slotId: 'workday',
        status: TaskStatus.NOT_STARTED,
      },
    ]

    const result = schedule(tasks, [defaultSlot], { startDate, endDate })

    expect(result).toHaveLength(1)
    // Task should be returned but without scheduled dates
    expect(result[0].scheduledStartDate).toBeUndefined()
    expect(result[0].scheduledEndDate).toBeUndefined()
  })
})
