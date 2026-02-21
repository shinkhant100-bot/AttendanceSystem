"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@/app/types"

interface Course {
  id: number
  name: string
  teacherEmail: string | null
  studentRollNumbers: string[]
}

const users: (User & { password: string })[] = [
  {
    id: 1,
    name: "System Admin",
    email: "admin@example.com",
    password: "admin123",
    rollNumber: "",
    phone: "09000000000",
    role: "admin",
    subjects: [],
  },
  {
    id: 2,
    name: "Teacher Alice",
    email: "alice.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["CRP"],
  },
  {
    id: 3,
    name: "Teacher Bob",
    email: "bob.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["IOT"],
  },
  {
    id: 4,
    name: "Teacher Carol",
    email: "carol.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["BPS"],
  },
  {
    id: 5,
    name: "Teacher David",
    email: "david.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["WDD"],
  },
  {
    id: 6,
    name: "Shinn Khant Aung",
    email: "shinn.khant@example.com",
    password: "student123",
    rollNumber: "20260000001",
    phone: "09111111111",
    fingerprintId: "FP-0001",
    role: "student",
    subjects: [],
  },
  {
    id: 7,
    name: "Swan Pyae Aung",
    email: "swan.pyae@example.com",
    password: "student123",
    rollNumber: "20260000002",
    phone: "09222222222",
    fingerprintId: "FP-0002",
    role: "student",
    subjects: [],
  },
  {
    id: 8,
    name: "Thet Myat Noe",
    email: "thet.myat@example.com",
    password: "student123",
    rollNumber: "20260000003",
    phone: "09333333333",
    fingerprintId: "FP-0003",
    role: "student",
    subjects: [],
  },
  {
    id: 9,
    name: "Myat Thu Kha",
    email: "myat.thu@example.com",
    password: "student123",
    rollNumber: "20260000004",
    phone: "09444444444",
    fingerprintId: "FP-0004",
    role: "student",
    subjects: [],
  },
]

const courses: Course[] = [
  { id: 1, name: "CRP", teacherEmail: "alice.teacher@example.com", studentRollNumbers: [] },
  { id: 2, name: "IOT", teacherEmail: "bob.teacher@example.com", studentRollNumbers: [] },
  { id: 3, name: "BPS", teacherEmail: "carol.teacher@example.com", studentRollNumbers: [] },
  { id: 4, name: "WDD", teacherEmail: "david.teacher@example.com", studentRollNumbers: [] },
]

function syncTeacherSubjectsFromCourses() {
  const teacherSubjectsMap = new Map<string, string[]>()

  for (const course of courses) {
    if (!course.teacherEmail) continue
    if (!teacherSubjectsMap.has(course.teacherEmail)) {
      teacherSubjectsMap.set(course.teacherEmail, [])
    }
    teacherSubjectsMap.get(course.teacherEmail)!.push(course.name)
  }

  for (const user of users) {
    if (user.role === "teacher") {
      user.subjects = teacherSubjectsMap.get(user.email) ?? []
    }
  }
}

async function requireAdminProfile() {
  const profile = await getUserProfile()
  if (!profile.success || profile.data.role !== "admin") {
    return null
  }
  return profile.data
}

export async function registerUser(userData: {
  name: string
  email: string
  rollNumber: string
  phone: string
  password: string
}) {
  try {
    const existingUser = users.find((user) => user.email === userData.email || user.rollNumber === userData.rollNumber)

    if (existingUser) {
      return {
        success: false,
        error: "User with this email or roll number already exists",
      }
    }

    users.push({
      id: users.length + 1,
      ...userData,
      role: "student",
      subjects: [],
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return {
      success: false,
      error: "Failed to register user",
    }
  }
}

export async function loginUser({
  email,
  password,
  loginAs,
}: {
  email: string
  password: string
  loginAs?: "teacher" | "admin"
}) {
  try {
    const user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return {
        success: false,
        error: "Incorrect email or password",
      }
    }

    if (loginAs && user.role !== loginAs) {
      return {
        success: false,
        error: `You do not have ${loginAs} privileges`,
      }
    }

    const authToken = crypto.randomUUID()

    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      token: authToken,
      role: user.role,
      subjects: user.subjects ?? [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    cookieStore.set("authToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return {
      success: true,
      token: authToken,
    }
  } catch (error) {
    console.error("Login error:", error)
    return {
      success: false,
      error: "Failed to login",
    }
  }
}

export async function getUserProfile() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    const session = JSON.parse(sessionCookie.value)

    if (new Date(session.expiresAt) < new Date()) {
      cookieStore.delete("session")
      cookieStore.delete("authToken")
      return {
        success: false,
        error: "Session expired",
      }
    }

    return {
      success: true,
      data: {
        name: session.name,
        email: session.email,
        rollNumber: session.rollNumber,
        role: session.role as User["role"],
        subjects: session.subjects ?? [],
      },
    }
  } catch (error) {
    console.error("Get user profile error:", error)
    return {
      success: false,
      error: "Failed to get user profile",
    }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  cookieStore.delete("authToken")
}

export async function requireAuth() {
  const profile = await getUserProfile()
  if (!profile.success) {
    redirect("/login")
  }
  return profile.data
}

export async function requireTeacher() {
  const profile = await getUserProfile()
  if (!profile.success || profile.data.role !== "teacher") {
    redirect("/login?role=teacher")
  }
  return profile.data
}

export async function requireAdmin() {
  const profile = await getUserProfile()
  if (!profile.success || profile.data.role !== "admin") {
    redirect("/login?role=admin")
  }
  return profile.data
}

export async function getAdminPanelData() {
  const admin = await requireAdminProfile()
  if (!admin) {
    return { success: false, error: "Not authorized" }
  }

  const teachers = users.filter((u) => u.role === "teacher").map((t) => ({ name: t.name, email: t.email }))
  const students = users
    .filter((u) => u.role === "student")
    .map((s) => ({ name: s.name, rollNumber: s.rollNumber, email: s.email }))

  return {
    success: true,
    data: {
      courses,
      teachers,
      students,
    },
  }
}

export async function createCourse({ name }: { name: string }) {
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const courseName = name.trim().toUpperCase()
  if (!courseName) return { success: false, error: "Course name is required" }
  if (courses.some((c) => c.name === courseName)) return { success: false, error: "Course already exists" }

  courses.push({
    id: courses.length + 1,
    name: courseName,
    teacherEmail: null,
    studentRollNumbers: [],
  })

  return { success: true }
}

export async function assignTeacherToCourse({
  courseId,
  teacherEmail,
}: {
  courseId: number
  teacherEmail: string
}) {
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const course = courses.find((c) => c.id === courseId)
  if (!course) return { success: false, error: "Course not found" }

  const teacher = users.find((u) => u.email === teacherEmail && u.role === "teacher")
  if (!teacher) return { success: false, error: "Teacher not found" }

  course.teacherEmail = teacherEmail
  syncTeacherSubjectsFromCourses()

  return { success: true }
}

export async function enrollStudentInCourse({
  courseId,
  studentRollNumber,
}: {
  courseId: number
  studentRollNumber: string
}) {
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const course = courses.find((c) => c.id === courseId)
  if (!course) return { success: false, error: "Course not found" }

  const student = users.find((u) => u.rollNumber === studentRollNumber && u.role === "student")
  if (!student) return { success: false, error: "Student not found" }

  if (!course.studentRollNumbers.includes(studentRollNumber)) {
    course.studentRollNumbers.push(studentRollNumber)
  }

  return { success: true }
}

export async function registerStudentByAdmin(userData: {
  name: string
  email: string
  rollNumber: string
  phone: string
  password: string
}) {
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const existingUser = users.find((user) => user.email === userData.email || user.rollNumber === userData.rollNumber)
  if (existingUser) return { success: false, error: "User with this email or roll number already exists" }

  users.push({
    id: users.length + 1,
    ...userData,
    role: "student",
    subjects: [],
  })

  return { success: true }
}

export async function registerTeacherByAdmin(userData: {
  name: string
  email: string
  phone: string
  password: string
}) {
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const existingUser = users.find((user) => user.email === userData.email)
  if (existingUser) return { success: false, error: "User with this email already exists" }

  users.push({
    id: users.length + 1,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    password: userData.password,
    rollNumber: "",
    role: "teacher",
    subjects: [],
  })

  return { success: true }
}
