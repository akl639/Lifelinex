import { api, mockDelay, USE_MOCKS } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { COORDINATOR_STATS } from '@/lib/mock/data'
import type { CoordinatorStats } from '@/lib/types'

export const coordinatorService = {
  async stats(): Promise<CoordinatorStats> {
    if (USE_MOCKS) return mockDelay(COORDINATOR_STATS, 300)
    return api.get<CoordinatorStats>(endpoints.coordinator.stats)
  },
}
