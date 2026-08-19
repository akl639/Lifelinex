import { api, mockDelay, USE_MOCKS } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { CURRENT_DONOR, DONATION_HISTORY, DONORS } from '@/lib/mock/data'
import type {
  BloodGroup,
  DonorProfile,
  DonorStatus,
  MatchRadius,
} from '@/lib/types'

export interface DonorQuery {
  bloodGroup?: BloodGroup
  status?: DonorStatus
  /** Only donors inside this ring. 'campus' means no distance cap. */
  radius?: MatchRadius
  search?: string
}

/** Blood groups a recipient of `group` can safely receive from. */
export const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
}

export function radiusToMeters(radius: MatchRadius) {
  return radius === 'campus' ? Number.POSITIVE_INFINITY : radius
}

export const donorService = {
  async list(query: DonorQuery = {}): Promise<DonorProfile[]> {
    if (USE_MOCKS) {
      const limit = query.radius ? radiusToMeters(query.radius) : Infinity
      const term = query.search?.trim().toLowerCase()

      const filtered = DONORS.filter((donor) => {
        if (query.bloodGroup && donor.bloodGroup !== query.bloodGroup) return false
        if (query.status && donor.status !== query.status) return false
        if ((donor.distanceMeters ?? 0) > limit) return false
        if (
          term &&
          !`${donor.name} ${donor.userId} ${donor.department}`
            .toLowerCase()
            .includes(term)
        ) {
          return false
        }
        return true
      }).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))

      return mockDelay(filtered, 350)
    }

    return api.get<DonorProfile[]>(endpoints.donors.list, {
      query: {
        bloodGroup: query.bloodGroup,
        status: query.status,
        radius: query.radius === undefined ? undefined : String(query.radius),
        search: query.search,
      },
    })
  },

  /** Compatible donors for a recipient group, ordered by distance. */
  async matchesFor(
    bloodGroup: BloodGroup,
    radius: MatchRadius,
  ): Promise<DonorProfile[]> {
    if (USE_MOCKS) {
      const compatible = COMPATIBLE_DONORS[bloodGroup]
      const limit = radiusToMeters(radius)
      const matched = DONORS.filter(
        (donor) =>
          compatible.includes(donor.bloodGroup) &&
          donor.status !== 'cooldown' &&
          donor.status !== 'unavailable' &&
          (donor.distanceMeters ?? 0) <= limit,
      ).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      return mockDelay(matched, 400)
    }

    return api.get<DonorProfile[]>(endpoints.donors.list, {
      query: { compatibleWith: bloodGroup, radius: String(radius) },
    })
  },

  async get(userId: string): Promise<DonorProfile> {
    if (USE_MOCKS) {
      const donor = DONORS.find((d) => d.userId === userId) ?? CURRENT_DONOR
      return mockDelay(donor, 250)
    }
    return api.get<DonorProfile>(endpoints.donors.detail(userId))
  },

  async updateProfile(
    userId: string,
    patch: Partial<DonorProfile>,
  ): Promise<DonorProfile> {
    if (USE_MOCKS) return mockDelay({ ...CURRENT_DONOR, ...patch }, 400)
    return api.patch<DonorProfile>(endpoints.donors.detail(userId), patch)
  },

  async setAvailability(userId: string, status: DonorStatus): Promise<DonorProfile> {
    if (USE_MOCKS) return mockDelay({ ...CURRENT_DONOR, status }, 300)
    return api.patch<DonorProfile>(endpoints.donors.availability(userId), { status })
  },

  async donationHistory(userId: string) {
    if (USE_MOCKS) return mockDelay(DONATION_HISTORY, 300)
    return api.get<typeof DONATION_HISTORY>(
      `${endpoints.donors.detail(userId)}/donations`,
    )
  },
}
