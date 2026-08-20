"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/services/auth-service"
import { VoiceCall } from "@/components/call/voice-call"

type Emergency = {
  id: string
  bloodGroup: string
  quantity: number
  urgency: string
  latitude: number
  longitude: number
  createdAt: number
  status: "active" | "fulfilled"
  location?: string
  acceptedBy?: string

  donorName?: string
  donorContactId?: string

  contactRequested?: boolean
  contactRequestedAt?: number
  contactAccepted?: boolean
  contactAcceptedAt?: number

  requesterLatitude?: number
  requesterLongitude?: number
  requesterLocationUpdatedAt?: number

  donorLatitude?: number
  donorLongitude?: number
  donorLocationUpdatedAt?: number

  connectionStatus?: "none" | "requested" | "connected" | "ended"
  connectionEndedBy?: string
  connectionEndedAt?: number
}

type User = {
  userId: string
  name: string
  email: string
  phone?: string
  bloodGroup?: string
  role?: string
}

type Location = {
  latitude: number
  longitude: number
}

type ChatMessage = {
  id: string
  emergencyId: string
  senderId: string
  senderRole: "requester" | "donor"
  text: string
  createdAt: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [emergencies, setEmergencies] =
    useState<Emergency[]>([])

  const [acceptedEmergency, setAcceptedEmergency] =
    useState<Emergency | null>(null)

  const [contactRequest, setContactRequest] =
    useState<Emergency | null>(null)

  const [contactAccepted, setContactAccepted] =
    useState(false)

  const [locationSharing, setLocationSharing] =
    useState(false)

  const [location, setLocation] =
    useState<Location | null>(null)

  const [locationError, setLocationError] =
    useState("")

  const [dismissedIds, setDismissedIds] =
    useState<string[]>([])

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState("")
  const [chatSending, setChatSending] = useState(false)

  /*
   * LOAD USER
   */
  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser =
          await authService.me()

        if (!currentUser) {
          router.push("/login")
        } else {
          setUser(currentUser as User)
          setLoading(false)
          try {
            const saved = sessionStorage.getItem("lifelinex_dismissed_emergencies")
            if (saved) {
              setDismissedIds(JSON.parse(saved))
            }
          } catch {}
        }
      } catch {
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  /*
   * LOAD EMERGENCIES
   *
   * This runs every 2 seconds so the donor
   * can receive new emergency/contact requests
   * without refreshing the page.
   */
  useEffect(() => {
    if (!user?.userId) return

    async function loadEmergencies() {
      if (!user) return

      try {
        const response = await fetch(
          `/api/emergency?viewerId=${encodeURIComponent(user.userId)}&t=${Date.now()}`,
          {
            cache: "no-store",
          },
        )

        if (!response.ok) return

        const data = await response.json()

        const all: Emergency[] =
          data.emergencies || []

        /*
         * Show active emergencies matching
         * this donor's blood group and not dismissed by this donor.
         */
        const matching = all.filter(
          (item) =>
            item.status === "active" &&
            item.bloodGroup === user.bloodGroup &&
            !dismissedIds.includes(item.id) &&
            item.connectionStatus !== "ended",
        )

        setEmergencies(matching)

        /*
         * Find the emergency accepted by
         * THIS donor.
         */
        const mine = all.find(
          (item) =>
            item.status === "fulfilled" &&
            item.acceptedBy === user.userId &&
            item.connectionStatus === "connected",
        )

        if (mine) {
          setAcceptedEmergency(mine)

          /* REQUESTER HAS SENT CONTACT REQUEST */
          if (mine.contactRequested) {
            setContactRequest(mine)
            setContactAccepted(Boolean(mine.contactAccepted))
          } else {
            setContactRequest(null)
            setContactAccepted(false)
          }
        } else {
          /* Connection was ended or disconnected. */
          setAcceptedEmergency(null)
          setContactRequest(null)
          setContactAccepted(false)
        }
      } catch {
        // Keep polling if request fails.
      }
    }

    loadEmergencies()

    const interval = setInterval(
      loadEmergencies,
      1500,
    )

    return () =>
      clearInterval(interval)
  }, [
    user?.userId,
    user?.bloodGroup,
  ])

  /*
   * LIVE LOCATION
   */
  useEffect(() => {
    if (!locationSharing) return
    if (!user?.userId) return

    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location services.",
      )
      return
    }

    const watchId =
      navigator.geolocation.watchPosition(
        async (position) => {
          const latitude =
            position.coords.latitude

          const longitude =
            position.coords.longitude

          setLocation({
            latitude,
            longitude,
          })

          /*
           * Update accepted emergency with
           * donor's current location.
           */
          if (acceptedEmergency?.id) {
            try {
              await fetch(
                "/api/emergency",
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    action:
                      "location-update",
                    emergencyId:
                      acceptedEmergency.id,
                    latitude,
                    longitude,
                  }),
                },
              )
            } catch {
              // Ignore temporary location update failure.
            }
          }
        },
        (error) => {
          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setLocationError(
              "Location permission was denied. Please allow location access.",
            )
          } else {
            setLocationError(
              "Unable to get your current location.",
            )
          }

          setLocationSharing(false)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        },
      )

    return () => {
      navigator.geolocation.clearWatch(
        watchId,
      )
    }
  }, [
    locationSharing,
    user?.userId,
    acceptedEmergency?.id,
  ])

  /*
   * I CAN HELP
   */
  async function acceptEmergency(
    emergency: Emergency,
  ) {
    if (!user) return

    if (!location) {
      setLocationError(
        "Please turn on Live Location first.",
      )
      setLocationSharing(true)
      return
    }

    try {
      const response = await fetch(
        "/api/emergency",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            emergencyId: emergency.id,
            action: "accept",

            donorId: user.userId,
            donorName: user.name,

            /*
             * NEVER send the donor's
             * personal phone/email.
             */
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to accept emergency.",
        )
      }

      setAcceptedEmergency(
        data.emergency,
      )

      setEmergencies((current) =>
        current.filter(
          (item) =>
            item.id !== emergency.id,
        ),
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to respond to emergency.",
      )
    }
  }

  /*
   * ACCEPT PROTECTED CONTACT REQUEST
   */
  async function acceptContactRequest() {
    if (!contactRequest || !user) {
      return
    }

    try {
      const response = await fetch(
        "/api/emergency",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "contact-accept",
            emergencyId:
              contactRequest.id,
            donorId: user.userId,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to accept contact request.",
        )
      }

      setContactAccepted(true)

      if (data.emergency) {
        setContactRequest(
          data.emergency,
        )

        setAcceptedEmergency(
          data.emergency,
        )
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to accept contact request.",
      )
    }
  }

  /*
   * PRIVATE CHAT
   *
   * Chat is available only after the requester
   * has accepted the donor contact request.
   */
  useEffect(() => {
    if (
      !acceptedEmergency?.id ||
      acceptedEmergency.connectionStatus === "ended"
    ) {
      return
    }

    async function loadChat() {
      try {
        const response = await fetch(
          `/api/messages?emergencyId=${encodeURIComponent(
            acceptedEmergency!.id,
          )}`,
          {
            cache: "no-store",
          },
        )

        if (!response.ok) return

        const data = await response.json()
        setChatMessages(data.messages || [])
      } catch {
        // Keep polling.
      }
    }

    loadChat()

    const interval = setInterval(loadChat, 1500)

    return () => clearInterval(interval)
  }, [
    acceptedEmergency?.id,
    acceptedEmergency?.connectionStatus,
  ])

  async function sendChatMessage() {
    const text = chatText.trim()

    if (
      !text ||
      !acceptedEmergency?.id ||
      !user?.userId ||
      acceptedEmergency.connectionStatus === "ended" ||
      chatSending
    ) {
      return
    }

    setChatSending(true)

    try {
      const response = await fetch(
        "/api/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emergencyId: acceptedEmergency.id,
            senderId: user.userId,
            senderRole: "donor",
            text,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to send message.",
        )
      }

      setChatText("")

      if (data.message) {
        setChatMessages((current) => [
          ...current,
          data.message,
        ])
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to send message.",
      )
    } finally {
      setChatSending(false)
    }
  }

  /*
   * DISCONNECT FROM EMERGENCY
   */
  async function disconnectEmergency(emergencyId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect from this emergency?",
    )
    if (!confirmed) return

    try {
      const response = await fetch("/api/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          emergencyId,
          donorId: user?.userId,
          userId: user?.userId,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to disconnect.")
      }
      setAcceptedEmergency(null)
      setContactRequest(null)
      setContactAccepted(false)
      setLocationSharing(false)
      setLocation(null)
      setChatMessages([])
      setChatText("")
      alert("You have disconnected from this emergency.")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to disconnect.")
    }
  }

  /*
   * DISMISS EMERGENCY (DONOR NOT INTERESTED)
   * Dismisses only for this donor; does NOT cancel the emergency.
   */
  function dismissEmergency(emergencyId: string) {
    setDismissedIds((prev) => {
      const next = [...prev, emergencyId]
      try {
        sessionStorage.setItem("lifelinex_dismissed_emergencies", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  /*
   * LOGOUT
   */
  function handleLogout() {
    authService.logout()
    router.replace("/login")
  }

  /*
   * LOCATION TOGGLE
   */
  function toggleLocation() {
    setLocationError("")

    if (locationSharing) {
      setLocationSharing(false)
      setLocation(null)
    } else {
      setLocationSharing(true)
    }
  }

  /*
   * DISTANCE
   */
  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371

    const dLat =
      ((lat2 - lat1) * Math.PI) / 180

    const dLon =
      ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(
        (lat1 * Math.PI) / 180,
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180,
        ) *
        Math.sin(dLon / 2) ** 2

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      )

    return R * c
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-muted-foreground">
            Loading LifelineX...
          </p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              LifelineX Donor Dashboard
            </h1>

            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              Welcome, <span className="font-semibold text-foreground">{user.name}</span>. You are registered as a blood donor.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-start sm:self-auto rounded-xl border border-border px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold hover:bg-muted transition"
          >
            🚪 Logout
          </button>

        </div>

        {/* USER INFORMATION CARDS */}
        <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">

          <div className="rounded-xl border border-border p-4 sm:p-5 bg-card shadow-sm">
            <p className="text-xs sm:text-sm text-muted-foreground">
              LifelineX ID
            </p>

            <p className="mt-1 font-mono text-base sm:text-lg font-bold">
              {user.userId}
            </p>
          </div>

          <div className="rounded-xl border border-border p-4 sm:p-5 bg-card shadow-sm">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Blood Group
            </p>

            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-primary">
              {user.bloodGroup || "Not available"}
            </p>
          </div>

          <div className="rounded-xl border border-border p-4 sm:p-5 bg-card shadow-sm">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Account
            </p>

            <p className="mt-1 break-all text-xs sm:text-sm font-semibold">
              {user.email}
            </p>
          </div>

        </div>

        {/* CONNECTED RESPONDING EMERGENCY VIEW */}
        {acceptedEmergency &&
          acceptedEmergency.connectionStatus === "connected" &&
          acceptedEmergency.acceptedBy ? (
          <div className="mt-6 sm:mt-8">
            {/* Responsive Grid: 2 Columns on Desktop (7/5 split), Stacked on Mobile */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              
              {/* Left Column: Emergency Details, Patient Location & Live Sharing */}
              <div className="space-y-6 lg:col-span-7">
                {/* Responding Status Card */}
                <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-300">
                      ✓ You Are Responding
                    </h2>
                    <span className="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:text-green-300">
                      Connected
                    </span>
                  </div>

                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                    Emergency <span className="font-mono font-bold text-foreground">{acceptedEmergency.id}</span> is assigned to you.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3 text-center">
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Blood Group</p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold text-primary">{acceptedEmergency.bloodGroup}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3 text-center">
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Quantity</p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold">{acceptedEmergency.quantity} unit(s)</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3 text-center">
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Urgency</p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold">{acceptedEmergency.urgency}</p>
                    </div>
                  </div>
                </div>

                {/* Patient Live Location Card */}
                <div className="rounded-xl border border-primary/30 bg-card p-5 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold">
                    📍 Patient Live Location
                  </h2>

                  {acceptedEmergency.requesterLatitude !== undefined &&
                  acceptedEmergency.requesterLongitude !== undefined ? (
                    <>
                      <p className="mt-2 font-mono text-xs sm:text-sm text-muted-foreground">
                        {acceptedEmergency.requesterLatitude.toFixed(5)},{" "}
                        {acceptedEmergency.requesterLongitude.toFixed(5)}
                      </p>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${acceptedEmergency.requesterLatitude},${acceptedEmergency.requesterLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block w-full rounded-xl bg-primary px-5 py-3 text-center text-xs sm:text-sm font-bold text-primary-foreground shadow transition hover:opacity-90 active:scale-[0.99]"
                      >
                        🗺️ Track / Navigate to Patient in Google Maps
                      </a>

                      <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
                        The patient location updates while the patient keeps Live Location enabled.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                      Waiting for the patient's live location...
                    </p>
                  )}
                </div>

                {/* Donor Live Location Sharing */}
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    📍 Live Location Sharing
                  </h2>

                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Share your location voluntarily so the patient can track your arrival.
                  </p>

                  <button
                    type="button"
                    onClick={toggleLocation}
                    className="mt-4 w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
                  >
                    {locationSharing
                      ? "Turn Off Live Location"
                      : "📍 Share My Live Location"}
                  </button>

                  {locationSharing && location && (
                    <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                      <p className="font-semibold text-xs sm:text-sm text-green-700 dark:text-green-300">
                        ✓ Live location sharing is ON
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                      </p>
                    </div>
                  )}

                  {locationError && (
                    <p className="mt-3 text-xs text-red-500">
                      {locationError}
                    </p>
                  )}
                </div>

                {/* Disconnect Button */}
                <button
                  type="button"
                  onClick={() => disconnectEmergency(acceptedEmergency.id)}
                  className="w-full rounded-xl bg-red-600 px-5 py-3.5 text-xs sm:text-sm font-bold text-white shadow transition hover:bg-red-700 active:scale-[0.99]"
                >
                  🔴 Disconnect from Emergency
                </button>
              </div>

              {/* Right Column: Voice Call & Live Chat (Sticky on Desktop) */}
              <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6">
                {/* PRIVATE VOICE CALL */}
                {user && (
                  <VoiceCall
                    emergencyId={acceptedEmergency.id}
                    userId={user.userId}
                    role="donor"
                    connected={acceptedEmergency.connectionStatus === "connected"}
                  />
                )}

                {/* PRIVATE CHAT */}
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold">
                    💬 Private LifelineX Chat
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Direct chat with the patient.
                  </p>

                  <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
                    <div className="max-h-72 min-h-36 space-y-3 overflow-y-auto p-3 sm:p-4">
                      {chatMessages.length === 0 ? (
                        <p className="py-8 text-center text-xs sm:text-sm text-muted-foreground">
                          No messages yet. Start the conversation.
                        </p>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderRole === "donor"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm ${
                                message.senderRole === "donor"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-[10px] font-semibold opacity-70">
                                {message.senderRole === "donor"
                                  ? "You"
                                  : "Patient"}
                              </p>

                              <p className="mt-0.5 whitespace-pre-wrap break-words">
                                {message.text}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        sendChatMessage()
                      }}
                      className="flex gap-2 border-t border-border p-2.5 sm:p-3"
                    >
                      <input
                        value={chatText}
                        onChange={(event) =>
                          setChatText(event.target.value)
                        }
                        placeholder="Type a message..."
                        maxLength={500}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary"
                        disabled={chatSending}
                      />

                      <button
                        type="submit"
                        disabled={!chatText.trim() || chatSending}
                        className="rounded-lg bg-primary px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {chatSending ? "..." : "Send"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* EMERGENCY ALERT STATUS */}
            <div className="mt-6 rounded-xl border border-border p-5 sm:p-6 bg-card shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold">
                Emergency Alerts
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-green-600 font-medium">
                ✓ Emergency donor alerts are enabled.
              </p>
            </div>

            {/* CONTACT REQUEST NOTIFICATION (IF PENDING) */}
            {contactRequest && (
              <div className="mt-6 rounded-xl border-2 border-primary bg-primary/10 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="text-3xl">
                    🔔
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">
                      Contact Request
                    </h2>

                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                      The emergency requester wants to connect with you through LifelineX.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground">
                          Emergency ID
                        </p>
                        <p className="mt-0.5 font-mono font-bold text-sm">
                          {contactRequest.id}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground">
                          Blood Group
                        </p>
                        <p className="mt-0.5 font-bold text-sm text-primary">
                          {contactRequest.bloodGroup}
                        </p>
                      </div>
                    </div>

                    {!contactAccepted ? (
                      <button
                        type="button"
                        onClick={acceptContactRequest}
                        className="mt-4 w-full rounded-xl bg-primary px-5 py-3 font-bold text-xs sm:text-sm text-primary-foreground hover:opacity-90 shadow transition"
                      >
                        📞 Accept Protected Contact
                      </button>
                    ) : (
                      <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                        <p className="font-semibold text-xs sm:text-sm text-green-600">
                          ✓ Contact request accepted
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          You are now connected with the requester through LifelineX.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LIVE LOCATION SHARING CARD (UNCONNECTED) */}
            <div className="mt-6 rounded-xl border border-border p-5 sm:p-6 bg-card shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold">
                📍 Live Location Sharing
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Share your current location voluntarily so LifelineX can help coordinate nearby emergencies.
              </p>

              <button
                type="button"
                onClick={toggleLocation}
                className="mt-4 w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                {locationSharing
                  ? "Turn Off Live Location"
                  : "📍 Share My Live Location"}
              </button>

              {locationSharing && location && (
                <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="font-semibold text-xs sm:text-sm text-green-600">
                    ✓ Live location sharing is ON
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </p>
                </div>
              )}

              {locationError && (
                <p className="mt-3 text-xs text-red-500">
                  {locationError}
                </p>
              )}
            </div>

            {/* EMERGENCY ALERTS LIST */}
            <div className="mt-6 rounded-xl border border-border p-5 sm:p-6 bg-card shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold">
                🚨 Emergency Alerts
              </h2>

              {emergencies.length === 0 ? (
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                  No matching emergency requests at the moment.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {emergencies.map((emergency) => {
                    let distance: number | null = null

                    if (location) {
                      distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        emergency.latitude,
                        emergency.longitude,
                      )
                    }

                    return (
                      <div
                        key={emergency.id}
                        className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 sm:p-5 transition hover:border-red-500/60 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-600">
                              {emergency.urgency || "Critical"}
                            </span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {emergency.id}
                            </span>
                          </div>

                          {distance !== null && (
                            <span className="font-bold text-xs sm:text-sm text-primary">
                              📏 {distance < 1
                                ? `${Math.round(distance * 1000)} m away`
                                : `${distance.toFixed(2)} km away`}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Needed</p>
                            <p className="text-base font-bold text-primary">{emergency.bloodGroup}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Quantity</p>
                            <p className="text-base font-bold">{emergency.quantity} unit(s)</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Hospital / Area</p>
                            <p className="text-base font-semibold">{emergency.location || "Campus Vicinity"}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                          <button
                            type="button"
                            onClick={() => acceptEmergency(emergency)}
                            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 shadow transition"
                          >
                            🩸 I CAN HELP
                          </button>

                          <button
                            type="button"
                            onClick={() => dismissEmergency(emergency.id)}
                            className="rounded-xl border border-border px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-muted transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* HOW IT WORKS */}
        <div className="mt-6 rounded-xl border border-border p-5 sm:p-6 bg-card shadow-sm">


          <h2 className="text-xl font-semibold">
            How LifelineX works
          </h2>

          <p className="mt-2 text-muted-foreground">
            When a blood emergency matches your
            blood group, LifelineX can notify you
            based on your opt-in preferences and
            the progressive search radius.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">

            <div className="rounded-lg border border-border p-3 text-center font-semibold">
              500 m
            </div>

            <div className="rounded-lg border border-border p-3 text-center font-semibold">
              1 km
            </div>

            <div className="rounded-lg border border-border p-3 text-center font-semibold">
              3 km
            </div>

            <div className="rounded-lg border border-border p-3 text-center font-semibold">
              Campus-wide
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}