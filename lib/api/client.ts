/**
 * LifelineX HTTP client.
 *
 * Single place where the frontend talks to your Express backend.
 * Set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:5000/api) and every
 * service in `lib/services/*` switches from mock data to live requests —
 * no component changes required.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

/** True while no backend is configured — services then serve mock data. */
export const USE_MOCKS =
  API_BASE_URL.length === 0

const TOKEN_KEY = "lifelinex.token"

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") {
    return
  }

  if (token) {
    window.localStorage.setItem(
      TOKEN_KEY,
      token,
    )
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type RequestOptions =
  Omit<RequestInit, "body"> & {
    body?: unknown

    /** Appended as a query string. */
    query?: Record<
      string,
      string | number | boolean | undefined
    >
  }

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
) {
  const base =
    API_BASE_URL.replace(/\/+$/, "")

  const requestPath =
    path.startsWith("/")
      ? path
      : `/${path}`

  /*
   * Support both:
   *
   * NEXT_PUBLIC_API_BASE_URL=""
   * + "/api/auth/login"
   *
   * and:
   *
   * NEXT_PUBLIC_API_BASE_URL="/api"
   * + "/api/auth/login"
   *
   * without producing:
   *
   * /api/api/auth/login
   */
  const normalizedPath =
    base.endsWith("/api") &&
      requestPath.startsWith("/api/")
      ? requestPath.slice(4)
      : requestPath

  const url =
    `${base}${normalizedPath}`

  if (!query) {
    return url
  }

  const params =
    new URLSearchParams()

  for (const [key, value] of Object.entries(
    query,
  )) {
    if (value !== undefined) {
      params.set(
        key,
        String(value),
      )
    }
  }

  const qs = params.toString()

  return qs
    ? `${url}?${qs}`
    : url
}

/**
 * Thin typed wrapper around fetch.
 * Expects your API routes to answer with
 * either the resource directly or `{ data, message }`.
 */
export async function apiRequest<T>(
  path: string,
  {
    body,
    query,
    headers,
    ...init
  }: RequestOptions = {},
): Promise<T> {
  const token = getToken()

  const response = await fetch(
    buildUrl(path, query),
    {
      ...init,

      headers: {
        "Content-Type":
          "application/json",

        ...(token
          ? {
            Authorization:
              `Bearer ${token}`,
          }
          : {}),

        ...headers,
      },

      ...(body === undefined
        ? {}
        : {
          body:
            JSON.stringify(body),
        }),
    },
  )

  const text =
    await response.text()

  let payload: any = null

  if (text.trim()) {
    try {
      payload =
        JSON.parse(text)
    } catch {
      if (!response.ok) {
        throw new ApiError(
          `Server returned a non-JSON response (HTTP ${response.status}). Check the Next.js terminal for the actual route error.`,
          response.status,
        )
      }

      throw new ApiError(
        "The server returned an invalid response. Check the Next.js terminal.",
        response.status,
      )
    }
  }

  if (!response.ok) {
    const message =
      (payload &&
        (
          payload.message ||
          payload.error
        )) ||
      `Request failed with status ${response.status}`

    throw new ApiError(
      message,
      response.status,
    )
  }

  return (
    payload &&
      typeof payload === "object" &&
      "data" in payload
      ? payload.data
      : payload
  ) as T
}

export const api = {
  get: <T>(
    path: string,
    options?: RequestOptions,
  ) =>
    apiRequest<T>(
      path,
      {
        ...options,
        method: "GET",
      },
    ),

  post: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    apiRequest<T>(
      path,
      {
        ...options,
        method: "POST",
        body,
      },
    ),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    apiRequest<T>(
      path,
      {
        ...options,
        method: "PATCH",
        body,
      },
    ),

  put: <T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    apiRequest<T>(
      path,
      {
        ...options,
        method: "PUT",
        body,
      },
    ),

  delete: <T>(
    path: string,
    options?: RequestOptions,
  ) =>
    apiRequest<T>(
      path,
      {
        ...options,
        method: "DELETE",
      },
    ),
}

/** Simulates network latency so loading states are exercised with mocks. */
export function mockDelay<T>(
  value: T,
  ms = 450,
): Promise<T> {
  return new Promise(
    (resolve) =>
      setTimeout(
        () => resolve(value),
        ms,
      ),
  )
}