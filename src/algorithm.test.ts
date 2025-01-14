import { schedule } from './algorithm'
import { describe, expect, it } from 'bun:test'

describe('schedule', () => {
  it('should return true', () => {
    expect(schedule()).toBe(true)
  })
})
