export interface AttendanceRecord {
  id: number
  studentName: string
  rollNumber: string
  subject: string
  teacherEmail: string
  date: string
  status: "present" | "late" | "serious late"
}

export interface User {
  id: number
  name: string
  email: string
  rollNumber: string
  phone: string
  fingerprintId?: string
  role: "student" | "teacher" | "admin"
  subjects?: string[]
}
