import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

type StoredAccount = {
    user: {
        userId: string
        name: string
        email: string
        [key: string]: unknown
    }
    password?: string
}

type PasswordReset = {
    email: string
    token: string
    expiresAt: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")
const RESETS_FILE = path.join(DATA_DIR, "password-resets.json")

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

async function readResets(): Promise<PasswordReset[]> {
    try {
        const text = await fs.readFile(RESETS_FILE, "utf8")

        if (!text.trim()) {
            return []
        }

        return JSON.parse(text)
    } catch {
        return []
    }
}

async function saveResets(resets: PasswordReset[]) {
    await fs.mkdir(DATA_DIR, { recursive: true })

    await fs.writeFile(
        RESETS_FILE,
        JSON.stringify(resets, null, 2),
        "utf8",
    )
}

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

        const accounts = await readAccounts()

        const account = accounts.find(
            (item) =>
                item.user.email.trim().toLowerCase() === email,
        )

        /*
         * Do not reveal whether an account exists.
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
                        "Email service is not configured. Check your .env.local file.",
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
        const expiresAt = Date.now() + 15 * 60 * 1000

        const resets = await readResets()

        /*
         * Remove old/expired reset requests
         * for this email.
         */
        const filteredResets = resets.filter(
            (reset) =>
                reset.email !== email &&
                reset.expiresAt > Date.now(),
        )

        filteredResets.push({
            email,
            token,
            expiresAt,
        })

        await saveResets(filteredResets)

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

        await transporter.sendMail({
            from: `"LifelineX" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: "LifelineX Password Reset",

            text: `Hello ${account.user.name},

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
            Hello ${account.user.name},
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
            "PASSWORD RESET EMAIL SENT:",
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