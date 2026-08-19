"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  BellRingIcon,
  Eye,
  EyeOff,
  GraduationCapIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import {
  Field,
  FieldDescription,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"

import { authService } from "@/lib/services/auth-service"

import {
  BLOOD_GROUPS,
  DEPARTMENTS,
  YEARS,
} from "@/lib/mock/data"

import type {
  BloodGroup,
  DonorType,
} from "@/lib/types"

const GRADUATION_YEARS = [
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
  "2018",
  "2017",
  "2016",
  "2015",
  "Before 2015",
]

const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Guardian",
  "Uncle / Aunt",
  "Cousin",
  "Other Relative",
]

export function RegisterForm() {
  const router = useRouter()

  const [pending, setPending] =
    useState(false)

  const [donorType, setDonorType] =
    useState<DonorType>("student")

  const [showPassword, setShowPassword] =
    useState(false)

  const [bloodGroup, setBloodGroup] =
    useState<BloodGroup>("O+")

  const [department, setDepartment] =
    useState<string>(DEPARTMENTS[0] ?? "")

  const [year, setYear] =
    useState<string>(YEARS[1] ?? "")

  const [graduationYear, setGraduationYear] =
    useState<string>(
      GRADUATION_YEARS[2] ?? "",
    )

  const [relationship, setRelationship] =
    useState<string>(
      RELATIONSHIPS[2] ?? "",
    )

  const [locationOptIn, setLocationOptIn] =
    useState(true)

  const [alertOptIn, setAlertOptIn] =
    useState(true)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const form =
      new FormData(event.currentTarget)

    const name = String(
      form.get("name") ?? "",
    ).trim()

    const email = String(
      form.get("email") ?? "",
    )
      .trim()
      .toLowerCase()

    const phone = String(
      form.get("phone") ?? "",
    ).trim()

    const address = String(
      form.get("address") ?? "",
    ).trim()

    const password = String(
      form.get("password") ?? "",
    )

    const relativeName =
      donorType === "relative"
        ? String(
          form.get("relativeName") ??
          name,
        ).trim()
        : ""

    const studentName =
      donorType === "relative"
        ? String(
          form.get("studentName") ?? "",
        ).trim()
        : ""

    const studentId =
      donorType === "relative"
        ? String(
          form.get("studentId") ?? "",
        ).trim()
        : ""

    const studentDepartment =
      donorType === "relative"
        ? String(
          form.get(
            "studentDepartment",
          ) ?? "",
        ).trim()
        : ""

    if (!name) {
      toast.error(
        "Please enter your full name.",
      )
      return
    }

    if (!email) {
      toast.error(
        "Please enter your Gmail.",
      )
      return
    }

    if (!email.endsWith("@gmail.com")) {
      toast.error(
        "Please use a valid Gmail address.",
      )
      return
    }

    if (!phone) {
      toast.error(
        "Please enter your phone number.",
      )
      return
    }

    if (!address) {
      toast.error(
        "Please enter your complete address.",
      )
      return
    }

    if (password.length < 8) {
      toast.error(
        "Password must contain at least 8 characters.",
      )
      return
    }

    if (donorType === "relative") {
      if (!studentName) {
        toast.error(
          "Please enter the student's name.",
        )
        return
      }

      if (!relationship) {
        toast.error(
          "Please select your relationship to the student.",
        )
        return
      }
    }

    setPending(true)

    try {
      const session =
        await authService.register({
          donorType,

          name,
          email,
          phone,
          address,
          password,

          role: "donor",

          bloodGroup,

          department:
            donorType !== "relative"
              ? department
              : "",

          year:
            donorType === "student"
              ? year
              : "",

          graduationYear:
            donorType === "alumni"
              ? graduationYear
              : "",

          relativeName:
            donorType === "relative"
              ? relativeName
              : "",

          relationship:
            donorType === "relative"
              ? relationship
              : "",

          studentName:
            donorType === "relative"
              ? studentName
              : "",

          studentId:
            donorType === "relative"
              ? studentId
              : "",

          studentDepartment:
            donorType === "relative"
              ? studentDepartment
              : "",

          locationOptIn,
          alertOptIn,
        })

      toast.success(
        `Registration successful! Your LifelineX ID is ${session.user.userId}`,
      )

      router.push("/dashboard")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
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

        {/* DONOR TYPE */}

        <Field>
          <FieldLabel>
            Donor Type{" "}
            <span className="text-primary">
              *
            </span>
          </FieldLabel>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

            <button
              type="button"
              onClick={() =>
                setDonorType("student")
              }
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-center text-xs font-semibold transition-all ${donorType === "student"
                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
            >
              <GraduationCapIcon className="size-4" />
              <span>
                Current Student
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setDonorType("relative")
              }
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-center text-xs font-semibold transition-all ${donorType === "relative"
                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
            >
              <HeartHandshakeIcon className="size-4" />
              <span>
                Relative of Student
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setDonorType("alumni")
              }
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-center text-xs font-semibold transition-all ${donorType === "alumni"
                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
            >
              <UserCheckIcon className="size-4" />
              <span>
                Pass-out / Alumni
              </span>
            </button>

          </div>

          <FieldDescription>
            {donorType === "student" &&
              "Enrolled campus student willing to respond to campus emergencies."}

            {donorType === "relative" &&
              "Family member or relative of a campus student supporting the emergency blood network."}

            {donorType === "alumni" &&
              "Graduated alumnus staying connected for campus and local blood support."}
          </FieldDescription>
        </Field>

        {/* NAME */}

        <Field>
          <FieldLabel htmlFor="name">
            Full Name{" "}
            <span className="text-primary">
              *
            </span>
          </FieldLabel>

          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            placeholder={
              donorType === "relative"
                ? "Your full name (e.g. Rahul Sharma)"
                : "e.g. Aarav Menon"
            }
          />
        </Field>

        {/* EMAIL + PHONE */}

        <div className="grid gap-4 sm:grid-cols-2">

          <Field>
            <FieldLabel htmlFor="email">
              Gmail{" "}
              <span className="text-primary">
                *
              </span>
            </FieldLabel>

            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@gmail.com"
            />

            <FieldDescription>
              Use the Gmail you want to register
              with LifelineX.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">
              Phone Number{" "}
              <span className="text-primary">
                *
              </span>
            </FieldLabel>

            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+91 98765 43210"
            />
          </Field>

        </div>

        {/* ADDRESS */}

        <Field>
          <FieldLabel htmlFor="address">
            Complete Address{" "}
            <span className="text-primary">
              *
            </span>
          </FieldLabel>

          <Textarea
            id="address"
            name="address"
            required
            rows={2}
            placeholder={
              donorType === "student"
                ? "e.g. Hostel Block C, Room 204, North Campus"
                : "e.g. 12 College Road, Salt Lake, Kolkata, West Bengal"
            }
          />

          <FieldDescription>
            Your current residential or hostel
            address for distance matching.
          </FieldDescription>
        </Field>

        {/* PASSWORD */}

        <Field>
          <FieldLabel htmlFor="password">
            Password{" "}
            <span className="text-primary">
              *
            </span>
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
              required
              minLength={8}
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Create a secure password (min 8 characters)"
              className="pr-10"
            />

            {/* ONLY ONE PASSWORD EYE BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) =>
                    !previous,
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
            Password must contain at least 8
            characters.
          </FieldDescription>
        </Field>

        {/* BLOOD GROUP */}

        <Field>
          <FieldLabel>
            Blood Group{" "}
            <span className="text-primary">
              *
            </span>
          </FieldLabel>

          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map(
              (group) => (
                <Button
                  key={group}
                  type="button"
                  variant={
                    bloodGroup === group
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setBloodGroup(group)
                  }
                  className="font-mono text-sm font-bold"
                  aria-pressed={
                    bloodGroup === group
                  }
                >
                  {group}
                </Button>
              ),
            )}
          </div>

          <FieldDescription>
            Your blood group will be confirmed
            before matching.
          </FieldDescription>
        </Field>

        {/* CURRENT STUDENT */}

        {donorType === "student" && (
          <div className="grid gap-4 sm:grid-cols-2">

            <Field>
              <FieldLabel htmlFor="department">
                Department
              </FieldLabel>

              <Select
                value={department}
                onValueChange={(value) => {
                  if (value) {
                    setDepartment(value)
                  }
                }}
              >
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {DEPARTMENTS.map(
                      (item) => (
                        <SelectItem
                          key={item}
                          value={item}
                        >
                          {item}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="year">
                Current Year
              </FieldLabel>

              <Select
                value={year}
                onValueChange={(value) => {
                  if (value) {
                    setYear(value)
                  }
                }}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {YEARS.map(
                      (item) => (
                        <SelectItem
                          key={item}
                          value={item}
                        >
                          Year {item}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

          </div>
        )}

        {/* ALUMNI */}

        {donorType === "alumni" && (
          <div className="grid gap-4 sm:grid-cols-2">

            <Field>
              <FieldLabel htmlFor="alumni-dept">
                Department
              </FieldLabel>

              <Select
                value={department}
                onValueChange={(value) => {
                  if (value) {
                    setDepartment(value)
                  }
                }}
              >
                <SelectTrigger id="alumni-dept">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {DEPARTMENTS.map(
                      (item) => (
                        <SelectItem
                          key={item}
                          value={item}
                        >
                          {item}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="graduationYear">
                Graduation Year
              </FieldLabel>

              <Select
                value={graduationYear}
                onValueChange={(value) => {
                  if (value) {
                    setGraduationYear(value)
                  }
                }}
              >
                <SelectTrigger id="graduationYear">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {GRADUATION_YEARS.map(
                      (item) => (
                        <SelectItem
                          key={item}
                          value={item}
                        >
                          {item}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

          </div>
        )}

        {/* RELATIVE */}

        {donorType === "relative" && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">

            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <UsersIcon className="size-4" />
              <span>
                Student Connection Details
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <Field>
                <FieldLabel htmlFor="relationship">
                  Relationship{" "}
                  <span className="text-primary">
                    *
                  </span>
                </FieldLabel>

                <Select
                  value={relationship}
                  onValueChange={(value) => {
                    if (value) {
                      setRelationship(value)
                    }
                  }}
                >
                  <SelectTrigger id="relationship">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      {RELATIONSHIPS.map(
                        (rel) => (
                          <SelectItem
                            key={rel}
                            value={rel}
                          >
                            {rel}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="studentName">
                  Student's Full Name{" "}
                  <span className="text-primary">
                    *
                  </span>
                </FieldLabel>

                <Input
                  id="studentName"
                  name="studentName"
                  required
                  placeholder="e.g. Amit Sharma"
                />
              </Field>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <Field>
                <FieldLabel htmlFor="studentId">
                  Student's LifelineX ID
                  (Optional)
                </FieldLabel>

                <Input
                  id="studentId"
                  name="studentId"
                  placeholder="e.g. LFX-1234-A"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="studentDepartment">
                  Student's Department
                  (Optional)
                </FieldLabel>

                <Input
                  id="studentDepartment"
                  name="studentDepartment"
                  placeholder="e.g. Computer Science"
                />
              </Field>

            </div>
          </div>
        )}

        <FieldSeparator />

        {/* LOCATION */}

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle className="flex items-center gap-2">
              <MapPinIcon className="size-4 text-primary" />
              Share location for matching
            </FieldTitle>

            <FieldDescription>
              Allows LifelineX to locate nearby
              emergencies and calculate response
              ETA.
            </FieldDescription>
          </FieldContent>

          <Switch
            checked={locationOptIn}
            onCheckedChange={
              setLocationOptIn
            }
            aria-label="Share location for matching"
          />
        </Field>

        {/* ALERTS */}

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle className="flex items-center gap-2">
              <BellRingIcon className="size-4 text-primary" />
              Emergency alert opt-in
            </FieldTitle>

            <FieldDescription>
              Receive urgent push notifications
              and matching blood requests.
            </FieldDescription>
          </FieldContent>

          <Switch
            checked={alertOptIn}
            onCheckedChange={
              setAlertOptIn
            }
            aria-label="Emergency alert opt-in"
          />
        </Field>

      </FieldGroup>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : null}

        {pending
          ? "Creating your LifelineX ID..."
          : "Create my LifelineX ID"}
      </Button>
    </form>
  )
}