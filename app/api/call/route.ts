import { NextResponse } from "next/server"

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

const globalStore = globalThis as typeof globalThis & {
  __lifelineCallSignals?: CallSignal[]
}

if (!globalStore.__lifelineCallSignals) {
  globalStore.__lifelineCallSignals = []
}

const signals = globalStore.__lifelineCallSignals

function createId() {
  return `CALL-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

/*
 * GET
 * Retrieves call signals for one emergency.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const emergencyId =
    searchParams.get("emergencyId")

  const after = Number(
    searchParams.get("after") || 0,
  )

  if (!emergencyId) {
    return NextResponse.json(
      { error: "Emergency ID is required." },
      { status: 400 },
    )
  }

  const result = signals.filter(
    (signal) =>
      signal.emergencyId === emergencyId &&
      signal.createdAt > after,
  )

  return NextResponse.json({
    signals: result,
  })
}

/*
 * POST
 * Sends WebRTC signaling data.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const emergencyId =
      String(body.emergencyId || "")

    const senderId =
      String(body.senderId || "")

    const senderRole =
      body.senderRole

    const type =
      body.type

    if (!emergencyId) {
      return NextResponse.json(
        {
          error:
            "Emergency ID is required.",
        },
        { status: 400 },
      )
    }

    if (!senderId) {
      return NextResponse.json(
        {
          error:
            "Sender ID is required.",
        },
        { status: 400 },
      )
    }

    if (
      senderRole !== "requester" &&
      senderRole !== "donor"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid sender role.",
        },
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
        {
          error:
            "Invalid call signal.",
        },
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

    signals.push(signal)

    /*
     * Keep the in-memory store small.
     */
    if (signals.length > 500) {
      signals.splice(
        0,
        signals.length - 500,
      )
    }

    return NextResponse.json({
      success: true,
      signal,
    })
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid call request.",
      },
      { status: 400 },
    )
  }
}

/*
 * DELETE
 * Clears call signals for an emergency.
 */
export async function DELETE(
  request: Request,
) {
  const { searchParams } =
    new URL(request.url)

  const emergencyId =
    searchParams.get("emergencyId")

  if (!emergencyId) {
    return NextResponse.json(
      {
        error:
          "Emergency ID is required.",
      },
      { status: 400 },
    )
  }

  const remaining =
    signals.filter(
      (signal) =>
        signal.emergencyId !==
        emergencyId,
    )

  signals.splice(
    0,
    signals.length,
    ...remaining,
  )

  return NextResponse.json({
    success: true,
  })
}