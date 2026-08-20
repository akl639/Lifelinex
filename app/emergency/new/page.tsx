"use client"

import { useEffect, useState } from "react"
import { VoiceCall } from "@/components/call/voice-call"
import { authService } from "@/lib/services/auth-service"
import type { User } from "@/lib/types"

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]

type ChatMessage = {
  id: string
  emergencyId: string
  senderId: string
  senderRole: "requester" | "donor"
  text: string
  createdAt: number
}

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

export default function NewEmergencyPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [requesterName, setRequesterName] = useState("")
  const [requesterPhone, setRequesterPhone] = useState("")
  const [requesterEmail, setRequesterEmail] = useState("")
  const [requesterAddress, setRequesterAddress] = useState("")

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await authService.me()
        setCurrentUser(user)
      } catch {
        setCurrentUser(null)
      }
    }

    loadUser()
  }, [])

  const [bloodGroup, setBloodGroup] = useState("O+")
  const [quantity, setQuantity] = useState("1")
  const [urgency, setUrgency] = useState("Critical")
  const [location, setLocation] = useState("")

  const [latitude, setLatitude] =
    useState<number | null>(null)
  const [longitude, setLongitude] =
    useState<number | null>(null)

  const [locationLoading, setLocationLoading] =
    useState(false)
  const [locationError, setLocationError] =
    useState("")
  const [pending, setPending] =
    useState(false)

  const [created, setCreated] =
    useState(false)
  const [requestId, setRequestId] =
    useState("")

  const [radius, setRadius] =
    useState("500 m")
  const [status, setStatus] = useState(
    "Searching for suitable donors...",
  )

  const [donorFound, setDonorFound] =
    useState(false)
  const [emergencyData, setEmergencyData] =
    useState<Emergency | null>(null)

  const [contactRequested, setContactRequested] =
    useState(false)

  const [contactLoading, setContactLoading] =
    useState(false)

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState("")
  const [chatSending, setChatSending] = useState(false)

  /*
   * Get requester's live location.
   */
  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location services.",
      )
      return
    }

    setLocationLoading(true)
    setLocationError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat =
          position.coords.latitude
        const lng =
          position.coords.longitude

        setLatitude(lat)
        setLongitude(lng)

        setLocation(
          `Current location (${lat.toFixed(
            5,
          )}, ${lng.toFixed(5)})`,
        )

        setLocationLoading(false)
      },
      (error) => {
        setLocationLoading(false)

        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setLocationError(
            "Location permission was denied. Please allow location access.",
          )
        } else {
          setLocationError(
            "Unable to get your current location. Please try again.",
          )
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  /*
   * Create emergency request.
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setLocationError("")

    if (!requesterName.trim()) {
      setLocationError("Please enter the patient / requester full name.")
      return
    }

    if (!requesterPhone.trim()) {
      setLocationError("Please enter a contact phone number.")
      return
    }

    if (!requesterEmail.trim()) {
      setLocationError("Please enter a contact email address.")
      return
    }

    if (!requesterAddress.trim()) {
      setLocationError("Please enter the complete patient / emergency address.")
      return
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setLocationError(
        "Please use your current location before creating the emergency request.",
      )
      return
    }

    setPending(true)

    try {
      const response = await fetch(
        "/api/emergency",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            requesterId: currentUser?.userId,
            requesterName: requesterName.trim(),
            requesterEmail: requesterEmail.trim(),
            requesterPhone: requesterPhone.trim(),
            requesterAddress: requesterAddress.trim(),
            patientName: requesterName.trim(),
            bloodGroup,
            quantity: Number(quantity),
            urgency,
            latitude,
            longitude,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Unable to create emergency request.",
        )
      }

      setRequestId(data.emergency.id)
      setEmergencyData(data.emergency)
      setCreated(true)
      setRadius("500 m")
      setStatus(
        "Searching suitable donors within 500 m...",
      )
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Unable to create emergency request.",
      )
    } finally {
      setPending(false)
    }
  }

  /*
   * Keep checking the emergency.
   *
   * This detects:
   * - donor acceptance
   * - donor location
   * - contact request
   * - contact acceptance
   */
  useEffect(() => {
    if (!created || !requestId) {
      return
    }

    async function checkEmergency() {
      try {
        const response = await fetch(
          `/api/emergency?emergencyId=${encodeURIComponent(requestId!)}&t=${Date.now()}`,
          {
            cache: "no-store",
          },
        )

        if (!response.ok) {
          return
        }

        const data = await response.json()

        const emergency =
          data.emergency ||
          data.emergencies?.find(
            (item: any) =>
              item.id === requestId ||
              item.emergencyId === requestId ||
              item.requestId === requestId,
          )

        if (!emergency) {
          return
        }

        setEmergencyData(emergency)

        /* Connection ended or donor disconnected: return to donor search */
        if (
          emergency.connectionStatus === "ended" ||
          !emergency.acceptedBy ||
          emergency.status !== "fulfilled"
        ) {
          setDonorFound(false)
          setContactRequested(false)
          setStatus(
            "Searching for donors in your campus vicinity...",
          )
        } else if (
          emergency.status === "fulfilled" &&
          emergency.acceptedBy &&
          emergency.connectionStatus === "connected"
        ) {
          setDonorFound(true)
          setStatus(
            "A donor has accepted your emergency request.",
          )

          /*
           * Contact request was successfully
           * stored on the server.
           */
          if (emergency.contactRequested) {
            setContactRequested(true)
          }
        }
      } catch {
        // Continue polling.
      }
    }

    checkEmergency()

    const interval = setInterval(
      checkEmergency,
      1500,
    )

    return () =>
      clearInterval(interval)
  }, [created, requestId])

  /*
   * Keep the patient's live location updated so the donor
   * can track the patient too.
   */
  useEffect(() => {
    if (
      !created ||
      !requestId ||
      latitude === null ||
      longitude === null
    ) {
      return
    }

    async function publishLocation(
      lat: number,
      lng: number,
    ) {
      try {
        await fetch("/api/emergency", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "requester-location-update",
            emergencyId: requestId,
            requesterId: "REQUESTER",
            latitude: lat,
            longitude: lng,
          }),
        })
      } catch {
        // Keep trying on the next location update.
      }
    }

    publishLocation(latitude, longitude)

    if (!navigator.geolocation) {
      return
    }

    const watchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const lat =
            position.coords.latitude
          const lng =
            position.coords.longitude

          setLatitude(lat)
          setLongitude(lng)

          publishLocation(lat, lng)
        },
        () => { },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        },
      )

    return () =>
      navigator.geolocation.clearWatch(
        watchId,
      )
  }, [created, requestId])

  /*
   * PRIVATE CHAT
   *
   * Chat is available after the donor has accepted
   * the protected contact request.
   */
  useEffect(() => {
    if (
      !requestId ||
      !emergencyData?.acceptedBy ||
      emergencyData.connectionStatus === "ended"
    ) {
      return
    }

    async function loadChat() {
      try {
        const response = await fetch(
          `/api/messages?emergencyId=${encodeURIComponent(
            requestId,
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
    requestId,
    emergencyData?.acceptedBy,
    emergencyData?.connectionStatus,
  ])

  async function sendChatMessage() {
    const text = chatText.trim()

    if (
      !text ||
      !requestId ||
      !emergencyData?.acceptedBy ||
      emergencyData.connectionStatus === "ended" ||
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
            emergencyId: requestId,
            senderId: "REQUESTER",
            senderRole: "requester",
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
   * Progressive donor search display.
   */
  useEffect(() => {
    if (!created || donorFound) {
      return
    }

    const timers = [
      setTimeout(() => {
        setRadius("1 km")
        setStatus(
          "Expanding donor search to 1 km...",
        )
      }, 3000),

      setTimeout(() => {
        setRadius("3 km")
        setStatus(
          "Expanding donor search to 3 km...",
        )
      }, 6000),

      setTimeout(() => {
        setRadius("Campus-wide")
        setStatus(
          "Campus-wide donor search active.",
        )
      }, 9000),
    ]

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [created, donorFound])

  /*
   * Calculate distance between requester
   * and donor.
   */
  function getDistanceInKm() {
    if (
      latitude === null ||
      longitude === null ||
      emergencyData?.donorLatitude ===
      undefined ||
      emergencyData?.donorLongitude ===
      undefined
    ) {
      return null
    }

    const earthRadius = 6371

    const dLat =
      ((emergencyData.donorLatitude -
        latitude) *
        Math.PI) /
      180

    const dLon =
      ((emergencyData.donorLongitude -
        longitude) *
        Math.PI) /
      180

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(
        (latitude * Math.PI) / 180,
      ) *
      Math.cos(
        (emergencyData.donorLatitude *
          Math.PI) /
        180,
      ) *
      Math.sin(dLon / 2) ** 2

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      )

    return earthRadius * c
  }

  /*
   * Open route from requester to donor.
   */
  function openMapsRoute() {
    if (
      latitude === null ||
      longitude === null ||
      emergencyData?.donorLatitude ===
      undefined ||
      emergencyData?.donorLongitude ===
      undefined
    ) {
      return
    }

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${latitude},${longitude}` +
      `&destination=${emergencyData.donorLatitude},${emergencyData.donorLongitude}`

    window.open(url, "_blank")
  }

  /*
   * DISCONNECT FROM DONOR
   */
  async function disconnectFromDonor() {
    if (!requestId) return

    const confirmed = window.confirm(
      "Are you sure you want to disconnect from this donor?",
    )
    if (!confirmed) return

    try {
      const response = await fetch("/api/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          emergencyId: requestId,
          requesterId: "REQUESTER",
          userId: "REQUESTER",
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to disconnect.")
      }
      setEmergencyData(data.emergency || null)
      setDonorFound(false)
      setContactRequested(false)
      setContactLoading(false)
      setChatMessages([])
      setChatText("")
      setRadius("500 m")
      setStatus("You disconnected from the donor. Searching for another donor...")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to disconnect from donor.")
    }
  }

  /*
   * CANCEL EMERGENCY REQUEST (PATIENT CANCELS)
   */
  async function cancelEmergencyRequest() {
    if (!requestId) return

    const confirmed = window.confirm(
      "Are you sure you want to cancel this emergency request? This will stop search alerts and end any active donor connections.",
    )
    if (!confirmed) return

    try {
      const response = await fetch("/api/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          emergencyId: requestId,
          requesterId: "REQUESTER",
          userId: "REQUESTER",
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to cancel emergency request.")
      }
      setCreated(false)
      setRequestId("")
      setDonorFound(false)
      setEmergencyData(null)
      setChatMessages([])
      setChatText("")
      setRadius("500 m")
      setStatus("Emergency request cancelled.")
      alert("Your emergency request has been cancelled.")
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to cancel emergency request.",
      )
    }
  }

  /*
   * REQUESTER -> DONOR
   *
   * This is the important fix.
   *
   * Previously this function only did:
   *
   * setContactRequested(true)
   *
   * Now it actually sends the request
   * to /api/emergency.
   */
  async function requestProtectedContact() {
    if (!requestId) {
      alert(
        "Emergency request ID is missing.",
      )
      return
    }

    setContactLoading(true)

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
            action:
              "contact-request",
            emergencyId: requestId,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Unable to send contact request.",
        )
      }

      /*
       * Update the local emergency with
       * the server response.
       */
      if (data.emergency) {
        setEmergencyData(
          data.emergency,
        )
      }

      setContactRequested(true)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to send contact request.",
      )
    } finally {
      setContactLoading(false)
    }
  }

  if (created) {
    const distance =
      getDistanceInKm()

    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-4xl">

          <h1 className="text-4xl font-bold">
            Emergency Request
          </h1>

          <p className="mt-3 text-muted-foreground">
            Request ID:{" "}
            <span className="font-mono font-semibold">
              {requestId}
            </span>
          </p>

          {donorFound ? (
            <div className="mt-8 rounded-xl border border-green-500/40 bg-green-500/10 p-6">

              {/* DONOR FOUND */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  🤝
                </span>

                <div>
                  <h2 className="text-2xl font-bold text-green-600">
                    Donor Found
                  </h2>

                  <p className="mt-1 text-muted-foreground">
                    A compatible donor has accepted
                    your emergency request.
                  </p>
                </div>
              </div>

              {/* DONOR DETAILS */}
              <div className="mt-6 rounded-xl border border-green-500/30 bg-background p-6">
                <h3 className="text-xl font-bold">
                  🤝 Connected With Donor
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Name
                    </p>
                    <p className="mt-1 font-semibold">
                      {emergencyData?.donorName ||
                        "LifelineX Donor"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      LifelineX ID
                    </p>
                    <p className="mt-1 font-mono font-semibold">
                      {emergencyData?.acceptedBy ||
                        "Unavailable"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Protected Contact
                    </p>
                    <p className="mt-1 font-mono font-semibold text-primary">
                      {emergencyData?.donorContactId ||
                        "Protected"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Privacy
                    </p>
                    <p className="mt-1 font-semibold text-green-600">
                      🔐 Phone & email protected
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  💬 Text chat is automatic. No contact request is needed
                  for messaging. 📞 Voice calls use a separate request
                  and acceptance step.
                </p>
              </div>

              {/* DONOR LOCATION */}
              <div className="mt-5 rounded-xl border border-primary/30 bg-background p-6">
                <h3 className="text-xl font-bold">
                  📍 Donor Location
                </h3>

                {emergencyData?.donorLatitude !== undefined &&
                  emergencyData?.donorLongitude !== undefined ? (
                  <>
                    <p className="mt-3 text-muted-foreground">
                      The donor's latest shared location:
                    </p>

                    <p className="mt-2 font-mono text-sm">
                      {emergencyData.donorLatitude.toFixed(5)},{" "}
                      {emergencyData.donorLongitude.toFixed(5)}
                    </p>

                    {distance !== null && (
                      <p className="mt-3 text-lg font-bold text-primary">
                        📏{" "}
                        {distance < 1
                          ? `${Math.round(
                            distance * 1000,
                          )} m away`
                          : `${distance.toFixed(
                            2,
                          )} km away`}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={openMapsRoute}
                      className="mt-5 w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
                    >
                      🗺️ Track / Navigate to Donor in Google Maps
                    </button>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Donor location updates while the donor keeps Live
                      Location enabled.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-muted-foreground">
                    Waiting for the donor's live location...
                  </p>
                )}
              </div>

              {/* AUTOMATIC PRIVATE CHAT */}
              <div className="mt-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                <h4 className="font-bold">
                  💬 Private LifelineX Chat
                </h4>

                <p className="mt-1 text-xs text-muted-foreground">
                  Chat opens automatically after the donor taps I CAN HELP.
                  No contact request is required for text.
                </p>

                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
                  <div className="max-h-80 min-h-40 space-y-3 overflow-y-auto p-4">
                    {chatMessages.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No messages yet. Start the conversation.
                      </p>
                    ) : (
                      chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderRole === "requester"
                            ? "justify-end"
                            : "justify-start"
                            }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.senderRole === "requester"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                              }`}
                          >
                            <p className="text-xs font-semibold opacity-70">
                              {message.senderRole === "requester"
                                ? "You"
                                : "Donor"}
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

              {/* VOICE CALL - SEPARATE REQUEST/ACCEPT FLOW */}
              {emergencyData?.connectionStatus === "connected" && (
                <VoiceCall
                  emergencyId={emergencyData.id}
                  userId="REQUESTER"
                  role="requester"
                  connected={true}
                />
              )}

              <button
                type="button"
                onClick={disconnectFromDonor}
                className="mt-5 w-full rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
              >
                🔴 Disconnect from Donor
              </button>

            </div>


          ) : (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6">

              <h2 className="text-xl font-bold">
                Request Active
              </h2>

              <p className="mt-2 text-muted-foreground">
                {status}
              </p>

              <p className="mt-4 text-4xl font-extrabold text-primary">
                {radius}
              </p>

            </div>
          )}

          {/* REQUEST DETAILS */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                Blood Group
              </p>

              <p className="mt-1 text-2xl font-bold">
                {bloodGroup}
              </p>
            </div>

            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                Quantity
              </p>

              <p className="mt-1 text-2xl font-bold">
                {quantity} unit(s)
              </p>
            </div>

            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                Urgency
              </p>

              <p className="mt-1 text-2xl font-bold">
                {urgency}
              </p>
            </div>

          </div>

          {/* REQUESTER LOCATION */}
          <div className="mt-6 rounded-xl border border-border p-6">

            <h2 className="text-xl font-semibold">
              📍 Emergency Location
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {location}
            </p>

          </div>

          {/* CANCEL EMERGENCY REQUEST */}
          <div className="mt-6">
            <button
              type="button"
              onClick={cancelEmergencyRequest}
              className="w-full rounded-xl border-2 border-red-500/40 bg-red-500/10 px-6 py-4 font-bold text-red-600 transition hover:bg-red-500/20 active:scale-[0.99] dark:text-red-400"
            >
              ❌ Cancel Emergency Request
            </button>
          </div>

        </div>
      </main>
    )
  }

  /*
   * CREATE EMERGENCY FORM
   */
  return (
    <main className="min-h-screen bg-background px-6 py-12">

      <div className="mx-auto max-w-4xl">

        <h1 className="text-4xl font-bold">
          Create Blood Emergency Request
        </h1>

        <p className="mt-3 text-muted-foreground">
          Request emergency blood support from
          opted-in campus donors.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-border bg-card p-6 space-y-6"
        >

          {/* SECTION 1: PATIENT / REQUESTER CONTACT DETAILS */}
          <div>
            <h2 className="text-lg font-bold text-foreground">
              👤 Patient / Requester Contact Details
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Provide the emergency contact details so donors can coordinate upon connection.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="requesterName"
                  className="text-sm font-medium"
                >
                  Full Name <span className="text-primary">*</span>
                </label>
                <input
                  id="requesterName"
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="e.g. Rajesh Kulkarni"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="requesterPhone"
                  className="text-sm font-medium"
                >
                  Contact Number <span className="text-primary">*</span>
                </label>
                <input
                  id="requesterPhone"
                  type="tel"
                  required
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="e.g. +91 98450 11223"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="requesterEmail"
                  className="text-sm font-medium"
                >
                  Email Address <span className="text-primary">*</span>
                </label>
                <input
                  id="requesterEmail"
                  type="email"
                  required
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="e.g. rajesh@gmail.com"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="requesterAddress"
                  className="text-sm font-medium"
                >
                  Complete Address <span className="text-primary">*</span>
                </label>
                <input
                  id="requesterAddress"
                  type="text"
                  required
                  value={requesterAddress}
                  onChange={(e) => setRequesterAddress(e.target.value)}
                  placeholder="e.g. 12 College Road, Central Health Centre, Trauma Bay 2"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* SECTION 2: EMERGENCY DETAILS */}
          <div>
            <h2 className="text-lg font-bold text-foreground">
              🩸 Emergency Blood Details
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Specify the blood requirement and live location for nearby donor matching.
            </p>

            <div className="mt-4 grid gap-6 sm:grid-cols-2">

              {/* BLOOD GROUP */}
              <div>
                <label
                  htmlFor="bloodGroup"
                  className="text-sm font-medium"
                >
                  Blood Group <span className="text-primary">*</span>
                </label>

                <select
                  id="bloodGroup"
                  value={bloodGroup}
                  onChange={(event) =>
                    setBloodGroup(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-semibold"
                >
                  {BLOOD_GROUPS.map(
                    (group) => (
                      <option
                        key={group}
                        value={group}
                      >
                        {group}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* QUANTITY */}
              <div>
                <label
                  htmlFor="quantity"
                  className="text-sm font-medium"
                >
                  Quantity Required (Units) <span className="text-primary">*</span>
                </label>

                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                  required
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-semibold"
                />
              </div>

              {/* URGENCY */}
              <div>
                <label
                  htmlFor="urgency"
                  className="text-sm font-medium"
                >
                  Urgency Level <span className="text-primary">*</span>
                </label>

                <select
                  id="urgency"
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-semibold"
                >
                  <option>
                    Critical
                  </option>
                  <option>
                    High
                  </option>
                  <option>
                    Normal
                  </option>
                </select>
              </div>

              {/* LOCATION */}
              <div>
                <label
                  htmlFor="location"
                  className="text-sm font-medium"
                >
                  Current GPS Location <span className="text-primary">*</span>
                </label>

                <input
                  id="location"
                  type="text"
                  value={location}
                  readOnly
                  placeholder="Click below to capture your GPS coordinates"
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
                />

                <button
                  type="button"
                  onClick={
                    getCurrentLocation
                  }
                  disabled={
                    locationLoading
                  }
                  className="mt-3 w-full rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  {locationLoading
                    ? "Capturing your GPS location..."
                    : "📍 Use My Current Location"}
                </button>

                {latitude !== null &&
                  longitude !== null && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      ✓ GPS coordinates captured ({latitude.toFixed(5)}, {longitude.toFixed(5)})
                    </p>
                  )}

                {locationError && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    ⚠️ {locationError}
                  </p>
                )}
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-8 w-full rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-md"
          >
            {pending
              ? "Broadcasting Emergency Request..."
              : "🚨 Create Blood Emergency Request"}
          </button>

        </form>

        {/* SEARCH INFORMATION */}
        <div className="mt-6 rounded-xl border border-border p-6">

          <h2 className="text-xl font-semibold">
            Progressive Donor Search
          </h2>

          <p className="mt-2 text-muted-foreground">
            LifelineX starts at 500 m and
            progressively expands to 1 km, 3 km,
            and campus-wide when suitable donor
            responses are insufficient.
          </p>

        </div>

      </div>

    </main>
  )
}