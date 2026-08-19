import { api, mockDelay, setToken } from "@/lib/api/client"
import type {
  AuthSession,
  BloodGroup,
  DonorType,
  User,
} from "@/lib/types"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  donorType: DonorType
  name: string
  email: string
  phone: string
  address: string
  password: string
  role?: "donor"
  bloodGroup: BloodGroup
  department?: string
  year?: string
  graduationYear?: string
  relativeName?: string
  relationship?: string
  studentName?: string
  studentId?: string
  studentDepartment?: string
  locationOptIn: boolean
  alertOptIn: boolean
}

const CURRENT_USER_KEY = "lifelinex.currentUser"

function saveCurrentUser(user: User) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(user),
  )
}

function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  try {
    const stored = window.localStorage.getItem(CURRENT_USER_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export const authService = {
  /*
   * LOGIN
   */
  async login(payload: LoginPayload): Promise<AuthSession> {
    const email = payload.email.trim().toLowerCase()
    const password = payload.password

    if (!email) {
      throw new Error("Please enter your Gmail.")
    }

    if (!password) {
      throw new Error("Please enter your password.")
    }

    try {
      const session = await api.post<AuthSession>("/api/auth/login", {
        email,
        password,
      })

      if (!session || !session.token || !session.user) {
        throw new Error("Invalid response received from server.")
      }

      setToken(session.token)
      saveCurrentUser(session.user)

      return session
    } catch (error: any) {
      throw new Error(
        error?.message || "No LifelineX account is registered with this Gmail.",
      )
    }
  },

  /*
   * REGISTER (Donor Only)
   */
  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (payload.role && payload.role !== "donor") {
      throw new Error("Only donor registration is available.")
    }

    const email = payload.email.trim().toLowerCase()

    if (!email) {
      throw new Error("Please enter your Gmail.")
    }

    if (!email.endsWith("@gmail.com")) {
      throw new Error("Please use a valid Gmail address.")
    }

    if (!payload.password || payload.password.length < 8) {
      throw new Error("Password must contain at least 8 characters.")
    }

    if (!payload.address?.trim()) {
      throw new Error("Please enter your complete address.")
    }

    try {
      const session = await api.post<AuthSession>("/api/auth/register", {
        ...payload,
        name: payload.name.trim(),
        email,
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        password: payload.password,
        role: "donor",
      })

      if (!session || !session.token || !session.user) {
        throw new Error("Invalid response received from server.")
      }

      setToken(session.token)
      saveCurrentUser(session.user)

      return session
    } catch (error: any) {
      throw new Error(
        error?.message || "Registration failed. Please try again.",
      )
    }
  },

  /*
   * CURRENT USER
   */
  async me(): Promise<User> {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      throw new Error("Not authenticated.")
    }

    return mockDelay(currentUser, 100)
  },

  /*
   * LOGOUT
   */
  logout() {
    setToken(null)

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CURRENT_USER_KEY)
    }
  },
}