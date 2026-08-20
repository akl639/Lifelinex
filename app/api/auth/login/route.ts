import { NextResponse } from "next/server"
import { scryptSync, timingSafeEqual } from "crypto"
import { CURRENT_DONOR, CURRENT_COORDINATOR, DONORS } from "@/lib/mock/data"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()

    const password = String(body.password ?? "")

    if (!email || !password) {
      return NextResponse.json(
        { error: "Gmail and password are required." },
        { status: 400 },
      )
    }

    // 1. Check MongoDB Atlas
    try {
      const db = await getDatabase()
      const usersCollection = db.collection("users")
      const account = await usersCollection.findOne({ email })

      if (account) {
        let passwordMatches = false

        if (account.password && account.password === password) {
          passwordMatches = true
        } else if (account.passwordHash && account.passwordSalt) {
          const storedHash = Buffer.from(String(account.passwordHash), "hex")
          const calculatedHash = scryptSync(password, String(account.passwordSalt), 64)
          passwordMatches =
            storedHash.length === calculatedHash.length &&
            timingSafeEqual(storedHash, calculatedHash)
        }

        if (!passwordMatches) {
          return NextResponse.json(
            { error: "Wrong password. Please try again or use Forgot Password." },
            { status: 401 },
          )
        }

        const safeUser = {
          _id: String(account.userId ?? account._id ?? `server-${Date.now()}`),
          userId: String(account.userId),
          name: String(account.name ?? ""),
          email: String(account.email ?? ""),
          phone: String(account.phone ?? ""),
          address: String(account.address ?? ""),
          bloodGroup: String(account.bloodGroup ?? ""),
          role: String(account.role ?? "donor"),
          donorType: String(account.donorType ?? "student"),
          department: String(account.department ?? ""),
          year: String(account.year ?? ""),
          graduationYear: String(account.graduationYear ?? ""),
          relativeName: String(account.relativeName ?? ""),
          relationship: String(account.relationship ?? ""),
          studentName: String(account.studentName ?? ""),
          studentId: String(account.studentId ?? ""),
          studentDepartment: String(account.studentDepartment ?? ""),
          locationOptIn: Boolean(account.locationOptIn),
          alertOptIn: Boolean(account.alertOptIn),
          verified: Boolean(account.verified),
          createdAt: typeof account.createdAt === "string" ? account.createdAt : new Date().toISOString(),
        }

        return NextResponse.json({
          success: true,
          token: `server.${safeUser.userId}`,
          user: safeUser,
        })
      }
    } catch (mongoErr) {
      console.warn("MongoDB login check error:", mongoErr)
    }

    // 2. Check demo mock users (Aarav, Dr. Nisha Rao, etc.)
    const demoUsers = [CURRENT_DONOR, CURRENT_COORDINATOR, ...DONORS]
    const demoMatch = demoUsers.find(
      (u) => u.email.trim().toLowerCase() === email,
    )

    if (demoMatch) {
      const token = `server.${demoMatch.userId}`
      return NextResponse.json({
        success: true,
        token,
        user: demoMatch,
      })
    }

    // 3. Email not found
    return NextResponse.json(
      {
        error: "No LifelineX account is registered with this Gmail.",
      },
      { status: 404 },
    )
  } catch (error) {
    console.error("LOGIN ERROR:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sign in.",
      },
      { status: 500 },
    )
  }
}