import { NextResponse } from "next/server"

type LocationData = {
  userId: string
  latitude: number
  longitude: number
  updatedAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __lifelineLocations?: Map<string, LocationData>
}

if (!globalStore.__lifelineLocations) {
  globalStore.__lifelineLocations = new Map<string, LocationData>()
}

const locations = globalStore.__lifelineLocations

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { userId, latitude, longitude } = body

    if (
      !userId ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid location data" },
        { status: 400 }
      )
    }

    const location: LocationData = {
      userId,
      latitude,
      longitude,
      updatedAt: Date.now(),
    }

    locations.set(userId, location)

    return NextResponse.json({
      success: true,
      location,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to save location" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (userId) {
    const location = locations.get(userId)

    return NextResponse.json({
      success: true,
      location: location ?? null,
    })
  }

  return NextResponse.json({
    success: true,
    locations: Array.from(locations.values()),
  })
}