"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { LifelineLogo } from "@/components/brand/logo"

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const token =
        searchParams.get("token") ?? ""

    const [password, setPassword] =
        useState("")

    const [confirmPassword, setConfirmPassword] =
        useState("")

    const [showPassword, setShowPassword] =
        useState(false)

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false)

    const [pending, setPending] =
        useState(false)

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (!token) {
            toast.error(
                "Invalid password reset link.",
            )
            return
        }

        if (password.length < 8) {
            toast.error(
                "Password must contain at least 8 characters.",
            )
            return
        }

        if (password !== confirmPassword) {
            toast.error(
                "Passwords do not match.",
            )
            return
        }

        setPending(true)

        try {
            const response = await fetch(
                "/api/auth/reset-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                },
            )

            const data =
                await response.json()

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to reset password.",
                )
            }

            toast.success(
                "Password changed successfully.",
            )

            router.push("/login")
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to reset password.",
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
                        Create a new password
                    </h1>

                    <p className="mt-2 leading-relaxed text-muted-foreground">
                        Choose a new password for your
                        LifelineX account.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-8 flex flex-col gap-5"
                    >
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="password"
                                className="text-sm font-medium"
                            >
                                New password
                            </label>

                            <div className="relative">
                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    required
                                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 pr-10 outline-none focus:ring-2 focus:ring-ring"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (value) => !value,
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium"
                            >
                                Confirm new password
                            </label>

                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        confirmPassword
                                    }
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    required
                                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 pr-10 outline-none focus:ring-2 focus:ring-ring"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (value) => !value,
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={pending}
                            className="h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {pending
                                ? "Updating..."
                                : "Change password"}
                        </button>
                    </form>

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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    )
}