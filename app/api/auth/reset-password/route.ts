import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

type StoredAccount = {
    user: {
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
const RESETS_FILE = path.join(
    DATA_DIR,
    "password-resets.json",
)

async function readAccounts(): Promise<StoredAccount[]> {
    const text = await fs.readFile(
        USERS_FILE,
        "utf8",
    )

    return text.trim()
        ? JSON.parse(text)
        : []
}

async function saveAccounts(
    accounts: StoredAccount[],
) {
    await fs.writeFile(
        USERS_FILE,
        JSON.stringify(accounts, null, 2),
        "utf8",
    )
}

async function readResets(): Promise<PasswordReset[]> {
    try {
        const text = await fs.readFile(
            RESETS_FILE,
            "utf8",
        )

        return text.trim()
            ? JSON.parse(text)
            : []
    } catch {
        return []
    }
}

async function saveResets(
    resets: PasswordReset[],
) {
    await fs.writeFile(
        RESETS_FILE,
        JSON.stringify(resets, null, 2),
        "utf8",
    )
}

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

        const resets = await readResets()

        const resetIndex = resets.findIndex(
            (reset) =>
                reset.token === token,
        )

        if (resetIndex === -1) {
            return NextResponse.json(
                {
                    error:
                        "This password reset link is invalid or has already been used.",
                },
                { status: 400 },
            )
        }

        const reset = resets[resetIndex]

        if (reset.expiresAt < Date.now()) {
            resets.splice(resetIndex, 1)

            await saveResets(resets)

            return NextResponse.json(
                {
                    error:
                        "This password reset link has expired. Please request a new one.",
                },
                { status: 400 },
            )
        }

        const accounts = await readAccounts()

        const accountIndex = accounts.findIndex(
            (account) =>
                account.user.email
                    .trim()
                    .toLowerCase() ===
                reset.email,
        )

        if (accountIndex === -1) {
            return NextResponse.json(
                {
                    error:
                        "Account could not be found.",
                },
                { status: 404 },
            )
        }

        /*
         * Your existing login system currently
         * stores passwords directly in users.json,
         * so we preserve that format here.
         */
        accounts[accountIndex].password =
            newPassword

        await saveAccounts(accounts)

        /*
         * Make the token single-use.
         */
        resets.splice(resetIndex, 1)

        await saveResets(resets)

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
                    "Unable to reset password.",
            },
            { status: 500 },
        )
    }
}