import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SERVICE_URL = (process.env.SERVICE_URL ?? "http://localhost:8000").replace(/\/+$/, "")

export async function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const backendUrl = new URL(`${SERVICE_URL}/api/attendance/export`)

  // Pass through all query params to the backend export endpoint.
  reqUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value)
  })

  // Default to CSV since the UI advertises CSV export.
  if (!backendUrl.searchParams.get("format")) {
    backendUrl.searchParams.set("format", "pdf")
  }

  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value

  if (!authToken) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

  const resp = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  })

  // If backend returns an error, surface it as JSON so the browser doesn't treat it as a broken download.
  if (!resp.ok) {
    const contentType = resp.headers.get("content-type") ?? ""
    let message = `Export failed (${resp.status})`

    try {
      if (contentType.toLowerCase().includes("application/json")) {
        const payload = (await resp.json()) as any
        message = payload?.message || payload?.error || message
      } else {
        const text = await resp.text()
        if (text) message = text.slice(0, 500)
      }
    } catch {
      // ignore parse failures
    }

    return Response.json(
      { success: false, message },
      { status: resp.status, headers: { "Cache-Control": "no-store" } },
    )
  }

  // Stream the file back to the browser.
  const contentType = resp.headers.get("content-type") ?? "application/octet-stream"
  const disposition =
    resp.headers.get("content-disposition") ||
    `attachment; filename="attendance.${contentType.toLowerCase().includes("csv") ? "csv" : "pdf"}"`

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  })
}
