"use client"

import { useEffect, useRef, useState } from "react"

type Role = "requester" | "donor"

type Props = {
  emergencyId: string
  userId: string
  role: Role
  connected: boolean
}

type Signal = {
  id: string
  emergencyId: string
  senderId: string
  senderRole: Role
  type:
    | "call-request"
    | "call-accept"
    | "call-decline"
    | "offer"
    | "answer"
    | "ice-candidate"
    | "hangup"
  data?: any
  createdAt: number
}

export function VoiceCall({
  emergencyId,
  userId,
  role,
  connected,
}: Props) {
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSignalRef = useRef(0)
  const permissionAcceptedRef = useRef(false)
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)

  const [callRequested, setCallRequested] = useState(false)
  const [incomingRequest, setIncomingRequest] = useState(false)
  const [calling, setCalling] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState("")

  async function sendSignal(type: Signal["type"], data?: any) {
    await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emergencyId,
        senderId: userId,
        senderRole: role,
        type,
        data,
      }),
    })
  }

  async function createPeer() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    localStreamRef.current = stream

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    })

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream)
    })

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", event.candidate).catch(() => {})
      }
    }

    peer.ontrack = (event) => {
      if (audioRef.current && event.streams[0]) {
        audioRef.current.srcObject = event.streams[0]
        audioRef.current.play().catch(() => {})
      }
    }

    peerRef.current = peer
    return peer
  }

  async function requestCall() {
    try {
      setError("")
      setCallRequested(true)
      await sendSignal("call-request")
    } catch {
      setCallRequested(false)
      setError("Unable to request a voice call.")
    }
  }

  async function acceptCallRequest() {
    try {
      setError("")
      permissionAcceptedRef.current = true
      setIncomingRequest(false)
      await sendSignal("call-accept")

      if (pendingOfferRef.current) {
        await answerPendingOffer()
      }
    } catch {
      permissionAcceptedRef.current = false
      setError("Unable to accept the voice call.")
    }
  }

  async function answerPendingOffer() {
    const offer = pendingOfferRef.current
    if (!offer) return

    const peer = await createPeer()

    await peer.setRemoteDescription(
      new RTCSessionDescription(offer),
    )

    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    await sendSignal("answer", answer)

    pendingOfferRef.current = null
    setIncomingRequest(false)
    setInCall(true)
    setCalling(false)
  }

  async function declineCallRequest() {
    permissionAcceptedRef.current = false
    pendingOfferRef.current = null
    setIncomingRequest(false)

    try {
      await sendSignal("call-decline")
    } catch {}
  }

  async function createOffer() {
    try {
      setError("")
      setCalling(true)

      const peer = await createPeer()
      const offer = await peer.createOffer()

      await peer.setLocalDescription(offer)
      await sendSignal("offer", offer)

      setCalling(false)
    } catch {
      setCalling(false)
      setError("Microphone permission is required for the call.")
    }
  }

  async function handleSignal(signal: Signal) {
    if (signal.senderId === userId) return

    if (signal.type === "call-request") {
      setIncomingRequest(true)
      return
    }

    if (signal.type === "call-accept") {
      setCallRequested(false)
      await createOffer()
      return
    }

    if (signal.type === "call-decline") {
      setCallRequested(false)
      setCalling(false)
      setIncomingRequest(false)
      return
    }

    if (signal.type === "offer") {
      pendingOfferRef.current = signal.data

      if (permissionAcceptedRef.current) {
        await answerPendingOffer()
      } else {
        setIncomingRequest(true)
      }

      return
    }

    if (signal.type === "answer") {
      const peer = peerRef.current
      if (!peer) return

      await peer.setRemoteDescription(
        new RTCSessionDescription(signal.data),
      )

      setCalling(false)
      setInCall(true)
      return
    }

    if (signal.type === "ice-candidate") {
      const peer = peerRef.current
      if (!peer) return

      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(signal.data),
        )
      } catch {}
      return
    }

    if (signal.type === "hangup") {
      cleanup(false)
    }
  }

  async function pollSignals() {
    try {
      const response = await fetch(
        `/api/call?emergencyId=${encodeURIComponent(
          emergencyId,
        )}&after=${lastSignalRef.current}`,
        { cache: "no-store" },
      )

      if (!response.ok) return

      const data = await response.json()
      const received: Signal[] = data.signals || []

      for (const signal of received) {
        lastSignalRef.current = Math.max(
          lastSignalRef.current,
          signal.createdAt,
        )
        await handleSignal(signal)
      }
    } catch {}
  }

  async function endCall() {
    try {
      await sendSignal("hangup")
    } catch {}

    cleanup(false)
  }

  function cleanup(notifyPeer = false) {
    if (notifyPeer) {
      sendSignal("hangup").catch(() => {})
    }

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop())

    peerRef.current?.close()

    peerRef.current = null
    localStreamRef.current = null
    pendingOfferRef.current = null
    permissionAcceptedRef.current = false

    setCallRequested(false)
    setIncomingRequest(false)
    setCalling(false)
    setInCall(false)
    setMuted(false)
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) return

    const track = stream.getAudioTracks()[0]
    if (!track) return

    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }

  useEffect(() => {
    if (!connected) {
      cleanup(false)
      return
    }

    const timer = window.setInterval(pollSignals, 1000)

    return () => {
      window.clearInterval(timer)
      cleanup(false)
    }
  }, [connected, emergencyId, userId])

  if (!connected) return null

  return (
    <div className="mt-5 rounded-xl border-2 border-border bg-background p-5">
      <audio ref={audioRef} autoPlay />

      <h3 className="text-lg font-bold">
        📞 Private Voice Call
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Voice calls require the other person to accept the call request.
      </p>

      {!inCall &&
        !calling &&
        !callRequested &&
        !incomingRequest && (
          <button
            type="button"
            onClick={requestCall}
            className="mt-4 w-full rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            📞 Request Voice Call
          </button>
        )}

      {callRequested && !inCall && (
        <div className="mt-4 rounded-lg bg-primary/10 p-4">
          <p className="font-semibold">
            📞 Call request sent. Waiting for acceptance...
          </p>

          <button
            type="button"
            onClick={endCall}
            className="mt-3 rounded-lg border px-4 py-2"
          >
            Cancel Request
          </button>
        </div>
      )}

      {incomingRequest && !inCall && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="font-semibold">
            📞 Incoming LifelineX call request
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptCallRequest}
              className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white"
            >
              ✅ Accept Call
            </button>

            <button
              type="button"
              onClick={declineCallRequest}
              className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white"
            >
              ❌ Decline
            </button>
          </div>
        </div>
      )}

      {(calling || inCall) && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="font-semibold text-green-600">
            {calling ? "📞 Connecting..." : "🔊 Call connected"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg border px-4 py-2"
            >
              {muted ? "🎤 Unmute" : "🔇 Mute"}
            </button>

            <button
              type="button"
              onClick={endCall}
              className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
            >
              🔴 End Call
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}