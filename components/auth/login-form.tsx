"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

import { Spinner } from "@/components/ui/spinner"
import { authService } from "@/lib/services/auth-service"

export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] =
    useState(false)
  const [pending, setPending] =
    useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const trimmedEmail =
      email.trim().toLowerCase()

    if (!trimmedEmail) {
      toast.error("Please enter your Gmail.")
      return
    }

    if (!password) {
      toast.error("Please enter your password.")
      return
    }

    setPending(true)

    try {
      const session =
        await authService.login({
          email: trimmedEmail,
          password,
        })

      toast.success(
        `Signed in as ${session.user.userId}`,
      )

      router.push("/dashboard")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Invalid email or password",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">
            Email
          </FieldLabel>

          <Input
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
          />

          <FieldDescription>
            Use the Gmail address you registered
            with.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">
            Password
          </FieldLabel>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              data-1p-ignore
              data-lpignore="true"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              className="pr-10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) => !previous,
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
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

          <FieldDescription>
            Enter the password you created during
            registration.
          </FieldDescription>

          <button
            type="button"
            onClick={() =>
              router.push("/forgot-password")
            }
            className="mt-1 text-left text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : null}

        {pending
          ? "Verifying..."
          : "Sign in"}
      </Button>
    </form>
  )
}