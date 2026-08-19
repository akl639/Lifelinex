"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { LifelineLogo } from "@/components/brand/logo"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [pending, setPending] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        const normalizedEmail =
            email.trim().toLowerCase()

        if (!normalizedEmail) {
            toast.error("Please enter your Gmail.")
            return
        }

        if (!normalizedEmail.endsWith("@gmail.com")) {
            toast.error("Please enter a valid Gmail address.")
            return
        }

        setPending(true)

        try {
            const response = await fetch(
                "/api/auth/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: normalizedEmail,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to send reset instructions.",
                )
            }

            setSubmitted(true)

            toast.success(
                "Reset instructions have been sent.",
            )
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to send reset instructions.",
            )
        } finally {
            setPending(false)
        }
    }

    return (
        <main className="flex min-h-dvh items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <Link href="/">
                        <LifelineLogo />
                    </Link>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <h1 className="font-serif text-3xl tracking-tight">
                        Forgot password?
                    </h1>

                    <p className="mt-2 leading-relaxed text-muted-foreground">
                        Enter the Gmail address you used to
                        register your LifelineX account.
                    </p>

                    {!submitted ? (
                        <form
                            onSubmit={handleSubmit}
                            className="mt-8 flex flex-col gap-5"
                        >
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium"
                                >
                                    Gmail address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="you@gmail.com"
                                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={pending}
                                className="h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {pending
                                    ? "Sending..."
                                    : "Send reset instructions"}
                            </button>
                        </form>
                    ) : (
                        <div className="mt-8 rounded-xl border border-border p-4">
                            <p className="leading-6 text-muted-foreground">
                                If an account exists for{" "}
                                <strong className="text-foreground">
                                    {email}
                                </strong>
                                , password reset instructions
                                have been sent there.
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-sm">
                        <Link
                            href="/login"
                            className="text-primary hover:underline"
                        >
                            ← Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}