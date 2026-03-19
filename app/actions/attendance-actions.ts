"use server"

import { cookies } from "next/headers"
import { getUserProfile } from "./auth-actions"
import type { AttendanceRecord } from "@/app/types"

interface FingerprintStudent {
  name: string
  rollNumber: string
  fingerprintId: string
}

type AbsenceStatus = "absent" | "leave"

interface BackendResponse<T = unknown> {
  success?: boolean
  message?: string
  error?: string
  data?: T
}

const SERVICE_URL = (process.env.SERVICE_URL ?? "http://localhost:8000").replace(/\/+$/, "")

const FINGERPRINT_ROSTER_PATH = process.env.FINGERPRINT_ROSTER_PATH ?? "/api/attendance/fingerprint-roster"
const MARK_FINGERPRINT_PATH = process.env.MARK_FINGERPRINT_PATH ?? "/api/attendance/fingerprint/mark"
const TEACHER_ABSENTEES_PATH = process.env.TEACHER_ABSENTEES_PATH ?? "/api/attendance/teacher/absentees"
const STUDENT_ABSENTEEISM_PATH = process.env.STUDENT_ABSENTEEISM_PATH ?? "/api/attendance/student/absenteeism"
const STUDENT_HISTORY_PATH = process.env.STUDENT_HISTORY_PATH ?? "/api/attendance/student/history"
const TEACHER_RECORDS_PATH = process.env.TEACHER_RECORDS_PATH ?? "/api/attendance/teacher/records"
const EXPORT_ATTENDANCE_PATH = process.env.EXPORT_ATTENDANCE_PATH ?? "/api/attendance/export"
const SET_ABSENCE_STATUS_PATH = process.env.SET_ABSENCE_STATUS_PATH ?? "/api/attendance/absence-status"

const USE_MOCK_DATA =
  (process.env.USE_MOCK_DATA ?? process.env.NEXT_PUBLIC_USE_MOCK_DATA ?? "").toString().toLowerCase() === "true"

function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SERVICE_URL}${normalizedPath}`
}

function buildMockAttendanceRecords(): AttendanceRecord[] {
  const subject = "ANIME"
  const teacherEmail = "teacher@example.com"
  const students: Record<string, string> = {
    "1": "Shinn Khant Aung",
    "2": "Swan Pyae",
    "3": "Myat thu Kha",
    "4": "Thet Myat Noe",
  }

  const rows = [
    { id: 23, studentId: "4", date: "2026-03-11", time: "20:31:04", status: "present" },
    { id: 24, studentId: "1", date: "2026-03-12", time: "00:09:17", status: "present" },
    { id: 25, studentId: "2", date: "2026-03-12", time: "13:46:29", status: "present" },
    { id: 26, studentId: "3", date: "2026-03-14", time: "19:51:00", status: "present" },
    { id: 27, studentId: "4", date: "2026-03-14", time: "19:51:17", status: "present" },
    { id: 28, studentId: "2", date: "2026-03-14", time: "20:08:41", status: "present" },
    { id: 29, studentId: "3", date: "2026-03-16", time: "15:38:27", status: "late" },
    { id: 30, studentId: "4", date: "2026-03-16", time: "15:40:44", status: "present" },
    { id: 31, studentId: "2", date: "2026-03-16", time: "15:40:51", status: "present" },
    { id: 32, studentId: "2", date: "2026-03-18", time: "10:00:48", status: "present" },
    { id: 33, studentId: "3", date: "2026-03-18", time: "10:02:28", status: "present" },
    { id: 34, studentId: "1", date: "2026-03-18", time: "10:05:42", status: "present" },
    { id: 35, studentId: "4", date: "2026-03-18", time: "10:36:56", status: "present" },
  ] as const

  return rows.map((row) => ({
    id: row.id,
    studentName: students[row.studentId] ?? `Student ${row.studentId}`,
    rollNumber: row.studentId,
    subject,
    teacherEmail,
    date: `${row.date}T${row.time}`,
    status: row.status as AttendanceRecord["status"],
  }))
}

function pickData<T>(payload: any): T {
  const direct =
    payload?.data ??
    payload?.records ??
    payload?.result ??
    payload?.items ??
    payload?.attendances ??
    payload?.attendance ??
    payload?.history ??
    payload?.rows

  if (direct !== undefined) {
    if (Array.isArray(direct)) {
      return direct as T
    }
    if (direct && typeof direct === "object") {
      const nestedArray = Object.values(direct).find((value) => Array.isArray(value))
      if (nestedArray) {
        return nestedArray as T
      }
      return [direct] as T
    }
    return [] as T
  }

  if (Array.isArray(payload)) {
    return payload as T
  }

  if (payload && typeof payload === "object") {
    const firstArray = Object.values(payload).find((value) => Array.isArray(value))
    if (firstArray) {
      return firstArray as T
    }
  }

  return [] as T
}

async function callBackend<T>({
  paths,
  method = "GET",
  body,
}: {
  paths: string[]
  method?: "GET" | "POST"
  body?: unknown
}): Promise<{ success: true; data: T; message?: string } | { success: false; error: string }> {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  let lastError = "Backend request failed"

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    })

    let payload: BackendResponse<T> | null = null
    try {
      payload = (await response.json()) as BackendResponse<T>
    } catch {
      payload = null
    }

    if (response.status === 400 || response.status === 404 || response.status === 405 || response.status === 415 || response.status === 422) {
      continue
    }

    const routeMissingMessage = `${payload?.message ?? ""} ${payload?.error ?? ""}`.toLowerCase()
    if (routeMissingMessage.includes("route not found") || routeMissingMessage.includes("not found")) {
      continue
    }

    if (response.ok && payload?.success !== false) {
      return {
        success: true,
        data: pickData<T>(payload),
        message: payload?.message,
      }
    }

    lastError = payload?.message || payload?.error || `Backend request failed (${response.status})`
  }

  return { success: false, error: lastError }
}

function mapAttendanceRecord(item: any, index: number): AttendanceRecord {
  const rawStatus = String(item?.status ?? "present")
    .trim()
    .toLowerCase()
  const normalizedStatus: AttendanceRecord["status"] =
    rawStatus === "serious late" || rawStatus === "serious_late" || rawStatus === "serious-late"
      ? "serious late"
      : rawStatus === "absent"
        ? "absent"
      : rawStatus === "late"
        ? "late"
        : "present"

  const subject =
    item?.subject ??
    item?.subject_name ??
    item?.courseName ??
    item?.course_name ??
    item?.course?.name ??
    item?.course_title ??
    (item?.course_id ? String(item.course_id) : "")

  const baseDate = item?.date ?? item?.check_date ?? item?.created_at ?? ""
  const checkTime = item?.check_time ?? item?.time ?? ""
  const date =
    typeof baseDate === "string" && baseDate && checkTime && !baseDate.includes("T")
      ? `${baseDate}T${checkTime}`
      : String(baseDate)

  return {
    id: Number(item?.id ?? index + 1),
    studentName: String(item?.studentName ?? item?.student_name ?? item?.student?.name ?? item?.name ?? ""),
    rollNumber: String(
      item?.rollNumber ?? item?.roll_number ?? item?.studentRollNumber ?? item?.student_roll_number ?? item?.student?.rollNumber ?? item?.student?.roll_number ?? "",
    ),
    subject: String(subject),
    teacherEmail: String(item?.teacherEmail ?? item?.teacher_email ?? item?.teacher?.email ?? ""),
    date,
    status: normalizedStatus,
  }
}

function mapFingerprintStudent(item: any): FingerprintStudent {
  return {
    name: String(item?.name ?? ""),
    rollNumber: String(item?.rollNumber ?? item?.roll_number ?? ""),
    fingerprintId: String(item?.fingerprintId ?? item?.fingerprint_id ?? ""),
  }
}

function mapAbsence(
  item: any,
): {
  studentName: string
  rollNumber: string
  subject: string
  date: string
  status: AbsenceStatus
} {
  const rawStatus = String(item?.status ?? "absent").toLowerCase()
  const status: AbsenceStatus = rawStatus === "leave" ? "leave" : "absent"
  return {
    studentName: String(item?.studentName ?? item?.student_name ?? item?.name ?? ""),
    rollNumber: String(item?.rollNumber ?? item?.roll_number ?? ""),
    subject: String(item?.subject ?? ""),
    date: String(item?.date ?? ""),
    status,
  }
}

export async function markAttendance() {
  return {
    success: false,
    error: "Attendance can only be marked via fingerprint scan by teacher.",
  }
}

export async function getFingerprintRoster() {
  try {
    if (USE_MOCK_DATA) {
      return {
        success: true,
        data: [
          { name: "Shinn Khant Aung", rollNumber: "1", fingerprintId: "1" },
          { name: "Swan Pyae", rollNumber: "2", fingerprintId: "2" },
          { name: "Myat thu Kha", rollNumber: "3", fingerprintId: "3" },
          { name: "Thet Myat Noe", rollNumber: "4", fingerprintId: "4" },
        ],
      }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const courseName = (profile.data.subjects ?? [])[0]
    if (!courseName) {
      return { success: true, data: [] }
    }

    const qs = `?courseName=${encodeURIComponent(courseName)}`
    const result = await callBackend<any[]>({
      paths: [
        `${FINGERPRINT_ROSTER_PATH}${qs}`,
        `/api/attendance/fingerprint-roster${qs}`,
        `/api/attendance/fingerprint/roster${qs}`,
      ],
    })
    if (!result.success) return result

    return {
      success: true,
      data: (result.data ?? []).map(mapFingerprintStudent),
    }
  } catch (error) {
    console.error("Get fingerprint roster error:", error)
    return { success: false, error: "Failed to load fingerprint roster" }
  }
}

export async function markAttendanceByFingerprint({ fingerprintId }: { fingerprintId: string }) {
  try {
    if (USE_MOCK_DATA) {
      return { success: true, message: `Mock: attendance marked (ID: ${fingerprintId})` }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const courseName = (profile.data.subjects ?? [])[0]
    const result = await callBackend<unknown>({
      paths: [MARK_FINGERPRINT_PATH, "/api/attendance/fingerprint/mark"],
      method: "POST",
      body: { fingerprintId, fingerprint_id: fingerprintId, courseName },
    })

    if (!result.success) return result
    return { success: true, message: result.message || "Attendance marked" }
  } catch (error) {
    console.error("Mark attendance by fingerprint error:", error)
    return { success: false, error: "Failed to mark attendance" }
  }
}

export async function getTeacherAbsenteesByDate({ date, courseName }: { date: string; courseName?: string }) {
  try {
    if (USE_MOCK_DATA) {
      const dateKey = String(date).slice(0, 10)
      const roster = [
        { studentName: "Shinn Khant Aung", rollNumber: "1" },
        { studentName: "Swan Pyae", rollNumber: "2" },
        { studentName: "Myat thu Kha", rollNumber: "3" },
        { studentName: "Thet Myat Noe", rollNumber: "4" },
      ]
      const records = buildMockAttendanceRecords().filter((r) => String(r.date).startsWith(dateKey))
      const presentRolls = new Set(records.map((r) => r.rollNumber))
      return {
        success: true,
        data: roster
          .filter((s) => !presentRolls.has(s.rollNumber))
          .map((s) => ({
            studentName: s.studentName,
            rollNumber: s.rollNumber,
            subject: courseName ?? "ANIME",
            date: dateKey,
            status: "absent" as const,
          })),
      }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const result = await callBackend<any[]>({
      paths: [TEACHER_ABSENTEES_PATH, "/api/attendance/teacher/absentees"],
      method: "POST",
      body: { date, courseName },
    })
    if (!result.success) return result

    return { success: true, data: (result.data ?? []).map(mapAbsence) }
  } catch (error) {
    console.error("Get teacher absentees error:", error)
    return { success: false, error: "Failed to load absentees" }
  }
}

export async function getStudentAbsenteeismByDate({ date }: { date: string }) {
  try {
    if (USE_MOCK_DATA) {
      return { success: true, data: [] }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "student") {
      return { success: false, error: "Not authorized" }
    }

    const result = await callBackend<any[]>({
      paths: [STUDENT_ABSENTEEISM_PATH, "/api/attendance/student/absenteeism"],
      method: "POST",
      body: { date },
    })
    if (!result.success) return result

    return {
      success: true,
      data: (result.data ?? []).map((item) => {
        const rawStatus = String(item?.status ?? "absent").toLowerCase()
        return {
          subject: String(item?.subject ?? ""),
          date: String(item?.date ?? date),
          status: (rawStatus === "leave" ? "leave" : "absent") as AbsenceStatus,
        }
      }),
    }
  } catch (error) {
    console.error("Get student absenteeism error:", error)
    return { success: false, error: "Failed to load absenteeism" }
  }
}

export async function setAbsenceStatusByTeacher({
  rollNumber,
  subject,
  date,
  status,
}: {
  rollNumber: string
  subject: string
  date: string
  status: AbsenceStatus
}) {
  try {
    if (USE_MOCK_DATA) {
      return { success: true }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const result = await callBackend<unknown>({
      paths: [SET_ABSENCE_STATUS_PATH, "/api/attendance/absence-status"],
      method: "POST",
      body: { rollNumber, roll_number: rollNumber, subject, date, status },
    })
    if (!result.success) return result

    return { success: true }
  } catch (error) {
    console.error("Set absence status error:", error)
    return { success: false, error: "Failed to update absence status" }
  }
}

export async function getStudentAttendanceHistory() {
  try {
    if (USE_MOCK_DATA) {
      const records = buildMockAttendanceRecords()
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return { success: true, data: records }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data) {
      return { success: false, error: "Not authenticated" }
    }

    const profileUserId = (profile.data as any).userId
    const studentFilters = {
      email: profile.data.email,
      rollNumber: profile.data.rollNumber,
      roll_number: profile.data.rollNumber,
      studentId: profileUserId,
      student_id: profileUserId,
      userId: profileUserId,
      user_id: profileUserId,
    }

    let result = await callBackend<any[]>({
      paths: [
        STUDENT_HISTORY_PATH,
        "/api/attendance/student/history",
        "/api/student/attendance-history",
        "/api/student/attendances",
        "/api/attendance/history",
      ],
    })
    if (!result.success) return result

    if ((result.data ?? []).length === 0) {
      const postResult = await callBackend<any[]>({
        paths: [
          STUDENT_HISTORY_PATH,
          "/api/attendance/student/history",
          "/api/attendance/history",
          "/api/attendance/list",
          "/api/attendances",
        ],
        method: "POST",
        body: studentFilters,
      })
      if (postResult.success) {
        result = postResult
      }
    }

    let sourceRows = result.data ?? []
    if (sourceRows.length === 0) {
      const genericResult = await callBackend<any[]>({
        paths: ["/api/attendances", "/api/attendance/list", "/api/attendance/records"],
      })
      if (genericResult.success) {
        sourceRows = (genericResult.data ?? []).filter((row) => {
          const rowStudentId = row?.student_id ?? row?.studentId ?? row?.student?.id
          const rowRoll = row?.roll_number ?? row?.rollNumber ?? row?.student?.roll_number ?? row?.student?.rollNumber
          return (
            (profileUserId && String(rowStudentId) === String(profileUserId)) ||
            (profile.data.rollNumber && String(rowRoll) === String(profile.data.rollNumber))
          )
        })
      }
    }

    const records = sourceRows.map(mapAttendanceRecord).map((record) => {
      if (!record.subject && (profile.data?.subjects ?? []).length === 1) {
        return { ...record, subject: profile.data.subjects![0] }
      }
      return record
    })
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return { success: true, data: records }
  } catch (error) {
    console.error("Get attendance history error:", error)
    return { success: false, error: "Failed to get attendance history" }
  }
}

export async function getAllAttendanceRecords() {
  try {
    if (USE_MOCK_DATA) {
      const records = buildMockAttendanceRecords()
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      return { success: true, data: records }
    }

    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const profileUserId = (profile.data as any).userId

    let result = await callBackend<any[]>({
      paths: [TEACHER_RECORDS_PATH, "/api/attendance/teacher/records", "/api/teacher/attendance-records"],
    })

    if (!result.success) {
      const postResult = await callBackend<any[]>({
        paths: [TEACHER_RECORDS_PATH, "/api/attendance/teacher/records", "/api/attendance/records", "/api/attendance/list"],
        method: "POST",
        body: {
          email: profile.data.email,
          teacherEmail: profile.data.email,
          teacher_email: profile.data.email,
          teacherId: profileUserId,
          teacher_id: profileUserId,
          userId: profileUserId,
          user_id: profileUserId,
        },
      })
      if (!postResult.success) return result
      result = postResult
    }

    let sourceRows = result.data ?? []
    if (sourceRows.length === 0) {
      const genericResult = await callBackend<any[]>({
        paths: ["/api/attendances", "/api/attendance/list", "/api/attendance/records"],
      })
      if (genericResult.success) {
        sourceRows = genericResult.data ?? []
      }
    }

    const records = sourceRows.map(mapAttendanceRecord)
    const normalizedSubjects = (profile.data.subjects ?? [])
      .map((subject: string) => String(subject).trim().toLowerCase())
      .filter(Boolean)

    const filteredByTeacher = records.filter((record) => {
      const subjectIsUnknown = !record.subject || /^\d+$/.test(record.subject)
      const subjectMatch =
        subjectIsUnknown ||
        normalizedSubjects.length === 0 ||
        normalizedSubjects.includes(String(record.subject).trim().toLowerCase())
      const emailMatch = !record.teacherEmail || record.teacherEmail === profile.data.email
      return subjectMatch && emailMatch
    })

    const resultRows = filteredByTeacher.length === 0 && records.length > 0 ? records : filteredByTeacher
    resultRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return { success: true, data: resultRows }
  } catch (error) {
    console.error("Get all attendance records error:", error)
    return { success: false, error: "Failed to get attendance records" }
  }
}

export async function exportAttendanceData({ date }: { date?: string }) {
  try {
    const profile = await getUserProfile()
    if (!profile.success || !profile.data || profile.data.role !== "teacher") {
      return { success: false, error: "Not authorized" }
    }

    const result = await callBackend<unknown>({
      paths: [EXPORT_ATTENDANCE_PATH, "/api/attendance/export"],
      method: "POST",
      body: { date },
    })
    if (!result.success) return result

    return {
      success: true,
      message: result.message || "Export completed",
    }
  } catch (error) {
    console.error("Export attendance data error:", error)
    return { success: false, error: "Failed to export attendance data" }
  }
}
