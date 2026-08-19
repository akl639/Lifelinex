import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = {
  title: "Sign in",
  description: "Sign in to the LifelineX campus emergency blood donor network.",
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see live emergencies near you and respond in one tap."
      footer={
        <>
          New to the network?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Register as a donor
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
