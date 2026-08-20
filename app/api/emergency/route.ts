import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
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

    const db = await getDatabase()
    const emergenciesCollection = db.collection("emergencies")

    if (emergencyId) {
      const foundDoc = await emergenciesCollection.findOne({
        $or: [
          { id: emergencyId },
          { emergencyId: emergencyId },
          { requestId: emergencyId },
        ],
      })

      if (!foundDoc) {
        return NextResponse.json({ error: "Emergency not found" }, { status: 404 })
      }

      const { _id, ...found } = foundDoc as any

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
    const emergencyDocs = await emergenciesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const sanitized = emergencyDocs.map((doc: any) => {
      const { _id, ...item } = doc
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
    const db = await getDatabase()
    const emergenciesCollection = db.collection("emergencies")
    const usersCollection = db.collection("users")

    /*
     * 1. DONOR ACCEPTS EMERGENCY ("I CAN HELP")
     */
    if (
      body.action === "accept" ||
      body.action === "help" ||
      body.action === "respond"
    ) {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      const updates: Record<string, any> = {
        status: "fulfilled",
        acceptedBy: body.donorId || body.userId || "DONOR",
        donorId: body.donorId || body.userId || "DONOR",
        donorName: body.donorName || "LifelineX Donor",
        donorPhone: body.donorPhone || "",
        donorEmail: body.donorEmail || "",
        connectionStatus: "connected",
      }

      if (
        typeof body.latitude === "number" &&
        typeof body.longitude === "number"
      ) {
        updates.donorLatitude = body.latitude
        updates.donorLongitude = body.longitude
        updates.donorLocationUpdatedAt = Date.now()
      }

      await emergenciesCollection.updateOne(
        { _id: emergency._id },
        { $set: updates },
      )

      const { _id, ...rest } = emergency
      const updatedEmergency = { ...rest, ...updates }

      return NextResponse.json({
        success: true,
        emergency: updatedEmergency,
      })
    }

    /*
     * 2. PATIENT REQUESTS PHONE CALL
     */
    if (body.action === "contact-request") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      const updates = {
        contactRequested: true,
        contactRequestedAt: Date.now(),
      }

      await emergenciesCollection.updateOne(
        { _id: emergency._id },
        { $set: updates },
      )

      const { _id, ...rest } = emergency
      return NextResponse.json({
        success: true,
        emergency: { ...rest, ...updates },
      })
    }

    /*
     * 3. DONOR ACCEPTS PHONE CALL
     */
    if (body.action === "contact-accept") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      const updates = {
        contactAccepted: true,
        contactAcceptedAt: Date.now(),
      }

      await emergenciesCollection.updateOne(
        { _id: emergency._id },
        { $set: updates },
      )

      const { _id, ...rest } = emergency
      return NextResponse.json({
        success: true,
        emergency: { ...rest, ...updates },
      })
    }

    /*
     * 4. DONOR REJECTS PHONE CALL
     */
    if (body.action === "contact-reject") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      const updates = {
        contactRequested: false,
        contactAccepted: false,
      }

      await emergenciesCollection.updateOne(
        { _id: emergency._id },
        { $set: updates },
      )

      const { _id, ...rest } = emergency
      return NextResponse.json({
        success: true,
        emergency: { ...rest, ...updates },
      })
    }

    /*
     * 5. DISCONNECT / END CONNECTION
     */
    if (body.action === "disconnect") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (!emergency) {
        return NextResponse.json(
          { error: "Emergency request not found." },
          { status: 404 },
        )
      }

      const updates = {
        connectionStatus: "ended" as const,
        connectionEndedBy: body.userId || "USER",
        connectionEndedAt: Date.now(),
        contactRequested: false,
        contactAccepted: false,
        acceptedBy: null,
        donorId: null,
        donorName: null,
        donorPhone: null,
        donorEmail: null,
        status: "active" as const,
      }

      await emergenciesCollection.updateOne(
        { _id: emergency._id },
        { $set: updates },
      )

      // Clean up call signals so any active WebRTC voice call immediately terminates
      try {
        const callSignals = db.collection("callSignals")
        await callSignals.deleteMany({
          $or: [
            { emergencyId: String(body.emergencyId) },
            { emergencyId: String(emergency.id || "") },
          ],
        })
      } catch { }

      const { _id, ...rest } = emergency
      return NextResponse.json({
        success: true,
        emergency: { ...rest, ...updates },
      })
    }

    /*
     * 6. UPDATE DONOR LIVE LOCATION
     */
    if (body.action === "location-update") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (emergency && typeof body.latitude === "number" && typeof body.longitude === "number") {
        const updates = {
          donorLatitude: body.latitude,
          donorLongitude: body.longitude,
          donorLocationUpdatedAt: Date.now(),
        }

        await emergenciesCollection.updateOne(
          { _id: emergency._id },
          { $set: updates },
        )

        const { _id, ...rest } = emergency
        return NextResponse.json({ success: true, emergency: { ...rest, ...updates } })
      }

      if (emergency) {
        const { _id, ...rest } = emergency
        return NextResponse.json({ success: true, emergency: rest })
      }

      return NextResponse.json({ success: true, emergency: null })
    }

    /*
     * 7. UPDATE REQUESTER LIVE LOCATION
     */
    if (body.action === "requester-location-update") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: body.emergencyId },
          { emergencyId: body.emergencyId },
          { requestId: body.emergencyId },
        ],
      })

      if (emergency && typeof body.latitude === "number" && typeof body.longitude === "number") {
        const updates = {
          requesterLatitude: body.latitude,
          requesterLongitude: body.longitude,
          latitude: body.latitude,
          longitude: body.longitude,
          requesterLocationUpdatedAt: Date.now(),
        }

        await emergenciesCollection.updateOne(
          { _id: emergency._id },
          { $set: updates },
        )

        const { _id, ...rest } = emergency
        return NextResponse.json({ success: true, emergency: { ...rest, ...updates } })
      }

      if (emergency) {
        const { _id, ...rest } = emergency
        return NextResponse.json({ success: true, emergency: rest })
      }

      return NextResponse.json({ success: true, emergency: null })
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

    // Check or create patient record in MongoDB users collection
    const patientAccount = await usersCollection.findOne({
      email: requesterEmail,
    })

    let requesterId = body.requesterId
    if (patientAccount) {
      requesterId = patientAccount.userId || requesterId || createPatientId()
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
      const { _id, ...patientWithoutId } = newPatientUser
      await usersCollection.insertOne({
        ...patientWithoutId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
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

    await emergenciesCollection.insertOne({
      ...newEmergency,
      createdAtDate: new Date(),
    })

    console.log("EMERGENCY CREATED IN MONGODB:", id, bloodGroup, requesterName)

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