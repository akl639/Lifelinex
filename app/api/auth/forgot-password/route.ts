import { NextResponse } from "next/server"
import crypto from "crypto"
import nodemailer from "nodemailer"
import { getDatabase } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const email = String(body.email ?? "")
            .trim()
            .toLowerCase()

        if (!email) {
            return NextResponse.json(
                {
                    error: "Please enter your Gmail.",
                },
                { status: 400 },
            )
        }

        const db = await getDatabase()
        const usersCollection = db.collection("users")
        const passwordResetsCollection = db.collection("passwordResets")

        // Find user by email in MongoDB
        const account = await usersCollection.findOne({ email })

        /*
         * Do not reveal whether an account exists for security.
         */
        if (!account) {
            return NextResponse.json({
                success: true,
                message:
                    "If an account exists for this Gmail, reset instructions have been sent.",
            })
        }

        /*
         * Check Brevo configuration.
         */
        if (
            !process.env.SMTP_HOST ||
            !process.env.SMTP_USER ||
            !process.env.SMTP_PASSWORD ||
            !process.env.SMTP_FROM
        ) {
            console.error("BREVO SMTP CONFIGURATION MISSING")

            return NextResponse.json(
                {
                    error:
                        "Email service is not configured. Check your SMTP environment variables.",
                },
                { status: 500 },
            )
        }

        /*
         * Generate secure reset token.
         */
        const token = crypto.randomBytes(32).toString("hex")

        /*
         * Token expires after 15 minutes.
         */
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

        /*
         * Store token in MongoDB passwordResets collection.
         * Remove previous reset tokens for this email first.
         */
        await passwordResetsCollection.deleteMany({ email })
        await passwordResetsCollection.insertOne({
            email,
            token,
            expiresAt,
            createdAt: new Date(),
        })

        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            "http://localhost:3000"

        const resetUrl =
            `${appUrl}/reset-password?token=${token}`

        /*
         * Brevo SMTP configuration.
         *
         * Port 587 uses STARTTLS.
         * Do NOT use secure: true here.
         */
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        })

        /*
         * Verify SMTP connection before sending.
         */
        await transporter.verify()

        const recipientName = String(account.name || "LifelineX User")

        await transporter.sendMail({
            from: `"LifelineX" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: "LifelineX Password Reset",

            text: `Hello ${recipientName},

We received a request to reset your LifelineX password.

Open the link below to create a new password:

${resetUrl}

This link expires in 15 minutes.

If you did not request this password reset, you can safely ignore this email.

LifelineX
Campus Blood Net`,

            html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
            color: #222;
          "
        >

          <h2 style="color:#ef4444;">
            LifelineX
          </h2>

          <h1>
            Password Reset
          </h1>

          <p>
            Hello ${recipientName},
          </p>

          <p>
            We received a request to reset your LifelineX password.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p>
            <a
              href="${resetUrl}"
              style="
                display:inline-block;
                padding:12px 22px;
                background:#ef4444;
                color:white;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link expires in
            <strong>15 minutes</strong>.
          </p>

          <p style="color:#666;">
            If you did not request this password reset,
            you can safely ignore this email.
          </p>

          <p>
            LifelineX<br />
            Campus Blood Net
          </p>

        </div>
      `,
        })

        console.log(
            "PASSWORD RESET EMAIL SENT VIA MONGODB + BREVO:",
            email,
        )

        return NextResponse.json({
            success: true,
            message:
                "If an account exists for this Gmail, reset instructions have been sent.",
        })
    } catch (error) {
        console.error(
            "BREVO PASSWORD RESET ERROR:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to send password reset email.",
            },
            { status: 500 },
        )
    }
}