"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { CallSignalType } from "@/app/api/call/route"

type Role = "requester" | "donor"

type Props = {
  emergencyId: string
  userId: string
  role: Role
  connected: boolean
}

type Signal = {
  id: string
  callId?: string
  emergencyId: string
  senderId: string
  senderRole: Role
  type: CallSignalType
  data?: any
  createdAt: number
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
}

export function VoiceCall({
  emergencyId,
  userId,
  role,
  connected,
}: Props) {
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const activeCallIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef(false)
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  const processedSignalIdsRef = useRef<Set<string>>(new Set())
  const endedCallIdsRef = useRef<Set<string>>(new Set())
  const lastSignalRef = useRef(0)
  const isEndingRef = useRef(false)

  const [callRequested, setCallRequested] = useState(false)
  const [incomingRequest, setIncomingRequest] = useState(false)
  const [calling, setCalling] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")

  // Send signaling messages via MongoDB API
  const sendSignal = useCallback(
    async (type: CallSignalType, data?: any, explicitCallId?: string) => {
      if (!emergencyId) return null
      const callIdToSend = explicitCallId || activeCallIdRef.current || ""
      try {
        const res = await fetch("/api/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emergencyId,
            senderId: userId,
            senderRole: role,
            callId: callIdToSend,
            type,
            data,
          }),
        })
        if (res.ok) {
          const result = await res.json()
          if (result.callId && !activeCallIdRef.current) {
            activeCallIdRef.current = result.callId
          }
          return result
        }
      } catch (err) {
        console.warn("Signal send error:", err)
      }
      return null
    },
    [emergencyId, userId, role],
  )

  // Clean up WebRTC peer connection, media tracks, and reset state
  const cleanup = useCallback(
    (notifyPeer = false, statusMsg = "Call ended") => {
      const callIdToClose = activeCallIdRef.current
      if (callIdToClose) {
        endedCallIdsRef.current.add(callIdToClose)
      }

      if (notifyPeer && !isEndingRef.current) {
        isEndingRef.current = true
        sendSignal("hangup", null, callIdToClose || undefined).catch(() => {})
      }

      // Stop all microphone tracks cleanly
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {}
        })
        localStreamRef.current = null
      }

      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {}
        })
        remoteStreamRef.current = null
      }

      if (audioRef.current) {
        audioRef.current.srcObject = null
      }

      if (peerRef.current) {
        try {
          peerRef.current.onconnectionstatechange = null
          peerRef.current.oniceconnectionstatechange = null
          peerRef.current.onicecandidate = null
          peerRef.current.ontrack = null
          peerRef.current.close()
        } catch {}
        peerRef.current = null
      }

      candidateQueueRef.current = []
      activeCallIdRef.current = null
      isInitiatorRef.current = false
      isEndingRef.current = false

      setCallRequested(false)
      setIncomingRequest(false)
      setCalling(false)
      setInCall(false)
      setMuted(false)
      setSpeakerMuted(false)
      setCallDuration(0)
      if (statusMsg) {
        setStatusMessage(statusMsg)
      }
    },
    [sendSignal],
  )

  // Create RTCPeerConnection with local microphone stream
  const createPeer = useCallback(async () => {
    // If an existing open connection is in place, clean it up before creating new
    if (peerRef.current) {
      try {
        peerRef.current.onconnectionstatechange = null
        peerRef.current.oniceconnectionstatechange = null
        peerRef.current.onicecandidate = null
        peerRef.current.ontrack = null
        peerRef.current.close()
      } catch {}
      peerRef.current = null
    }

    let stream = localStreamRef.current
    if (!stream || stream.getAudioTracks().length === 0 || !stream.active) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })
        localStreamRef.current = stream
      } catch (err) {
        throw new Error(
          "Microphone permission denied or unavailable. Please allow microphone access to talk.",
        )
      }
    }

    const peer = new RTCPeerConnection(ICE_SERVERS)

    // Add local audio tracks to peer connection
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true
      peer.addTrack(track, stream!)
    })

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(
          "ice-candidate",
          event.candidate.toJSON(),
          activeCallIdRef.current || undefined,
        ).catch(() => {})
      }
    }

    // Handle incoming remote audio stream
    peer.ontrack = (event) => {
      console.log("WebRTC remote audio stream received:", event)
      let remoteStream = event.streams && event.streams[0]
      if (!remoteStream) {
        remoteStream = new MediaStream([event.track])
      }
      remoteStreamRef.current = remoteStream

      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream
        audioRef.current.muted = false
        audioRef.current.volume = 1.0
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.warn("Audio autoplay play caught:", playErr)
          })
        }
      }
    }

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState
      console.log("WebRTC connectionState:", state)
      if (state === "connected") {
        setCalling(false)
        setInCall(true)
        setStatusMessage("Call Connected - Audio Live")
      } else if (state === "failed") {
        console.warn("WebRTC connection failed.")
        cleanup(true, "Call connection failed")
      }
    }

    peer.oniceconnectionstatechange = () => {
      const iceState = peer.iceConnectionState
      console.log("WebRTC iceConnectionState:", iceState)
      if (iceState === "connected" || iceState === "completed") {
        setCalling(false)
        setInCall(true)
        setStatusMessage("Call Connected - Audio Live")
      } else if (iceState === "failed") {
        console.warn("WebRTC ICE connection failed.")
        cleanup(true, "Call connection failed")
      }
    }

    peerRef.current = peer
    return peer
  }, [sendSignal, cleanup])

  // 1. Caller clicks "Request Voice Call"
  const requestCall = async () => {
    try {
      setError("")
      setStatusMessage("Calling... Waiting for answer")
      setCallRequested(true)
      isInitiatorRef.current = true

      const newCallId = `CALL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      activeCallIdRef.current = newCallId
      lastSignalRef.current = Date.now() - 2000

      // Acquire microphone inside the user interaction event
      await createPeer()

      await sendSignal("call-request", null, newCallId)
    } catch (err) {
      setCallRequested(false)
      isInitiatorRef.current = false
      activeCallIdRef.current = null
      setError(
        err instanceof Error ? err.message : "Unable to request voice call.",
      )
    }
  }

  // 2. Receiver clicks "Accept Call"
  const acceptCallRequest = async () => {
    try {
      setError("")
      setIncomingRequest(false)
      setCalling(true)
      setStatusMessage("Connecting audio...")

      const currentCallId = activeCallIdRef.current
      if (!currentCallId) {
        throw new Error("No active call session.")
      }

      // Acquire microphone inside the user interaction event
      await createPeer()

      // Notify caller that call was accepted
      await sendSignal("call-accept", null, currentCallId)
    } catch (err) {
      setIncomingRequest(false)
      setCalling(false)
      setError(err instanceof Error ? err.message : "Unable to accept call.")
    }
  }

  // 3. Receiver clicks "Decline Call"
  const declineCallRequest = async () => {
    const currentCallId = activeCallIdRef.current
    setIncomingRequest(false)
    setStatusMessage("Call declined")
    try {
      await sendSignal("call-decline", null, currentCallId || undefined)
    } catch {}
    cleanup(false, "Call declined")
  }

  // Caller creates WebRTC Offer after call-accept
  const createAndSendOffer = async () => {
    try {
      setCalling(true)
      setStatusMessage("Establishing voice connection...")
      let peer = peerRef.current
      if (!peer || peer.signalingState === "closed") {
        peer = await createPeer()
      }

      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
      })

      await peer.setLocalDescription(offer)
      await sendSignal(
        "offer",
        { type: offer.type, sdp: offer.sdp },
        activeCallIdRef.current || undefined,
      )
    } catch (err) {
      cleanup(true, "Failed to start audio call")
      setError(
        err instanceof Error ? err.message : "Failed to start audio call.",
      )
    }
  }

  // Receiver creates WebRTC Answer upon receiving Offer
  const handleOffer = async (offerData: RTCSessionDescriptionInit) => {
    try {
      setCalling(true)
      setStatusMessage("Connecting audio...")
      let peer = peerRef.current
      if (!peer || peer.signalingState === "closed") {
        peer = await createPeer()
      }

      // If peer is not in stable state, handle rollback
      if (peer.signalingState !== "stable") {
        try {
          await Promise.all([
            peer.setLocalDescription({ type: "rollback" }),
            peer.setRemoteDescription(new RTCSessionDescription(offerData)),
          ])
        } catch {
          await peer.setRemoteDescription(new RTCSessionDescription(offerData))
        }
      } else {
        await peer.setRemoteDescription(new RTCSessionDescription(offerData))
      }

      // Process any early queued ICE candidates
      while (candidateQueueRef.current.length > 0) {
        const candidate = candidateQueueRef.current.shift()
        if (candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.warn("Error adding queued ICE candidate:", e)
          }
        }
      }

      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      await sendSignal(
        "answer",
        { type: answer.type, sdp: answer.sdp },
        activeCallIdRef.current || undefined,
      )
    } catch (err) {
      cleanup(true, "Failed to establish voice call")
      setError(
        err instanceof Error ? err.message : "Failed to establish voice call.",
      )
    }
  }

  // Caller receives Answer from Receiver
  const handleAnswer = async (answerData: RTCSessionDescriptionInit) => {
    const peer = peerRef.current
    if (!peer || peer.signalingState === "closed") return

    try {
      if (peer.signalingState === "have-local-offer") {
        await peer.setRemoteDescription(new RTCSessionDescription(answerData))

        // Process any early queued ICE candidates
        while (candidateQueueRef.current.length > 0) {
          const candidate = candidateQueueRef.current.shift()
          if (candidate) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.warn("Error adding queued ICE candidate:", e)
            }
          }
        }

        setCalling(false)
        setInCall(true)
        setStatusMessage("Call Connected - Audio Live")
      }
    } catch (err) {
      console.warn("Error setting remote description from answer:", err)
    }
  }

  // Handle incoming ICE Candidate
  const handleIceCandidate = async (candidateData: RTCIceCandidateInit) => {
    const peer = peerRef.current
    if (peer && peer.remoteDescription && peer.remoteDescription.type) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidateData))
      } catch (err) {
        console.warn("Error adding ICE candidate:", err)
      }
    } else {
      // Queue until remote description is ready
      candidateQueueRef.current.push(candidateData)
    }
  }

  // Process incoming signaling messages
  const handleSignal = async (signal: Signal) => {
    // Ignore signals sent by ourselves
    if (signal.senderRole === role || signal.senderId === userId) return

    // Avoid reprocessing same signal
    if (signal.id && processedSignalIdsRef.current.has(signal.id)) return
    if (signal.id) {
      processedSignalIdsRef.current.add(signal.id)
    }

    // Ignore signals for calls that have already ended
    if (signal.callId && endedCallIdsRef.current.has(signal.callId)) {
      return
    }

    if (signal.type === "call-request") {
      if (inCall || calling) return
      if (signal.callId) {
        activeCallIdRef.current = signal.callId
      }
      setIncomingRequest(true)
      setStatusMessage("Incoming voice call...")
      return
    }

    // Check callId match for call-specific signals
    if (
      signal.callId &&
      activeCallIdRef.current &&
      signal.callId !== activeCallIdRef.current
    ) {
      return
    }

    if (signal.type === "call-accept") {
      setCallRequested(false)
      if (isInitiatorRef.current) {
        await createAndSendOffer()
      }
      return
    }

    if (signal.type === "call-decline") {
      if (signal.callId) {
        endedCallIdsRef.current.add(signal.callId)
      }
      setCallRequested(false)
      setCalling(false)
      setIncomingRequest(false)
      cleanup(false, "The other person declined the call.")
      return
    }

    if (signal.type === "offer") {
      setCallRequested(false)
      if (signal.callId && !activeCallIdRef.current) {
        activeCallIdRef.current = signal.callId
      }
      await handleOffer(signal.data)
      return
    }

    if (signal.type === "answer") {
      await handleAnswer(signal.data)
      return
    }

    if (signal.type === "ice-candidate") {
      await handleIceCandidate(signal.data)
      return
    }

    if (signal.type === "hangup" || signal.type === "call-failed") {
      if (signal.callId) {
        endedCallIdsRef.current.add(signal.callId)
      }
      cleanup(false, "The call was ended.")
    }
  }

  // Poll signaling messages every 1 second
  useEffect(() => {
    if (!connected || !emergencyId) {
      cleanup(false)
      return
    }

    let isMounted = true

    async function pollSignals() {
      if (!isMounted || !connected) return

      try {
        const callIdParam = activeCallIdRef.current
          ? `&callId=${encodeURIComponent(activeCallIdRef.current)}`
          : ""
        const response = await fetch(
          `/api/call?emergencyId=${encodeURIComponent(emergencyId)}&after=${lastSignalRef.current}${callIdParam}&t=${Date.now()}`,
          { cache: "no-store" },
        )

        if (!response.ok) return

        const data = await response.json()
        const received: Signal[] = data.signals || []

        for (const signal of received) {
          if (!isMounted) break
          lastSignalRef.current = Math.max(
            lastSignalRef.current,
            signal.createdAt,
          )
          await handleSignal(signal)
        }
      } catch {}
    }

    const timer = setInterval(pollSignals, 1000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [connected, emergencyId, userId, role])

  // Call duration timer
  useEffect(() => {
    if (!inCall) {
      setCallDuration(0)
      return
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [inCall])

  // Controls: Mute Microphone ON / OFF
  const toggleMute = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks()
      if (tracks.length > 0) {
        const nextMuted = !muted
        tracks.forEach((t) => {
          t.enabled = !nextMuted
        })
        setMuted(nextMuted)
      }
    }
  }

  // Controls: Speaker ON / OFF
  const toggleSpeaker = () => {
    if (audioRef.current) {
      const nextSpeakerMuted = !speakerMuted
      audioRef.current.muted = nextSpeakerMuted
      setSpeakerMuted(nextSpeakerMuted)
    }
  }

  // Controls: End Call
  const handleEndCall = () => {
    cleanup(true, "Call ended")
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!connected) return null

  return (
    <div className="mt-4 sm:mt-5 rounded-2xl border-2 border-border bg-card p-4 sm:p-5 shadow-sm">
      {/* Audio element off-screen for clean remote stream playback */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        className="sr-only"
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">📞</span>
          <h3 className="font-bold text-sm sm:text-base md:text-lg">
            Emergency Voice Call
          </h3>
        </div>

        {inCall && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
            <span className="font-mono text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
              {formatTime(callDuration)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
        Live browser-to-browser voice call over encrypted WebRTC connection.
      </p>

      {/* IDLE STATE: Request Voice Call button */}
      {!inCall && !calling && !callRequested && !incomingRequest && (
        <button
          type="button"
          onClick={requestCall}
          className="mt-3 sm:mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm md:text-base font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.99]"
        >
          <span>📞</span>
          <span>
            Start Voice Call with {role === "donor" ? "Patient" : "Donor"}
          </span>
        </button>
      )}

      {/* CALL REQUESTED (OUTGOING) */}
      {callRequested && !inCall && (
        <div className="mt-3 sm:mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 animate-ping rounded-full bg-primary" />
            <p className="font-semibold text-xs sm:text-sm">
              Calling {role === "donor" ? "Patient" : "Donor"}... Waiting for answer
            </p>
          </div>

          <button
            type="button"
            onClick={handleEndCall}
            className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-muted"
          >
            Cancel Call
          </button>
        </div>
      )}

      {/* INCOMING CALL DIALOG */}
      {incomingRequest && !inCall && (
        <div className="mt-3 sm:mt-4 rounded-xl border-2 border-green-500/50 bg-green-500/10 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 animate-bounce rounded-full bg-green-500" />
            <p className="font-bold text-xs sm:text-sm text-green-700 dark:text-green-300">
              📞 Incoming Voice Call from {role === "donor" ? "Patient" : "Donor"}
            </p>
          </div>

          <div className="mt-3 flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={acceptCallRequest}
              className="flex-1 rounded-xl bg-green-600 px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-white shadow transition hover:bg-green-700 active:scale-[0.98] text-xs sm:text-sm min-h-[44px]"
            >
              ✅ Accept
            </button>

            <button
              type="button"
              onClick={declineCallRequest}
              className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-white shadow transition hover:bg-red-700 active:scale-[0.98] text-xs sm:text-sm min-h-[44px]"
            >
              ❌ Decline
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE CALL / CONNECTING STATE */}
      {(calling || inCall) && (
        <div className="mt-3 sm:mt-4 rounded-xl border border-green-500/40 bg-green-500/10 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  inCall ? "animate-pulse bg-green-500" : "bg-amber-500"
                }`}
              />
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                {calling ? "Connecting voice stream..." : "Voice Call Active"}
              </p>
            </div>

            {inCall && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300">
                Live
              </span>
            )}
          </div>

          {/* Call Action Controls - Mobile-friendly & responsive grid */}
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`flex flex-col items-center justify-center rounded-xl border p-2 sm:p-2.5 text-[11px] sm:text-xs font-semibold transition min-h-[56px] sm:min-h-[64px] ${
                muted
                  ? "border-red-500 bg-red-500/15 text-red-600 dark:text-red-400"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <span className="text-base sm:text-lg">{muted ? "🔇" : "🎤"}</span>
              <span className="mt-1 leading-tight">{muted ? "Unmute" : "Mute"}</span>
            </button>

            <button
              type="button"
              onClick={toggleSpeaker}
              className={`flex flex-col items-center justify-center rounded-xl border p-2 sm:p-2.5 text-[11px] sm:text-xs font-semibold transition min-h-[56px] sm:min-h-[64px] ${
                speakerMuted
                  ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <span className="text-base sm:text-lg">{speakerMuted ? "🔈" : "🔊"}</span>
              <span className="mt-1 leading-tight">
                {speakerMuted ? "Speaker Off" : "Speaker On"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="flex flex-col items-center justify-center rounded-xl bg-red-600 p-2 sm:p-2.5 text-[11px] sm:text-xs font-bold text-white shadow transition hover:bg-red-700 active:scale-[0.98] min-h-[56px] sm:min-h-[64px]"
            >
              <span className="text-base sm:text-lg">🔴</span>
              <span className="mt-1 leading-tight">End Call</span>
            </button>
          </div>
        </div>
      )}

      {statusMessage &&
        !inCall &&
        !calling &&
        !callRequested &&
        !incomingRequest && (
          <p className="mt-2 text-xs text-muted-foreground">{statusMessage}</p>
        )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs font-medium text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}