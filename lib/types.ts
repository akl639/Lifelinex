/**
 * LifelineX shared domain types.
 */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export type UserRole = 'donor' | 'coordinator' | 'requester'

export type DonorType = 'student' | 'relative' | 'alumni'

export type DonorStatus = 'available' | 'unavailable' | 'cooldown' | 'responding'

export type Urgency = 'critical' | 'urgent' | 'standard' | 'Critical' | 'High' | 'Normal'

export type RequestStatus =
  | 'searching'
  | 'matched'
  | 'en-route'
  | 'fulfilled'
  | 'cancelled'
  | 'active'

export type MatchRadius = 500 | 1000 | 3000 | 'campus'

export type ResponseStatus =
  | 'notified'
  | 'accepted'
  | 'declined'
  | 'arrived'
  | 'donated'

export interface GeoPoint {
  /** GeoJSON order: [longitude, latitude] */
  coordinates: [number, number]
  type?: 'Point'
}

export interface CampusLocation {
  /** e.g. "Hostel Block C" */
  label: string
  /** e.g. "North Campus" */
  zone: string
  point: GeoPoint
}

export interface User {
  _id: string
  /** Public LifelineX ID, e.g. LFX-8241-A or LFX-PATIENT-1024 */
  userId: string
  name: string
  email: string
  phone: string
  address?: string
  role: UserRole
  donorType?: DonorType
  bloodGroup: BloodGroup
  department?: string
  year?: string
  graduationYear?: string
  relativeName?: string
  relationship?: string
  studentName?: string
  studentId?: string
  studentDepartment?: string
  avatarUrl?: string
  /** Verified by campus health center */
  verified: boolean
  createdAt: string
}

export interface DonorProfile extends User {
  role: 'donor'
  status: DonorStatus
  /** Donor opted in to share live location for matching */
  locationOptIn: boolean
  /** Donor opted in to receive emergency push/SMS alerts */
  alertOptIn: boolean
  location: CampusLocation
  lastDonationDate: string | null
  /** Days remaining before donor is eligible again */
  cooldownDaysLeft: number
  totalDonations: number
  livesImpacted: number
  responseRate: number
  /** Distance in metres from the active request, computed server-side */
  distanceMeters?: number
  etaMinutes?: number
  badges: string[]
}

export interface EmergencyRequest {
  _id?: string
  /** Public request ID, e.g. REQ-2419 */
  id?: string
  requestId: string
  emergencyId?: string
  requesterId?: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  requesterAddress?: string
  patientName: string
  bloodGroup: BloodGroup
  quantity?: number
  unitsNeeded: number
  unitsSecured: number
  urgency: Urgency
  status: RequestStatus
  hospital?: string
  ward?: string
  location?: CampusLocation
  /** Currently active search ring */
  currentRadius?: MatchRadius
  notes?: string
  latitude?: number
  longitude?: number
  requesterLatitude?: number
  requesterLongitude?: number
  requesterLocationUpdatedAt?: number
  acceptedBy?: string | null
  donorId?: string | null
  donorName?: string | null
  donorPhone?: string | null
  donorEmail?: string | null
  donorLatitude?: number | null
  donorLongitude?: number | null
  donorLocationUpdatedAt?: number
  connectionStatus?: 'none' | 'requested' | 'connected' | 'ended'
  contactRequested?: boolean
  contactRequestedAt?: number
  contactAccepted?: boolean
  contactAcceptedAt?: number
  connectionEndedBy?: string
  connectionEndedAt?: number
  raisedBy?: {
    userId: string
    name: string
    phone: string
    role: UserRole
  }
  createdAt: string | number
  neededBy?: string
}

export interface DonorResponse {
  _id: string
  requestId: string
  donorId: string
  donorName: string
  bloodGroup: BloodGroup
  status: ResponseStatus
  distanceMeters: number
  etaMinutes: number
  radiusRing: MatchRadius
  respondedAt: string | null
}

export interface MatchRing {
  radius: MatchRadius
  label: string
  /** Donors notified inside this ring */
  notified: number
  accepted: number
  status: 'pending' | 'active' | 'completed' | 'skipped'
  /** Seconds before escalating to the next ring */
  escalateAfterSeconds: number
  startedAt: string | null
}

export interface TrackingEvent {
  _id: string
  requestId: string
  at: string
  kind:
    | 'created'
    | 'ring-expanded'
    | 'donor-notified'
    | 'donor-accepted'
    | 'donor-arrived'
    | 'unit-collected'
    | 'fulfilled'
  title: string
  detail: string
  actor?: string
}

export interface CoordinatorStats {
  activeRequests: number
  availableDonors: number
  responsesToday: number
  unitsSecuredToday: number
  avgResponseMinutes: number
  fulfillmentRate: number
}

export interface AuthSession {
  token: string
  user: User
}

/** Standard envelope API responses. */
export interface ApiResult<T> {
  data: T
  message?: string
}
