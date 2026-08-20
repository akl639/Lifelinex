import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { CURRENT_DONOR, CURRENT_COORDINATOR, DONORS } from "@/lib/mock/data"
import type { DonorProfile, User } from "@/lib/types"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

type StoredAccount = {
  user: DonorProfile | User
  password?: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")

async function readAccounts(): Promise<StoredAccount[]> {
  try {
    const text = await fs.readFile(USERS_FILE, "utf8")
    if (!text.trim()) {
      return []
    }
    return JSON.parse(text)
  } catch {
    return []
  }
}

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

    // 1. Check registered accounts in data/users.json
    const accounts = await readAccounts()
    const registeredAccount = accounts.find(
      (account) =>
        account?.user?.email?.trim().toLowerCase() === email,
    )

    if (registeredAccount) {
      if (registeredAccount.password && registeredAccount.password !== password) {
        return NextResponse.json(
          {
            error:
              "Wrong password. Please try again or use Forgot Password.",
          },
          { status: 401 },
        )
      }

      const token = `server.${registeredAccount.user.userId}`

      return NextResponse.json({
        success: true,
        token,
        user: registeredAccount.user,
      })
    }

    // 2. Check MongoDB as fallback (if account was registered in MongoDB)
    try {
      const db = await getDatabase()
      const usersCollection = db.collection("users")
      const mongoAccount = await usersCollection.findOne({ email })

      if (mongoAccount) {
        if (mongoAccount.password && mongoAccount.password !== password) {
          return NextResponse.json(
            { error: "Wrong password. Please try again or use Forgot Password." },
            { status: 401 },
          )
        }

        const safeUser: any = {
          _id: String(mongoAccount.userId ?? `server-${Date.now()}`),
          userId: String(mongoAccount.userId),
          name: String(mongoAccount.name ?? ""),
          email: String(mongoAccount.email ?? ""),
          phone: String(mongoAccount.phone ?? ""),
          address: String(mongoAccount.address ?? ""),
          bloodGroup: String(mongoAccount.bloodGroup ?? ""),
          role: String(mongoAccount.role ?? "donor"),
          donorType: String(mongoAccount.donorType ?? "student"),
          department: String(mongoAccount.department ?? ""),
          year: String(mongoAccount.year ?? ""),
          graduationYear: String(mongoAccount.graduationYear ?? ""),
          relativeName: String(mongoAccount.relativeName ?? ""),
          relationship: String(mongoAccount.relationship ?? ""),
          studentName: String(mongoAccount.studentName ?? ""),
          studentId: String(mongoAccount.studentId ?? ""),
          studentDepartment: String(mongoAccount.studentDepartment ?? ""),
          locationOptIn: Boolean(mongoAccount.locationOptIn),
          alertOptIn: Boolean(mongoAccount.alertOptIn),
          verified: false,
          createdAt: new Date().toISOString(),
        }

        // Cache into data/users.json for subsequent requests
        accounts.push({
          user: safeUser,
          password: String(mongoAccount.password || password),
        })
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.writeFile(USERS_FILE, JSON.stringify(accounts, null, 2), "utf8")

        return NextResponse.json({
          success: true,
          token: `server.${safeUser.userId}`,
          user: safeUser,
        })
      }
    } catch {
      // MongoDB check optional fallback
    }

    // 3. Check demo mock users (Aarav, Dr. Nisha Rao, etc.)
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

    // 4. Email not found
    return NextResponse.json(
      {
        error:
          "No LifelineX account is registered with this Gmail.",
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