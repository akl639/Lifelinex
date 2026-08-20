import { NextResponse } from "next/server"
import { randomBytes, scryptSync } from "crypto"
import { getDatabase } from "@/lib/mongodb"
import { CAMPUS_LOCATIONS } from "@/lib/mock/data"
import type { BloodGroup, DonorProfile, DonorType } from "@/lib/types"

export const runtime = "nodejs"

function generateUserId() {
    const digits = Math.floor(1000 + Math.random() * 9000)
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const letter = letters[Math.floor(Math.random() * letters.length)]
    return `LFX-${digits}-${letter}`
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
        }

        // Connect to MongoDB Atlas
        const db = await getDatabase()
        const usersCollection = db.collection("users")

        // Duplicate email check in MongoDB Atlas
        const existingUser = await usersCollection.findOne({ email })
        if (existingUser) {
            return NextResponse.json(
                { error: "This Gmail is already registered with LifelineX." },
                { status: 409 },
            )
        }

        // Generate Unique ID & Password Hash
        const userId = generateUserId()
        const salt = randomBytes(16).toString("hex")
        const passwordHash = scryptSync(password, salt, 64).toString("hex")

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

        // Save directly to MongoDB Atlas
        const { _id, ...userWithoutId } = user
        await usersCollection.insertOne({
            ...userWithoutId,
            password,
            passwordHash,
            passwordSalt: salt,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const token = `server.${user.userId}`

        console.log("DONOR REGISTERED IN MONGODB ATLAS:", user.userId, user.email, "TYPE:", donorType)

        return NextResponse.json(
            {
                success: true,
                message: "LifelineX account created successfully.",
                token,
                user,
            },
            { status: 201 },
        )
    } catch (error) {
        console.error("REGISTER ERROR:", error)
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to create the LifelineX account.",
            },
            { status: 500 },
        )
    }
}