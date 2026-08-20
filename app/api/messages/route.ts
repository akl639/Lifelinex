import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

type Message = {
  id: string
  emergencyId: string
  senderId: string
  senderRole: "requester" | "donor"
  text: string
  message?: string
  createdAt: number
}

function createMessageId() {
  return `MSG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
}

/*
 * GET MESSAGES
 */
export async function GET(request: Request) {
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
    const messagesCollection = db.collection("messages")

    const messages = await messagesCollection
      .find({ emergencyId })
      .sort({ createdAt: 1 })
      .toArray()

    const sanitized = messages.map((m: any) => {
      const { _id, ...rest } = m
      return rest
    })

    return NextResponse.json({ messages: sanitized })
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error)
    return NextResponse.json({ messages: [] })
  }
}

/*
 * POST NEW MESSAGE
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const emergencyId = String(body.emergencyId ?? "").trim()
    const senderId = String(body.senderId ?? "").trim()
    const senderRole = (body.senderRole ?? "donor") as "requester" | "donor"
    const text = String(body.text ?? body.message ?? "").trim()

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

    if (!text) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const messagesCollection = db.collection("messages")

    const newMessage: Message = {
      id: createMessageId(),
      emergencyId,
      senderId,
      senderRole,
      text,
      message: text,
      createdAt: Date.now(),
    }

    await messagesCollection.insertOne({
      ...newMessage,
      createdAtDate: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: newMessage,
    }, { status: 201 })
  } catch (error) {
    console.error("POST MESSAGE ERROR:", error)
    return NextResponse.json(
      { error: "Unable to save message." },
      { status: 500 },
    )
  }
}

/*
 * DELETE MESSAGES
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
    const messagesCollection = db.collection("messages")
    await messagesCollection.deleteMany({ emergencyId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE MESSAGES ERROR:", error)
    return NextResponse.json(
      { error: "Unable to clear messages." },
      { status: 500 },
    )
  }
}