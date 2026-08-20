import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type CallSignal = {
  id: string
  emergencyId: string
  senderId: string
  senderRole: "requester" | "donor"
  type:
    | "call-request"
    | "call-accept"
    | "call-decline"
    | "offer"
    | "answer"
    | "ice-candidate"
    | "hangup"
  data?: unknown
  createdAt: number
}

function createId() {
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

    if (!emergencyId) {
      return NextResponse.json(
        { error: "Emergency ID is required." },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const callSignals = db.collection("callSignals")

    const docs = await callSignals
      .find({
        emergencyId,
        createdAt: { $gt: after },
      })
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
 * Sends WebRTC signaling data.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const emergencyId = String(body.emergencyId || "").trim()
    const senderId = String(body.senderId || "").trim()
    const senderRole = body.senderRole
    const type = body.type

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

    if (
      type !== "call-request" &&
      type !== "call-accept" &&
      type !== "call-decline" &&
      type !== "offer" &&
      type !== "answer" &&
      type !== "ice-candidate" &&
      type !== "hangup"
    ) {
      return NextResponse.json(
        { error: "Invalid call signal." },
        { status: 400 },
      )
    }

    const signal: CallSignal = {
      id: createId(),
      emergencyId,
      senderId,
      senderRole,
      type,
      data: body.data,
      createdAt: Date.now(),
    }

    const db = await getDatabase()
    const callSignals = db.collection("callSignals")

    if (type === "hangup" || type === "call-decline") {
      await callSignals.deleteMany({
        emergencyId,
        createdAt: { $lt: Date.now() - 60000 },
      })
    }

    await callSignals.insertOne({
      ...signal,
      createdAtDate: new Date(),
    })

    return NextResponse.json({
      success: true,
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

    const db = await getDatabase()
    await db.collection("callSignals").deleteMany({ emergencyId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE CALL SIGNALS ERROR:", error)
    return NextResponse.json(
      { error: "Unable to clear call signals." },
      { status: 500 },
    )
  }
}