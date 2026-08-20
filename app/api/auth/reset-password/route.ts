import { NextResponse } from "next/server"
import crypto from "crypto"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const token = String(
            body.token ?? "",
        ).trim()

        const newPassword = String(
            body.password ?? "",
        )

        if (!token) {
            return NextResponse.json(
                {
                    error: "Invalid reset link.",
                },
                { status: 400 },
            )
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                {
                    error:
                        "Password must contain at least 8 characters.",
                },
                { status: 400 },
            )
        }

        const db = await getDatabase()
        const passwordResetsCollection = db.collection("passwordResets")
        const usersCollection = db.collection("users")

        // 1. Verify reset token in MongoDB
        const resetRecord = await passwordResetsCollection.findOne({ token })

        if (!resetRecord) {
            return NextResponse.json(
                {
                    error:
                        "This password reset link is invalid or has already been used.",
                },
                { status: 400 },
            )
        }

        // 2. Check token expiration
        const expiresAtTime = new Date(resetRecord.expiresAt).getTime()

        if (expiresAtTime < Date.now()) {
            await passwordResetsCollection.deleteOne({ token })

            return NextResponse.json(
                {
                    error:
                        "This password reset link has expired. Please request a new one.",
                },
                { status: 400 },
            )
        }

        // 3. Find user account in MongoDB
        const user = await usersCollection.findOne({
            email: resetRecord.email,
        })

        if (!user) {
            return NextResponse.json(
                {
                    error:
                        "Account could not be found.",
                },
                { status: 404 },
            )
        }

        // 4. Hash new password with crypto salt
        const salt = crypto.randomBytes(16).toString("hex")
        const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex")

        // 5. Update user password in MongoDB
        await usersCollection.updateOne(
            { email: resetRecord.email },
            {
                $set: {
                    password: newPassword,
                    passwordHash,
                    passwordSalt: salt,
                    updatedAt: new Date(),
                },
            },
        )

        // 6. Make the token single-use by deleting it
        await passwordResetsCollection.deleteMany({ email: resetRecord.email })

        console.log(
            "PASSWORD RESET SUCCESSFUL IN MONGODB FOR:",
            resetRecord.email,
        )

        return NextResponse.json({
            success: true,
            message:
                "Password changed successfully.",
        })
    } catch (error) {
        console.error(
            "RESET PASSWORD ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to reset password.",
            },
            { status: 500 },
        )
    }
}