import { api, mockDelay, USE_MOCKS } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import {
  MATCH_RINGS,
  REQUESTS,
  RESPONSES,
  TRACKING_EVENTS,
} from '@/lib/mock/data'
import type {
  BloodGroup,
  DonorResponse,
  EmergencyRequest,
  MatchRadius,
  MatchRing,
  RequestStatus,
  ResponseStatus,
  TrackingEvent,
  Urgency,
} from '@/lib/types'

export const RADIUS_SEQUENCE: MatchRadius[] = [500, 1000, 3000, 'campus']

export function radiusLabel(radius: MatchRadius) {
  if (radius === 'campus') return 'Campus-wide'
  return radius >= 1000 ? `${radius / 1000} km` : `${radius} m`
}

export function nextRadius(radius: MatchRadius): MatchRadius | null {
  const index = RADIUS_SEQUENCE.indexOf(radius)
  if (index === -1 || index === RADIUS_SEQUENCE.length - 1) return null
  return RADIUS_SEQUENCE[index + 1]
}

export interface CreateRequestPayload {
  patientName: string
  bloodGroup: BloodGroup
  unitsNeeded: number
  urgency: Urgency
  hospital: string
  ward: string
  locationLabel: string
  neededBy: string
  contactPhone: string
  notes?: string
}

export const requestService = {
  async list(status?: RequestStatus): Promise<EmergencyRequest[]> {
    if (USE_MOCKS) {
      const rows = status ? REQUESTS.filter((r) => r.status === status) : REQUESTS
      return mockDelay(rows, 350)
    }
    return api.get<EmergencyRequest[]>(endpoints.requests.list, {
      query: { status },
    })
  },

  async get(requestId: string): Promise<EmergencyRequest> {
    if (USE_MOCKS) {
      const found = REQUESTS.find((r) => r.requestId === requestId) ?? REQUESTS[0]
      return mockDelay(found, 300)
    }
    return api.get<EmergencyRequest>(endpoints.requests.detail(requestId))
  },

  async create(payload: CreateRequestPayload): Promise<EmergencyRequest> {
    if (USE_MOCKS) {
      const created: EmergencyRequest = {
        ...REQUESTS[0],
        _id: `mock-${Date.now()}`,
        requestId: `REQ-${2420 + Math.floor(Math.random() * 80)}`,
        patientName: payload.patientName,
        bloodGroup: payload.bloodGroup,
        unitsNeeded: payload.unitsNeeded,
        unitsSecured: 0,
        urgency: payload.urgency,
        status: 'searching',
        hospital: payload.hospital,
        ward: payload.ward,
        currentRadius: 500,
        notes: payload.notes,
        createdAt: new Date().toISOString(),
        neededBy: payload.neededBy,
      }
      return mockDelay(created, 700)
    }
    return api.post<EmergencyRequest>(endpoints.requests.create, payload)
  },

  async update(
    requestId: string,
    patch: Partial<EmergencyRequest>,
  ): Promise<EmergencyRequest> {
    if (USE_MOCKS) {
      const found = REQUESTS.find((r) => r.requestId === requestId) ?? REQUESTS[0]
      return mockDelay({ ...found, ...patch }, 350)
    }
    return api.patch<EmergencyRequest>(endpoints.requests.detail(requestId), patch)
  },

  async rings(requestId: string): Promise<MatchRing[]> {
    if (USE_MOCKS) return mockDelay(MATCH_RINGS, 350)
    return api.get<MatchRing[]>(endpoints.requests.matches(requestId))
  },

  /** Manually push the search to the next radius ring. */
  async escalate(requestId: string, to: MatchRadius): Promise<MatchRing[]> {
    if (USE_MOCKS) {
      const rings = MATCH_RINGS.map((ring) => {
        if (ring.radius === to) {
          return {
            ...ring,
            status: 'active' as const,
            startedAt: new Date().toISOString(),
          }
        }
        const isEarlier =
          RADIUS_SEQUENCE.indexOf(ring.radius) < RADIUS_SEQUENCE.indexOf(to)
        return isEarlier ? { ...ring, status: 'completed' as const } : ring
      })
      return mockDelay(rings, 500)
    }
    return api.post<MatchRing[]>(endpoints.requests.escalate(requestId), { to })
  },

  async responses(requestId: string): Promise<DonorResponse[]> {
    if (USE_MOCKS) {
      return mockDelay(
        RESPONSES.filter((r) => r.requestId === requestId),
        350,
      )
    }
    return api.get<DonorResponse[]>(endpoints.requests.responses(requestId))
  },

  /** The "I CAN HELP" action. */
  async respond(
    requestId: string,
    donorId: string,
    status: ResponseStatus = 'accepted',
  ): Promise<DonorResponse> {
    if (USE_MOCKS) {
      return mockDelay(
        {
          _id: `mock-${Date.now()}`,
          requestId,
          donorId,
          donorName: 'You',
          bloodGroup: 'O-',
          status,
          distanceMeters: 640,
          etaMinutes: 8,
          radiusRing: 1000,
          respondedAt: new Date().toISOString(),
        } satisfies DonorResponse,
        600,
      )
    }
    return api.post<DonorResponse>(endpoints.requests.responses(requestId), {
      donorId,
      status,
    })
  },

  async events(requestId: string): Promise<TrackingEvent[]> {
    if (USE_MOCKS) {
      const rows = TRACKING_EVENTS.filter((e) => e.requestId === requestId)
      return mockDelay(rows.length ? rows : TRACKING_EVENTS, 350)
    }
    return api.get<TrackingEvent[]>(endpoints.requests.events(requestId))
  },
}
