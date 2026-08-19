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

        setUser(currentUser as User)
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
          "/api/emergency",
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
         * this donor's blood group.
         */
        const matching = all.filter(
          (item) =>
            item.status === "active" &&
            item.bloodGroup ===
              user.bloodGroup,
        )

        setEmergencies(matching)

        /*
         * Find the emergency accepted by
         * THIS donor.
         */
        const mine = all.find(
          (item) =>
            item.status === "fulfilled" &&
            item.acceptedBy ===
              user.userId,
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
          /* Connection was ended. */
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
      2000,
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
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <h1 className="text-4xl font-bold">
              LifelineX Donor Dashboard
            </h1>

            <p className="mt-3 text-muted-foreground">
              Welcome, {user.name}. You are
              registered as a blood donor.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-border px-5 py-3 font-semibold hover:bg-muted"
          >
            🚪 Logout
          </button>

        </div>

        {/* USER INFORMATION */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground">
              LifelineX ID
            </p>

            <p className="mt-2 font-mono text-xl font-bold">
              {user.userId}
            </p>
          </div>

          <div className="rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Blood Group
            </p>

            <p className="mt-2 text-3xl font-bold text-primary">
              {user.bloodGroup ||
                "Not available"}
            </p>
          </div>

          <div className="rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Account
            </p>

            <p className="mt-2 break-all font-semibold">
              {user.email}
            </p>
          </div>

        </div>

        {/* EMERGENCY ALERT STATUS */}
        <div className="mt-6 rounded-xl border border-border p-6">

          <h2 className="text-xl font-semibold">
            Emergency Alerts
          </h2>

          <p className="mt-2 text-green-600">
            ✓ Emergency donor alerts are enabled.
          </p>

        </div>

        {/* CONTACT REQUEST NOTIFICATION */}
        {contactRequest && (
          <div className="mt-6 rounded-xl border-2 border-primary bg-primary/10 p-6">

            <div className="flex gap-4">

              <div className="text-3xl">
                🔔
              </div>

              <div className="flex-1">

                <h2 className="text-2xl font-bold">
                  Contact Request
                </h2>

                <p className="mt-2 text-muted-foreground">
                  The emergency requester wants
                  to connect with you through
                  LifelineX.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">

                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">
                      Emergency ID
                    </p>

                    <p className="mt-1 font-mono font-bold">
                      {contactRequest.id}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">
                      Blood Group
                    </p>

                    <p className="mt-1 font-bold">
                      {contactRequest.bloodGroup}
                    </p>
                  </div>

                </div>

                {!contactAccepted ? (
                  <button
                    type="button"
                    onClick={
                      acceptContactRequest
                    }
                    className="mt-5 w-full rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
                  >
                    📞 Accept Protected Contact
                  </button>
                ) : (
                  <div className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 p-4">

                    <p className="font-semibold text-green-600">
                      ✓ Contact request accepted
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                      You are now connected with
                      the requester through
                      LifelineX.
                    </p>

                    <div className="mt-4 rounded-lg border border-border bg-background p-4">

                      <p className="text-sm text-muted-foreground">
                        Protected Contact ID
                      </p>

                      <p className="mt-1 font-mono font-bold text-primary">
                        {contactRequest.donorContactId ||
                          "Generating..."}
                      </p>

                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      🔐 Your personal phone number
                      and email address remain
                      private.
                    </p>

                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* PRIVATE CHAT - automatically visible after donor accepts */}
        {acceptedEmergency &&
          acceptedEmergency.acceptedBy &&
          acceptedEmergency.connectionStatus !== "ended" && (
            <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
              <h2 className="text-xl font-bold">
                💬 Private LifelineX Chat
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Chat is automatically available after you tap I CAN HELP.
                No contact request is required for text messages.
              </p>

              <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
                <div className="max-h-80 min-h-40 space-y-3 overflow-y-auto p-4">
                  {chatMessages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
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
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.senderRole === "donor"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-xs font-semibold opacity-70">
                            {message.senderRole === "donor"
                              ? "You"
                              : "Patient"}
                          </p>

                          <p className="mt-1 whitespace-pre-wrap break-words">
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
                  className="flex gap-2 border-t border-border p-3"
                >
                  <input
                    value={chatText}
                    onChange={(event) =>
                      setChatText(event.target.value)
                    }
                    placeholder="Type a message..."
                    maxLength={500}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    disabled={chatSending}
                  />

                  <button
                    type="submit"
                    disabled={!chatText.trim() || chatSending}
                    className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {chatSending ? "..." : "Send"}
                  </button>
                </form>
              </div>
            </div>
          )}

        {/* PRIVATE VOICE CALL */}
        {acceptedEmergency &&
          acceptedEmergency.connectionStatus === "connected" &&
          user && (
          <VoiceCall
            emergencyId={acceptedEmergency.id}
            userId={user.userId}
            role="donor"
            connected={acceptedEmergency.connectionStatus === "connected"}
          />
        )}

        {/* PATIENT LIVE LOCATION */}
        {acceptedEmergency &&
          acceptedEmergency.connectionStatus === "connected" && (
            <div className="mt-6 rounded-xl border border-primary/30 p-6">
              <h2 className="text-xl font-bold">
                📍 Patient Live Location
              </h2>

              {acceptedEmergency.requesterLatitude !== undefined &&
              acceptedEmergency.requesterLongitude !== undefined ? (
                <>
                  <p className="mt-3 font-mono text-sm">
                    {acceptedEmergency.requesterLatitude.toFixed(5)},{" "}
                    {acceptedEmergency.requesterLongitude.toFixed(5)}
                  </p>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${acceptedEmergency.requesterLatitude},${acceptedEmergency.requesterLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 block w-full rounded-lg bg-primary px-6 py-3 text-center font-semibold text-primary-foreground hover:opacity-90"
                  >
                    🗺️ Track / Navigate to Patient in Google Maps
                  </a>

                  <p className="mt-3 text-xs text-muted-foreground">
                    The patient location updates while the patient keeps Live
                    Location enabled.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-muted-foreground">
                  Waiting for the patient's live location...
                </p>
              )}
            </div>
          )}

        {/* LIVE LOCATION */}
        <div className="mt-6 rounded-xl border border-border p-6">

          <h2 className="text-xl font-semibold">
            📍 Live Location Sharing
          </h2>

          <p className="mt-2 text-muted-foreground">
            Share your current location voluntarily
            so LifelineX can help coordinate nearby
            emergencies.
          </p>

          <button
            type="button"
            onClick={toggleLocation}
            className="mt-5 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            {locationSharing
              ? "Turn Off Live Location"
              : "📍 Share My Live Location"}
          </button>

          {locationSharing &&
            location && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">

                <p className="font-semibold text-green-600">
                  ✓ Live location sharing is ON
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Location:{" "}
                  {location.latitude.toFixed(
                    5,
                  )}
                  ,{" "}
                  {location.longitude.toFixed(
                    5,
                  )}
                </p>

              </div>
            )}

          {locationError && (
            <p className="mt-4 text-sm text-red-500">
              {locationError}
            </p>
          )}

        </div>

        {/* ACCEPTED REQUEST */}
        {acceptedEmergency && (
          <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 p-6">

            <h2 className="text-xl font-bold text-green-600">
              ✓ You are responding
            </h2>

            <p className="mt-2 text-muted-foreground">
              Emergency{" "}
              {acceptedEmergency.id} has been
              assigned to you.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">

              <div>
                <p className="text-sm text-muted-foreground">
                  Blood Group
                </p>

                <p className="font-bold">
                  {acceptedEmergency.bloodGroup}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Quantity
                </p>

                <p className="font-bold">
                  {acceptedEmergency.quantity}{" "}
                  unit(s)
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Urgency
                </p>

                <p className="font-bold">
                  {acceptedEmergency.urgency}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() => disconnectEmergency(acceptedEmergency.id)}
              className="mt-5 w-full rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              🔴 Disconnect from Emergency
            </button>

          </div>
        )}

        {/* EMERGENCY ALERTS */}
        <div className="mt-6 rounded-xl border border-border p-6">

          <h2 className="text-xl font-semibold">
            🚨 Emergency Alerts
          </h2>

          {emergencies.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              No matching emergency requests
              at the moment.
            </p>
          ) : (
            <div className="mt-5 space-y-4">

              {emergencies.map(
                (emergency) => {

                  let distance: number | null =
                    null

                  if (location) {
                    distance =
                      calculateDistance(
                        location.latitude,
                        location.longitude,
                        emergency.latitude,
                        emergency.longitude,
                      )
                  }

                  return (
                    <div
                      key={emergency.id}
                      className="rounded-xl border border-red-500/40 bg-red-500/5 p-5"
                    >

                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="font-bold">
                            🚨 Emergency Request
                          </p>

                          <p className="mt-1 text-2xl font-extrabold text-primary">
                            {emergency.bloodGroup}
                          </p>

                          <p className="mt-2 text-sm text-muted-foreground">
                            Request ID:{" "}
                            {emergency.id}
                          </p>

                          <p className="text-sm text-muted-foreground">
                            Quantity:{" "}
                            {emergency.quantity}{" "}
                            unit(s)
                          </p>

                          <p className="text-sm text-muted-foreground">
                            Urgency:{" "}
                            {emergency.urgency}
                          </p>

                          {distance !==
                            null && (
                            <p className="mt-2 font-semibold">
                              📏{" "}
                              {distance <
                              1
                                ? `${Math.round(
                                    distance *
                                      1000,
                                  )} m away`
                                : `${distance.toFixed(
                                    2,
                                  )} km away`}
                            </p>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            acceptEmergency(
                              emergency,
                            )
                          }
                          className="rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
                        >
                          I CAN HELP
                        </button>

                      </div>

                    </div>
                  )
                },
              )}

            </div>
          )}

        </div>

        {/* HOW IT WORKS */}
        <div className="mt-6 rounded-xl border border-border p-6">

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