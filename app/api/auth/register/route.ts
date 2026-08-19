import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

import { CAMPUS_LOCATIONS } from "@/lib/mock/data"
import type { BloodGroup, DonorProfile, DonorType, User } from "@/lib/types"

export const runtime = "nodejs"

type StoredAccount = {
    user: DonorProfile | User
    password?: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")

function generateUserId() {
    const digits = Math.floor(1000 + Math.random() * 9000)
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const letter = letters[Math.floor(Math.random() * letters.length)]
    return `LFX-${digits}-${letter}`
}

async function readAccounts(): Promise<StoredAccount[]> {
    try {
        const text = await fs.readFile(USERS_FILE, "utf8")
        if (!text.trim()) {
            return []
        }
        return JSON.parse(text)
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.writeFile(USERS_FILE, "[]", "utf8")
        return []
    }
}

async function saveAccounts(accounts: StoredAccount[]) {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(USERS_FILE, JSON.stringify(accounts, null, 2), "utf8")
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const donorType = (body.donorType ?? "student") as DonorType
        const name = String(body.name ?? "").trim()
        const email = String(body.email ?? "").trim().toLowerCase()
        const phone = String(body.phone ?? "").trim()
        const address = String(body.address ?? "").trim()
        const password = String(body.password ?? "")
        const bloodGroup = body.bloodGroup as BloodGroup

        const locationOptIn = body.locationOptIn !== false
        const alertOptIn = body.alertOptIn !== false

        // Validation
        if (!name) {
            return NextResponse.json(
                { error: "Please enter your full name." },
                { status: 400 },
            )
        }

        if (!email) {
            return NextResponse.json(
                { error: "Please enter your Gmail." },
                { status: 400 },
            )
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.endsWith("@gmail.com") || !emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Please use a valid Gmail address." },
                { status: 400 },
            )
        }

        if (!phone) {
            return NextResponse.json(
                { error: "Please enter your phone number." },
                { status: 400 },
            )
        }

        if (!address) {
            return NextResponse.json(
                { error: "Please enter your complete address." },
                { status: 400 },
            )
        }

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: "Password must contain at least 8 characters." },
                { status: 400 },
            )
        }

        if (!bloodGroup) {
            return NextResponse.json(
                { error: "Please select your blood group." },
                { status: 400 },
            )
        }

        // Donor Type conditional validations
        let department: string | undefined = undefined
        let year: string | undefined = undefined
        let graduationYear: string | undefined = undefined
        let relativeName: string | undefined = undefined
        let relationship: string | undefined = undefined
        let studentName: string | undefined = undefined
        let studentId: string | undefined = undefined
        let studentDepartment: string | undefined = undefined

        if (donorType === "student") {
            department = String(body.department ?? "").trim()
            year = String(body.year ?? "1").trim()
            if (!department) {
                return NextResponse.json(
                    { error: "Please select your department." },
                    { status: 400 },
                )
            }
        } else if (donorType === "alumni") {
            department = String(body.department ?? "").trim()
            graduationYear = String(body.graduationYear ?? "").trim()
            if (!department) {
                return NextResponse.json(
                    { error: "Please select your department." },
                    { status: 400 },
                )
            }
            if (!graduationYear) {
                return NextResponse.json(
                    { error: "Please enter your graduation year." },
                    { status: 400 },
                )
            }
        } else if (donorType === "relative") {
            relativeName = String(body.relativeName ?? name).trim()
            relationship = String(body.relationship ?? "").trim()
            studentName = String(body.studentName ?? "").trim()
            studentId = String(body.studentId ?? "").trim() || undefined
            studentDepartment = String(body.studentDepartment ?? "").trim() || undefined

            if (!relationship) {
                return NextResponse.json(
                    { error: "Please enter your relationship to the student." },
                    { status: 400 },
                )
            }
            if (!studentName) {
                return NextResponse.json(
                    { error: "Please enter the student's name." },
                    { status: 400 },
                )
            }
        } else {
            return NextResponse.json(
                { error: "Invalid donor type selected." },
                { status: 400 },
            )
        }

        // Duplicate email check (case-insensitive)
        const accounts = await readAccounts()
        const existingAccount = accounts.find(
            (account) => account.user.email.trim().toLowerCase() === email,
        )

        if (existingAccount) {
            return NextResponse.json(
                { error: "This Gmail is already registered with LifelineX." },
                { status: 409 },
            )
        }

        const userId = generateUserId()

        // Build donor user object
        const user: DonorProfile = {
            _id: `server-${Date.now()}`,
            userId,
            name,
            email,
            phone,
            address,
            role: "donor",
            donorType,
            bloodGroup,
            ...(department ? { department } : {}),
            ...(year ? { year } : {}),
            ...(graduationYear ? { graduationYear } : {}),
            ...(relativeName ? { relativeName } : {}),
            ...(relationship ? { relationship } : {}),
            ...(studentName ? { studentName } : {}),
            ...(studentId ? { studentId } : {}),
            ...(studentDepartment ? { studentDepartment } : {}),
            status: "available",
            locationOptIn,
            alertOptIn,
            location: CAMPUS_LOCATIONS[0],
            lastDonationDate: null,
            cooldownDaysLeft: 0,
            totalDonations: 0,
            livesImpacted: 0,
            responseRate: 100,
            badges: ["Verified Registered Donor"],
            verified: false,
            createdAt: new Date().toISOString(),
        }

        accounts.push({
            user,
            password,
        })

        await saveAccounts(accounts)

        const token = `server.${user.userId}`

        console.log("DONOR CREATED:", user.userId, user.email, "TYPE:", donorType)

        return NextResponse.json(
            {
                token,
                user,
            },
            { status: 201 },
        )
    } catch (error) {
        console.error("REGISTER ERROR:", error)
        return NextResponse.json(
            { error: "Unable to create the LifelineX account." },
            { status: 500 },
        )
    }
}