import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

import { CURRENT_DONOR, CURRENT_COORDINATOR, DONORS } from "@/lib/mock/data"
import type { DonorProfile, User } from "@/lib/types"

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

    if (!email) {
      return NextResponse.json(
        { error: "Please enter your Gmail." },
        { status: 400 },
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: "Please enter your password." },
        { status: 400 },
      )
    }

    // 1. Check registered accounts from data/users.json
    const accounts = await readAccounts()
    const registeredAccount = accounts.find(
      (account) =>
        account.user.email.trim().toLowerCase() === email,
    )

    if (registeredAccount) {
      if (registeredAccount.password !== password) {
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
        token,
        user: registeredAccount.user,
      })
    }

    // 2. Check demo mock users (Aarav, Dr. Nisha Rao, etc.)
    const demoUsers = [CURRENT_DONOR, CURRENT_COORDINATOR, ...DONORS]
    const demoMatch = demoUsers.find(
      (u) => u.email.trim().toLowerCase() === email,
    )

    if (demoMatch) {
      const token = `server.${demoMatch.userId}`
      return NextResponse.json({
        token,
        user: demoMatch,
      })
    }

    // 3. Email not found
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
      { error: "Unable to sign in. Please try again." },
      { status: 500 },
    )
  }
}
