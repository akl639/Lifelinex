import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import type { BloodGroup, User } from "@/lib/types"

export const runtime = "nodejs"

export type Emergency = {
  id: string
  emergencyId?: string
  requestId?: string

  requesterId: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  requesterAddress: string

  patientName: string
  bloodGroup: string
  quantity: number
  unitsNeeded: number
  unitsSecured: number
  urgency: string

  latitude: number
  longitude: number

  requesterLatitude?: number
  requesterLongitude?: number
  requesterLocationUpdatedAt?: number

  createdAt: number

  status: "active" | "fulfilled" | "searching" | "matched"

  acceptedBy?: string | null

  donorId?: string | null
  donorName?: string | null
  donorPhone?: string | null
  donorEmail?: string | null
  donorContactId?: string

  contactRequested?: boolean
  contactRequestedAt?: number
  contactAccepted?: boolean
  contactAcceptedAt?: number

  donorLatitude?: number
  donorLongitude?: number
  donorLocationUpdatedAt?: number

  connectionStatus?:
    | "none"
    | "requested"
    | "connected"
    | "ended"

  connectionEndedBy?: string
  connectionEndedAt?: number
}

type StoredAccount = {
  user: User
  password?: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const EMERGENCIES_FILE = path.join(DATA_DIR, "emergencies.json")
const USERS_FILE = path.join(DATA_DIR, "users.json")

async function readEmergencies(): Promise<Emergency[]> {
  try {
    const text = await fs.readFile(EMERGENCIES_FILE, "utf8")
    if (!text.trim()) return []
    return JSON.parse(text)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(EMERGENCIES_FILE, "[]", "utf8")
    return []
  }
}

async function saveEmergencies(data: Emergency[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(EMERGENCIES_FILE, JSON.stringify(data, null, 2), "utf8")
}

async function readUsers(): Promise<StoredAccount[]> {
  try {
    const text = await fs.readFile(USERS_FILE, "utf8")
    if (!text.trim()) return []
    return JSON.parse(text)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(USERS_FILE, "[]", "utf8")
    return []
  }
}

async function saveUsers(accounts: StoredAccount[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(accounts, null, 2), "utf8")
}

function createRequestId() {
  return `REQ-${Math.floor(100000 + Math.random() * 900000)}`
}

function createPatientId() {
  return `LFX-PATIENT-${Math.floor(1000 + Math.random() * 9000)}`
}

/*
 * GET EMERGENCIES
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const viewerId = searchParams.get("viewerId") || searchParams.get("userId") || ""
    const emergencyId = searchParams.get("id") || searchParams.get("emergencyId")

    const emergencies = await readEmergencies()

    if (emergencyId) {
      const found = emergencies.find((e) => e.id === emergencyId || e.emergencyId === emergencyId)
      if (!found) {
        return NextResponse.json({ error: "Emergency not found" }, { status: 404 })
      }

      // Check privacy for single emergency
      const isConnectedOrRequester =
        found.requesterId === viewerId ||
        found.acceptedBy === viewerId ||
        found.donorId === viewerId ||
        found.connectionStatus === "connected"

      if (!isConnectedOrRequester) {
        return NextResponse.json({
          emergency: {
            ...found,
            requesterPhone: "[Hidden until connected]",
            requesterEmail: "[Hidden until connected]",
            requesterAddress: "Campus Vicinity",
          },
        })
      }

      return NextResponse.json({ emergency: found })
    }

    // List of emergencies with privacy protection for unconnected donors
    const sanitized = emergencies.map((item) => {
      const isConnectedOrRequester =
        item.requesterId === viewerId ||
        item.acceptedBy === viewerId ||
        item.donorId === viewerId

      if (!isConnectedOrRequester && item.connectionStatus !== "connected") {
        return {
          ...item,
          requesterPhone: "[Protected]",
          requesterEmail: "[Protected]",
          requesterAddress: item.requesterAddress ? "Campus Vicinity" : "Campus Area",
        }
      }
      return item
    })

    return NextResponse.json({ emergencies: sanitized })
  } catch (error) {
    console.error("GET EMERGENCIES ERROR:", error)
    return NextResponse.json({ emergencies: [] })
  }
}

/*
 * POST / ACTIONS / CREATE
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const emergencies = await readEmergencies()

    /*
     * 1. DONOR ACCEPTS EMERGENCY ("I CAN HELP")
     */
    if (
      body.action === "accept" ||
      body.action === "help" ||
      body.action === "respond"
    ) {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      emergency.status = "fulfilled"
      emergency.acceptedBy = body.donorId || body.userId || "DONOR"
      emergency.donorId = body.donorId || body.userId || "DONOR"
      emergency.donorName = body.donorName || "LifelineX Donor"
      emergency.donorPhone = body.donorPhone || ""
      emergency.donorEmail = body.donorEmail || ""
      emergency.connectionStatus = "connected"

      if (
        typeof body.latitude === "number" &&
        typeof body.longitude === "number"
      ) {
        emergency.donorLatitude = body.latitude
        emergency.donorLongitude = body.longitude
        emergency.donorLocationUpdatedAt = Date.now()
      }

      await saveEmergencies(emergencies)

      return NextResponse.json({
        success: true,
        emergency,
      })
    }

    /*
     * 2. PATIENT REQUESTS PHONE CALL
     */
    if (body.action === "contact-request") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      emergency.contactRequested = true
      emergency.contactRequestedAt = Date.now()

      await saveEmergencies(emergencies)

      return NextResponse.json({
        success: true,
        emergency,
      })
    }

    /*
     * 3. DONOR ACCEPTS PHONE CALL
     */
    if (body.action === "contact-accept") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      emergency.contactAccepted = true
      emergency.contactAcceptedAt = Date.now()

      await saveEmergencies(emergencies)

      return NextResponse.json({
        success: true,
        emergency,
      })
    }

    /*
     * 4. DONOR REJECTS PHONE CALL
     */
    if (body.action === "contact-reject") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      emergency.contactRequested = false
      emergency.contactAccepted = false

      await saveEmergencies(emergencies)

      return NextResponse.json({
        success: true,
        emergency,
      })
    }

    /*
     * 5. DISCONNECT / END CONNECTION
     */
    if (body.action === "disconnect") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      emergency.connectionStatus = "ended"
      emergency.connectionEndedBy = body.userId || "USER"
      emergency.connectionEndedAt = Date.now()

      await saveEmergencies(emergencies)

      return NextResponse.json({
        success: true,
        emergency,
      })
    }

    /*
     * 6. UPDATE DONOR LIVE LOCATION
     */
    if (body.action === "location-update") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (emergency && typeof body.latitude === "number" && typeof body.longitude === "number") {
        emergency.donorLatitude = body.latitude
        emergency.donorLongitude = body.longitude
        emergency.donorLocationUpdatedAt = Date.now()
        await saveEmergencies(emergencies)
      }

      return NextResponse.json({ success: true, emergency })
    }

    /*
     * 7. UPDATE REQUESTER LIVE LOCATION
     */
    if (body.action === "requester-location-update") {
      const emergency = emergencies.find(
        (item) => item.id === body.emergencyId || item.emergencyId === body.emergencyId,
      )

      if (emergency && typeof body.latitude === "number" && typeof body.longitude === "number") {
        emergency.requesterLatitude = body.latitude
        emergency.requesterLongitude = body.longitude
        emergency.latitude = body.latitude
        emergency.longitude = body.longitude
        emergency.requesterLocationUpdatedAt = Date.now()
        await saveEmergencies(emergencies)
      }

      return NextResponse.json({ success: true, emergency })
    }

    /*
     * 8. CREATE NEW EMERGENCY REQUEST
     */
    const requesterName = String(body.requesterName ?? body.name ?? "").trim()
    const requesterEmail = String(body.requesterEmail ?? body.email ?? "").trim().toLowerCase()
    const requesterPhone = String(body.requesterPhone ?? body.phone ?? "").trim()
    const requesterAddress = String(body.requesterAddress ?? body.address ?? "").trim()
    const bloodGroup = String(body.bloodGroup ?? "").trim()
    const quantity = Number(body.quantity ?? 1)
    const urgency = String(body.urgency ?? "Critical").trim()
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!requesterName) {
      return NextResponse.json(
        { error: "Patient / Requester full name is required." },
        { status: 400 },
      )
    }

    if (!requesterPhone) {
      return NextResponse.json(
        { error: "Contact phone number is required." },
        { status: 400 },
      )
    }

    if (!requesterEmail) {
      return NextResponse.json(
        { error: "Contact email is required." },
        { status: 400 },
      )
    }

    if (!requesterAddress) {
      return NextResponse.json(
        { error: "Complete address is required." },
        { status: 400 },
      )
    }

    if (!bloodGroup) {
      return NextResponse.json(
        { error: "Blood group is required." },
        { status: 400 },
      )
    }

    if (isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1 unit." },
        { status: 400 },
      )
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Live GPS location coordinates are required." },
        { status: 400 },
      )
    }

    // Check or create patient record in data/users.json
    const users = await readUsers()
    let patientAccount = users.find(
      (acc) => acc.user.email.trim().toLowerCase() === requesterEmail,
    )

    let requesterId = body.requesterId
    if (patientAccount) {
      requesterId = patientAccount.user.userId
    } else {
      requesterId = createPatientId()
      const newPatientUser: User = {
        _id: `server-patient-${Date.now()}`,
        userId: requesterId,
        name: requesterName,
        email: requesterEmail,
        phone: requesterPhone,
        address: requesterAddress,
        role: "requester",
        bloodGroup: bloodGroup as BloodGroup,
        verified: false,
        createdAt: new Date().toISOString(),
      }
      users.push({ user: newPatientUser })
      await saveUsers(users)
    }

    const id = createRequestId()
    const newEmergency: Emergency = {
      id,
      emergencyId: id,
      requestId: id,
      requesterId,
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterAddress,
      patientName: requesterName,
      bloodGroup,
      quantity,
      unitsNeeded: quantity,
      unitsSecured: 0,
      urgency,
      latitude,
      longitude,
      requesterLatitude: latitude,
      requesterLongitude: longitude,
      requesterLocationUpdatedAt: Date.now(),
      status: "active",
      acceptedBy: null,
      donorId: null,
      donorName: null,
      donorPhone: null,
      donorEmail: null,
      donorLatitude: undefined,
      donorLongitude: undefined,
      connectionStatus: "none",
      contactRequested: false,
      contactAccepted: false,
      createdAt: Date.now(),
    }

    emergencies.unshift(newEmergency)
    await saveEmergencies(emergencies)

    console.log("EMERGENCY CREATED:", id, bloodGroup, requesterName)

    return NextResponse.json({
      success: true,
      emergency: newEmergency,
    }, { status: 201 })
  } catch (error) {
    console.error("EMERGENCY ROUTE ERROR:", error)
    return NextResponse.json(
      { error: "Unable to process emergency request." },
      { status: 500 },
    )
  }
}

export const PATCH = POST