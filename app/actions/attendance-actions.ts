"use server"

import { getUserProfile } from "./auth-actions"
import type { AttendanceRecord } from "@/app/types"

interface FingerprintStudent {
  name: string
  rollNumber: string
  fingerprintId: string
}

const SUBJECTS = ["CRP", "IOT", "BPS", "WDD"] as const

const students: FingerprintStudent[] = [
  { name: "Shinn Khant Aung", rollNumber: "20260000001", fingerprintId: "FP-0001" },
  { name: "Swan Pyae Aung", rollNumber: "20260000002", fingerprintId: "FP-0002" },
  { name: "Thet Myat Noe", rollNumber: "20260000003", fingerprintId: "FP-0003" },
  { name: "Myat Thu Kha", rollNumber: "20260000004", fingerprintId: "FP-0004" },
]

const attendanceRecords: AttendanceRecord[] = [
  {
    id: 1,
    studentName: "Shinn Khant Aung",
    rollNumber: "20260000001",
    subject: "CRP",
    teacherEmail: "alice.teacher@example.com",
    date: "2025-03-11T08:00:00.000Z",
    status: "present",
  },
  {
    id: 2,
    studentName: "Thet Myat Noe",
    rollNumber: "20260000003",
    subject: "BPS",
    teacherEmail: "carol.teacher@example.com",
    date: "2025-03-11T08:20:00.000Z",
    status: "late",
  },
]

const teacherBySubject: Record<string, string> = {
  CRP: "alice.teacher@example.com",
  IOT: "bob.teacher@example.com",
  BPS: "carol.teacher@example.com",
  WDD: "david.teacher@example.com",
}

function getAttendanceStatusByTime(scanTime: Date): AttendanceRecord["status"] {
  const minutesFromMidnight = scanTime.getHours() * 60 + scanTime.getMinutes()
  const presentCutoff = 8 * 60 + 10 // 08:10
  const lateCutoff = 8 * 60 + 30 // 08:30

  if (minutesFromMidnight <= presentCutoff) return "present"
  if (minutesFromMidnight <= lateCutoff) return "late"
  return "serious late"
}

function isFutureDate(date: string): boolean {
  const today = new Date().toISOString().split("T")[0]
  return date > today
}

function hasAttendance(rollNumber: string, subject: string, date: string) {
  return attendanceRecords.some(
    (record) => record.rollNumber === rollNumber && record.subject === subject && record.date.startsWith(date),
  )
}

export async function markAttendance() {
  return {
    success: false,
    error: "Attendance can only be marked via fingerprint scan by teacher.",
  }
}

export async function getFingerprintRoster() {
  try {
    const profile = await getUserProfile()
    if (!profile.success || profile.data.role !== "teacher") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    return {
      success: true,
      data: students,
    }
  } catch (error) {
    console.error("Get fingerprint roster error:", error)
    return {
      success: false,
      error: "Failed to load fingerprint roster",
    }
  }
}

export async function markAttendanceByFingerprint({
  fingerprintId,
}: {
  fingerprintId: string
}) {
  try {
    const profile = await getUserProfile()

    if (!profile.success || profile.data.role !== "teacher") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    const subject = profile.data.subjects?.[0]
    if (!subject) {
      return {
        success: false,
        error: "No subject assigned to teacher",
      }
    }

    const student = students.find((s) => s.fingerprintId === fingerprintId)
    if (!student) {
      return {
        success: false,
        error: "Fingerprint not recognized",
      }
    }

    const today = new Date().toISOString().split("T")[0]
    const alreadyMarked = hasAttendance(student.rollNumber, subject, today)

    if (alreadyMarked) {
      return {
        success: false,
        error: `${student.name} already marked for ${subject} today`,
      }
    }

    const scanTime = new Date()
    const status = getAttendanceStatusByTime(scanTime)

    attendanceRecords.push({
      id: attendanceRecords.length + 1,
      studentName: student.name,
      rollNumber: student.rollNumber,
      subject,
      teacherEmail: profile.data.email,
      date: scanTime.toISOString(),
      status,
    })

    return {
      success: true,
      message: `${student.name} marked ${status} for ${subject}`,
    }
  } catch (error) {
    console.error("Mark attendance by fingerprint error:", error)
    return {
      success: false,
      error: "Failed to mark attendance",
    }
  }
}

export async function getTeacherAbsenteesByDate({
  date,
}: {
  date: string
}) {
  try {
    const profile = await getUserProfile()
    if (!profile.success || profile.data.role !== "teacher") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    if (!date || isFutureDate(date)) {
      return {
        success: true,
        data: [],
      }
    }

    const teacherSubjects = profile.data.subjects ?? []
    const absentees = students.flatMap((student) =>
      teacherSubjects
        .filter((subject) => !hasAttendance(student.rollNumber, subject, date))
        .map((subject) => ({
          studentName: student.name,
          rollNumber: student.rollNumber,
          subject,
          date,
          status: "absent",
        })),
    )

    return {
      success: true,
      data: absentees,
    }
  } catch (error) {
    console.error("Get teacher absentees error:", error)
    return {
      success: false,
      error: "Failed to load absentees",
    }
  }
}

export async function getStudentAbsenteeismByDate({
  date,
}: {
  date: string
}) {
  try {
    const profile = await getUserProfile()
    if (!profile.success || profile.data.role !== "student") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    if (!date || isFutureDate(date)) {
      return {
        success: true,
        data: [],
      }
    }

    const absences = SUBJECTS.filter((subject) => !hasAttendance(profile.data.rollNumber, subject, date)).map(
      (subject) => ({
        subject,
        date,
        status: "absent",
      }),
    )

    return {
      success: true,
      data: absences,
    }
  } catch (error) {
    console.error("Get student absenteeism error:", error)
    return {
      success: false,
      error: "Failed to load absenteeism",
    }
  }
}

export async function getStudentAttendanceHistory() {
  try {
    const profile = await getUserProfile()

    if (!profile.success) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    const records = attendanceRecords.filter((record) => record.rollNumber === profile.data.rollNumber)
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      success: true,
      data: records,
    }
  } catch (error) {
    console.error("Get attendance history error:", error)
    return {
      success: false,
      error: "Failed to get attendance history",
    }
  }
}

export async function getAllAttendanceRecords() {
  try {
    const profile = await getUserProfile()

    if (!profile.success || profile.data.role !== "teacher") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    const teacherRecords = attendanceRecords.filter((record) => record.teacherEmail === profile.data.email)
    const sortedRecords = [...teacherRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      success: true,
      data: sortedRecords,
    }
  } catch (error) {
    console.error("Get all attendance records error:", error)
    return {
      success: false,
      error: "Failed to get attendance records",
    }
  }
}

export async function exportAttendanceData({
  date,
}: {
  date?: string
}) {
  try {
    const profile = await getUserProfile()

    if (!profile.success || profile.data.role !== "teacher") {
      return {
        success: false,
        error: "Not authorized",
      }
    }

    let filteredRecords = attendanceRecords.filter((record) => record.teacherEmail === profile.data.email)

    if (date) {
      filteredRecords = filteredRecords.filter((record) => record.date.startsWith(date))
    }

    return {
      success: true,
      message: `Exported ${filteredRecords.length} records`,
    }
  } catch (error) {
    console.error("Export attendance data error:", error)
    return {
      success: false,
      error: "Failed to export attendance data",
    }
  }
}
