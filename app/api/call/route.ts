import { NextResponse } from "next/server"
import { getCallsCollection, getCallSignalsCollection, getEmergenciesCollection } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export type CallSignalType =
  | "call-request"
  | "call-accept"
  | "call-decline"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "hangup"
  | "call-failed"

export type CallSignal = {
  id: string
  callId: string
  emergencyId: string
  senderId: string
  senderRole: "requester" | "donor"
  type: CallSignalType
  data?: unknown
  createdAt: number
}

function createSignalId() {
  return `SIG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
}

function createCallId() {
  return `CALL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
}

/*
 * GET
 * Retrieves call signals for one emergency.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emergencyId = searchParams.get("emergencyId")
    const after = Number(searchParams.get("after") || 0)
    const callId = searchParams.get("callId")

    if (!emergencyId) {
      return NextResponse.json(
        { error: "Emergency ID is required." },
        { status: 400 },
      )
    }

    const callSignals = await getCallSignalsCollection()

    const query: Record<string, any> = {
      emergencyId,
      createdAt: { $gt: after },
    }

    if (callId) {
      query.$or = [
        { callId },
        { callId: { $exists: false } },
      ]
    }

    const docs = await callSignals
      .find(query)
      .sort({ createdAt: 1 })
      .toArray()

    const signals = docs.map((doc: any) => {
      const { _id, ...rest } = doc
      return rest
    })

    return NextResponse.json({
      signals,
    })
  } catch (error) {
    console.error("GET CALL SIGNALS ERROR:", error)
    return NextResponse.json({ signals: [] })
  }
}

/*
 * POST
 * Sends WebRTC signaling data and manages call lifecycle in calls collection.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const emergencyId = String(body.emergencyId || "").trim()
    const senderId = String(body.senderId || "").trim()
    const senderRole = body.senderRole
    const type = body.type as CallSignalType
    let callId = String(body.callId || "").trim()

    if (!emergencyId) {
      return NextResponse.json(
        { error: "Emergency ID is required." },
        { status: 400 },
      )
    }

    if (!senderId) {
      return NextResponse.json(
        { error: "Sender ID is required." },
        { status: 400 },
      )
    }

    if (senderRole !== "requester" && senderRole !== "donor") {
      return NextResponse.json(
        { error: "Invalid sender role." },
        { status: 400 },
      )
    }

    const validTypes: CallSignalType[] = [
      "call-request",
      "call-accept",
      "call-decline",
      "offer",
      "answer",
      "ice-candidate",
      "hangup",
      "call-failed",
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid call signal." },
        { status: 400 },
      )
    }

    const callsCollection = await getCallsCollection()
    const callSignals = await getCallSignalsCollection()
    const emergenciesCollection = await getEmergenciesCollection()

    // If callId is not provided, generate one for new call request or look up active call
    if (!callId) {
      if (type === "call-request") {
        callId = createCallId()
      } else {
        const activeCall = await callsCollection.findOne(
          { emergencyId, status: "active" },
          { sort: { startedAt: -1 } },
        )
        if (activeCall) {
          callId = activeCall.callId
        } else {
          callId = createCallId()
        }
      }
    }

    // 1. CALL START: Save to MongoDB calls collection
    if (type === "call-request" || type === "call-accept") {
      const emergency = await emergenciesCollection.findOne({
        $or: [
          { id: emergencyId },
          { emergencyId: emergencyId },
          { requestId: emergencyId },
        ],
      })

      const patientId = String(
        body.patientId ||
          emergency?.requesterId ||
          (senderRole === "requester" ? senderId : "REQUESTER"),
      )
      const donorId = String(
        body.donorId ||
          emergency?.donorId ||
          emergency?.acceptedBy ||
          emergency?.donorContactId ||
          (senderRole === "donor" ? senderId : "DONOR"),
      )

      const existingCall = await callsCollection.findOne({ callId })
      if (!existingCall) {
        const startedAt = Date.now()
        await callsCollection.insertOne({
          callId,
          emergencyId,
          patientId,
          donorId,
          startedAt,
          startedAtDate: new Date(startedAt),
          status: "active",
          createdAt: new Date(),
        })
      }
    }

    // 2. CALL END / FAIL: Update calls collection
    if (type === "hangup" || type === "call-decline" || type === "call-failed") {
      const targetQuery: Record<string, any> = callId
        ? { callId }
        : { emergencyId, status: "active" }

      const call = await callsCollection.findOne(targetQuery, {
        sort: { startedAt: -1 },
      })

      const endedAt = Date.now()
      const startedAt = (call && call.startedAt) ? call.startedAt : endedAt
      const duration = Math.max(0, Math.floor((endedAt - startedAt) / 1000))
      const finalStatus = type === "call-failed" ? "failed" : "completed"

      if (call) {
        await callsCollection.updateOne(
          { _id: call._id },
          {
            $set: {
              endedAt,
              endedAtDate: new Date(endedAt),
              duration,
              endedBy: senderId,
              status: finalStatus,
              updatedAt: new Date(),
            },
          },
        )
      } else {
        // Fallback: create record if none was recorded
        const emergency = await emergenciesCollection.findOne({
          $or: [
            { id: emergencyId },
            { emergencyId: emergencyId },
            { requestId: emergencyId },
          ],
        })

        const patientId = String(
          body.patientId ||
            emergency?.requesterId ||
            (senderRole === "requester" ? senderId : "REQUESTER"),
        )
        const donorId = String(
          body.donorId ||
            emergency?.donorId ||
            emergency?.acceptedBy ||
            emergency?.donorContactId ||
            (senderRole === "donor" ? senderId : "DONOR"),
        )

        await callsCollection.insertOne({
          callId,
          emergencyId,
          patientId,
          donorId,
          startedAt: endedAt,
          startedAtDate: new Date(endedAt),
          endedAt,
          endedAtDate: new Date(endedAt),
          duration: 0,
          endedBy: senderId,
          status: finalStatus,
          createdAt: new Date(),
        })
      }

      // Clean up old signals for this emergency so they don't leak to future calls
      try {
        await callSignals.deleteMany({
          emergencyId,
          createdAt: { $lt: Date.now() - 30000 },
        })
      } catch {}
    }

    const signal: CallSignal = {
      id: createSignalId(),
      callId,
      emergencyId,
      senderId,
      senderRole,
      type,
      data: body.data,
      createdAt: Date.now(),
    }

    await callSignals.insertOne({
      ...signal,
      createdAtDate: new Date(),
    })

    return NextResponse.json({
      success: true,
      callId,
      signal,
    })
  } catch (error) {
    console.error("POST CALL SIGNAL ERROR:", error)
    return NextResponse.json(
      { error: "Invalid call request." },
      { status: 400 },
    )
  }
}

/*
 * DELETE
 * Clears call signals for an emergency.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emergencyId = searchParams.get("emergencyId")

    if (!emergencyId) {
      return NextResponse.json(
        { error: "Emergency ID is required." },
        { status: 400 },
      )
    }

    const callSignals = await getCallSignalsCollection()
    await callSignals.deleteMany({ emergencyId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE CALL SIGNALS ERROR:", error)
    return NextResponse.json(
      { error: "Unable to clear call signals." },
      { status: 500 },
    )
  }
}