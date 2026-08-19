import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

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

const DATA_DIR = path.join(process.cwd(), "data")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

async function readMessages(): Promise<Message[]> {
  try {
    const text = await fs.readFile(MESSAGES_FILE, "utf8")
    if (!text.trim()) return []
    return JSON.parse(text)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(MESSAGES_FILE, "[]", "utf8")
    return []
  }
}

async function saveMessages(messages: Message[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8")
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

    const messages = await readMessages()
    const filtered = messages.filter((m) => m.emergencyId === emergencyId)

    return NextResponse.json({ messages: filtered })
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

    const messages = await readMessages()
    const newMessage: Message = {
      id: createMessageId(),
      emergencyId,
      senderId,
      senderRole,
      text,
      message: text,
      createdAt: Date.now(),
    }

    messages.push(newMessage)
    await saveMessages(messages)

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

    const messages = await readMessages()
    const remaining = messages.filter((m) => m.emergencyId !== emergencyId)
    await saveMessages(remaining)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE MESSAGES ERROR:", error)
    return NextResponse.json(
      { error: "Unable to clear messages." },
      { status: 500 },
    )
  }
}