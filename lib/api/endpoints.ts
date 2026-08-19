/**
 * Every backend route the frontend expects, in one map.
 * Build these in Express and the UI works unchanged.
 *
 *  POST   /auth/register              -> { token, user }
 *  POST   /auth/login                 -> { token, user }
 *  GET    /auth/me                    -> User
 *  GET    /donors                     -> DonorProfile[]        ?bloodGroup&status&radius
 *  GET    /donors/:userId             -> DonorProfile
 *  PATCH  /donors/:userId             -> DonorProfile          (profile + opt-ins)
 *  PATCH  /donors/:userId/availability-> DonorProfile          { status }
 *  GET    /requests                   -> EmergencyRequest[]    ?status
 *  POST   /requests                   -> EmergencyRequest
 *  GET    /requests/:requestId        -> EmergencyRequest
 *  PATCH  /requests/:requestId        -> EmergencyRequest      { status, unitsSecured }
 *  GET    /requests/:requestId/matches-> { rings, donors }
 *  POST   /requests/:requestId/escalate -> MatchRing[]
 *  GET    /requests/:requestId/responses -> DonorResponse[]
 *  POST   /requests/:requestId/responses -> DonorResponse      { donorId, status }
 *  GET    /requests/:requestId/events -> TrackingEvent[]
 *  GET    /coordinator/stats          -> CoordinatorStats
 */

export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',
  },
  donors: {
    list: '/donors',
    detail: (userId: string) => `/donors/${userId}`,
    availability: (userId: string) => `/donors/${userId}/availability`,
  },
  requests: {
    list: '/requests',
    create: '/requests',
    detail: (requestId: string) => `/requests/${requestId}`,
    matches: (requestId: string) => `/requests/${requestId}/matches`,
    escalate: (requestId: string) => `/requests/${requestId}/escalate`,
    responses: (requestId: string) => `/requests/${requestId}/responses`,
    events: (requestId: string) => `/requests/${requestId}/events`,
  },
  coordinator: {
    stats: '/coordinator/stats',
  },
} as const
