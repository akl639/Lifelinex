import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata = {
  title: "Register as Donor",
  description: "Join the LifelineX campus emergency blood donor network.",
}

export default function RegisterPage() {
  return (
    <AuthShell
      title="Join the Donor Network"
      subtitle="Register as an emergency blood donor to receive targeted alerts on campus."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in to your account
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}