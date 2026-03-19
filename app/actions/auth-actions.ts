"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@/app/types"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

interface Course {
  id: number
  name: string
  teacherEmail: string | null
  studentRollNumbers: string[]
}

interface BackendLoginUserData {
  id?: number
  name?: string
  email?: string
  role?: string
  rollNumber?: string
  roll_number?: string
}

interface BackendLoginResponse {
  success?: boolean
  message?: string
  error?: string
  token?: string
  access_token?: string
  accessToken?: string
  userData?: BackendLoginUserData
  user?: BackendLoginUserData
  data?: {
    token?: string
    access_token?: string
    accessToken?: string
    userData?: BackendLoginUserData
    user?: BackendLoginUserData
  }
}

interface BackendRegisterResponse {
  success?: boolean
  message?: string
  error?: string
}

const SERVICE_URL = (process.env.SERVICE_URL ?? "http://localhost:8000").replace(/\/+$/, "")
const STUDENT_LOGIN_PATH = process.env.STUDENT_LOGIN_PATH ?? "/api/auth/student_login"
const TEACHER_LOGIN_PATH = process.env.TEACHER_LOGIN_PATH ?? "/api/auth/teacher_login"
const ADMIN_LOGIN_PATH = process.env.ADMIN_LOGIN_PATH ?? "/api/auth/admin_login"
const STUDENT_REGISTER_PATH = process.env.STUDENT_REGISTER_PATH ?? "/api/student/new"
const TEACHER_REGISTER_PATH = process.env.TEACHER_REGISTER_PATH ?? "/api/teacher/new"
const ADMIN_REGISTER_PATH = process.env.ADMIN_REGISTER_PATH ?? "/api/admin/new"
const COURSE_CREATE_PATH = process.env.COURSE_CREATE_PATH ?? "/api/course/new"
const ASSIGN_TEACHER_PATH = process.env.ASSIGN_TEACHER_PATH ?? "/api/course/assign"
const ENROLL_STUDENT_PATH = process.env.ENROLL_STUDENT_PATH ?? "/api/enroll"
const DATA_DIR = path.join(process.cwd(), "data")
const AUTH_STORE_FILE = path.join(DATA_DIR, "auth-store.json")

const fallbackLoginUsers: (User & { password: string })[] = [
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

const users: (User & { password: string })[] = []
const courses: Course[] = []

type StoredUser = User & { password: string }
interface AuthStoreData {
  users: StoredUser[]
  courses: Course[]
}

const MOCK_USER_EMAILS = new Set(
  fallbackLoginUsers.map((user) => user.email),
)

function isMockCourse(course: Course) {
  const mockNames = ["CRP", "IOT", "BPS", "WDD"]
  return (
    mockNames.includes(course.name) &&
    course.studentRollNumbers.length === 0 &&
    (!course.teacherEmail || MOCK_USER_EMAILS.has(course.teacherEmail))
  )
}

let usersLoaded = false
let loadUsersPromise: Promise<void> | null = null

async function saveAuthStore() {
  const payload: AuthStoreData = { users, courses }
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(AUTH_STORE_FILE, JSON.stringify(payload, null, 2), "utf-8")
}

async function ensureAuthStoreLoaded() {
  if (usersLoaded) return
  if (loadUsersPromise) return loadUsersPromise

  loadUsersPromise = (async () => {
    try {
      const raw = await readFile(AUTH_STORE_FILE, "utf-8")
      const parsed = JSON.parse(raw) as Partial<AuthStoreData>
      if (Array.isArray(parsed.users) && Array.isArray(parsed.courses)) {
        const sourceUsers = parsed.users as StoredUser[]
        const sourceCourses = parsed.courses as Course[]
        const cleanedUsers = sourceUsers.filter((user) => !MOCK_USER_EMAILS.has(user.email))
        const cleanedCourses = sourceCourses.filter((course) => !isMockCourse(course))
        users.splice(0, users.length, ...cleanedUsers)
        courses.splice(0, courses.length, ...cleanedCourses)
        syncTeacherSubjectsFromCourses()
        syncStudentSubjectsFromCourses()
        if (cleanedUsers.length !== sourceUsers.length || cleanedCourses.length !== sourceCourses.length) {
          await saveAuthStore()
        }
      } else {
        await saveAuthStore()
      }
    } catch {
      await saveAuthStore()
    } finally {
      usersLoaded = true
      loadUsersPromise = null
    }
  })()

  return loadUsersPromise
}

function getApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SERVICE_URL}${normalizedPath}`
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>
  } catch {
    return null
  }
}

async function loginStudentViaBackend(email: string, password: string) {
  const response = await fetch(getApiUrl(STUDENT_LOGIN_PATH), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  })
  return parseBackendLoginResponse(response, email, "student")
}

async function loginRoleViaBackend(paths: string[], email: string, password: string, expectedRole: "teacher" | "admin") {
  let lastFailure: { success: false; status?: number; error?: string } | null = null

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        role: expectedRole,
        loginAs: expectedRole,
      }),
      cache: "no-store",
    })

    const parsed = await parseBackendLoginResponse(response, email, expectedRole)
    if (parsed.success) {
      return parsed
    }

    if (parsed.status === 404 || parsed.status === 405) {
      continue
    }

    lastFailure = parsed
  }

  return (
    lastFailure ?? {
      success: false as const,
      status: 404,
      error: `Login API route not found for ${expectedRole}`,
    }
  )
}

async function parseBackendLoginResponse(response: Response, email: string, expectedRole?: User["role"]) {
  let payload: BackendLoginResponse | null = null
  try {
    payload = (await response.json()) as BackendLoginResponse
  } catch {
    payload = null
  }

  const status = response.status
  const token =
    payload?.data?.token || payload?.token || payload?.data?.access_token || payload?.access_token || payload?.data?.accessToken || payload?.accessToken
  const explicitlyFailed = payload?.success === false
  if (!response.ok || explicitlyFailed) {
    return {
      success: false as const,
      status,
      error: payload?.message || payload?.error || "Incorrect email or password",
    }
  }

  const userData = payload?.data?.userData ?? payload?.userData ?? payload?.data?.user ?? payload?.user ?? {}
  const decoded = token ? parseJwtPayload(token) : null
  const roleFromToken = typeof decoded?.role === "string" ? decoded.role : undefined
  const roleFromBody = typeof userData.role === "string" ? userData.role.toLowerCase() : undefined
  const role: User["role"] =
    roleFromToken === "admin" || roleFromToken === "teacher"
      ? roleFromToken
      : roleFromBody === "admin" || roleFromBody === "teacher"
        ? roleFromBody
      : expectedRole === "admin" || expectedRole === "teacher"
        ? expectedRole
        : "student"

  const session = {
    userId: typeof userData.id === "number" ? userData.id : 0,
    name: userData.name ?? email.split("@")[0] ?? "Student",
    email: userData.email ?? email,
    rollNumber: userData.rollNumber ?? userData.roll_number ?? "",
    token: token ?? crypto.randomUUID(),
    role,
    subjects: [] as string[],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }

  return {
    success: true as const,
    token: session.token,
    session,
  }
}

async function registerStudentViaBackend({
  name,
  email,
  fingerprintId,
  password,
  rollNumber,
  phone,
}: {
  name: string
  email: string
  fingerprintId?: string
  password: string
  rollNumber?: string
  phone?: string
}) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  const paths = [STUDENT_REGISTER_PATH, "/api/student/new", "/api/student/register"]
  let lastError = "Failed to register user"

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ name, email, password, fingerprintId, rollNumber, phone }),
      cache: "no-store",
    })

    let payload: BackendRegisterResponse | null = null
    try {
      payload = (await response.json()) as BackendRegisterResponse
    } catch {
      payload = null
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (response.ok && payload?.success !== false) {
      return {
        success: true as const,
      }
    }

    lastError = payload?.message || payload?.error || "Failed to register user"
  }

  return {
    success: false as const,
    error: lastError,
  }
}

async function registerRoleViaBackend({
  name,
  email,
  password,
  role,
}: {
  name: string
  email: string
  password: string
  role: "teacher" | "admin"
}) {
  const path = role === "admin" ? ADMIN_REGISTER_PATH : TEACHER_REGISTER_PATH
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  const paths = role === "admin" ? [path, "/api/admin/new", "/api/admin/register"] : [path, "/api/teacher/new", "/api/teacher/register"]
  let lastStatus = 500
  let lastError = "Failed to register user"

  for (const endpoint of paths) {
    const response = await fetch(getApiUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ name, email, password, role }),
      cache: "no-store",
    })

    let payload: BackendRegisterResponse | null = null
    try {
      payload = (await response.json()) as BackendRegisterResponse
    } catch {
      payload = null
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (response.ok && payload?.success !== false) {
      return {
        success: true as const,
      }
    }

    lastStatus = response.status
    lastError = payload?.message || payload?.error || "Failed to register user"
  }

  return {
    success: false as const,
    status: lastStatus,
    error: lastError,
  }
}

async function createCourseViaBackend(name: string) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  const paths = [COURSE_CREATE_PATH, "/api/course/new", "/api/course/create", "/api/courses/create", "/api/course/register", "/api/admin/course/create"]

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ name, courseName: name }),
      cache: "no-store",
    })

    let payload: BackendRegisterResponse | null = null
    try {
      payload = (await response.json()) as BackendRegisterResponse
    } catch {
      payload = null
    }

    if (response.status === 404) {
      continue
    }

    const explicitlyFailed = payload?.success === false
    if (response.ok && !explicitlyFailed) {
      return { success: true as const }
    }

    return {
      success: false as const,
      status: response.status,
      error: payload?.message || payload?.error || "Failed to create course",
    }
  }

  return {
    success: false as const,
    status: 404,
    error: "Course create API route not found",
  }
}

async function assignTeacherToCourseViaBackend(courseId: number, teacherEmail: string) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  const paths = [ASSIGN_TEACHER_PATH, "/api/course/assign_teacher", "/api/course/assign-teacher"]

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        courseId,
        course_id: courseId,
        teacherEmail,
        teacher_email: teacherEmail,
      }),
      cache: "no-store",
    })

    let payload: BackendRegisterResponse | null = null
    try {
      payload = (await response.json()) as BackendRegisterResponse
    } catch {
      payload = null
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (response.ok && payload?.success !== false) {
      return { success: true as const }
    }

    return {
      success: false as const,
      error: payload?.message || payload?.error || "Failed to assign teacher to course",
    }
  }

  return {
    success: false as const,
    error: "Assign teacher API route not found",
  }
}

async function enrollStudentInCourseViaBackend(courseId: number, studentRollNumber: string) {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value
  const paths = [ENROLL_STUDENT_PATH, "/api/course/enroll_student", "/api/course/enroll-student"]

  for (const path of paths) {
    const response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        courseId,
        course_id: courseId,
        studentRollNumber,
        student_roll_number: studentRollNumber,
      }),
      cache: "no-store",
    })

    async function registerFingerprint(studentId: number, fingerId: number) {

  const cookieStore = await cookies()
  const authToken = cookieStore.get("authToken")?.value

  const response = await fetch(getApiUrl("/api/fingerprints/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      student_id: studentId,
      finger_id: fingerId
    }),
    cache: "no-store"
  })

  return response.json()
}

    let payload: BackendRegisterResponse | null = null
    try {
      payload = (await response.json()) as BackendRegisterResponse
    } catch {
      payload = null
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (response.ok && payload?.success !== false) {
      return { success: true as const }
    }

    return {
      success: false as const,
      error: payload?.message || payload?.error || "Failed to enroll student in course",
    }
  }

  return {
    success: false as const,
    error: "Enroll student API route not found",
  }
}

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

function syncStudentSubjectsFromCourses() {
  const studentSubjectsMap = new Map<string, string[]>()

  for (const course of courses) {
    for (const rollNumber of course.studentRollNumbers) {
      if (!studentSubjectsMap.has(rollNumber)) {
        studentSubjectsMap.set(rollNumber, [])
      }
      studentSubjectsMap.get(rollNumber)!.push(course.name)
    }
  }

  for (const user of users) {
    if (user.role === "student") {
      user.subjects = studentSubjectsMap.get(user.rollNumber) ?? []
    }
  }
}

async function requireAdminProfile() {
  const profile = await getUserProfile()
  if (!profile.success || !profile.data || profile.data.role !== "admin") {
    return null
  }
  return profile.data
}

export async function registerUser(_userData: {
  name: string
  email: string
  rollNumber: string
  phone: string
  password: string
}) {
  return { success: false, error: "Self-registration is disabled. Only admin can register users." }
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
    await ensureAuthStoreLoaded()
    const backendResult = !loginAs
      ? await loginStudentViaBackend(email, password)
      : await loginRoleViaBackend(
          loginAs === "admin"
            ? [ADMIN_LOGIN_PATH, "/api/admin/login", "/api/auth/admin_login", "/api/auth/login", "/api/login"]
            : [TEACHER_LOGIN_PATH, "/api/teacher/login", "/api/auth/teacher_login", "/api/auth/login", "/api/login", STUDENT_LOGIN_PATH],
          email,
          password,
          loginAs,
        )

    if (!backendResult.success) {
      if (!loginAs) {
        return backendResult
      }

      const localUser =
        users.find((u) => u.email === email && u.password === password) ??
        fallbackLoginUsers.find((u) => u.email === email && u.password === password)
      if (!localUser) {
        return backendResult
      }
      if (localUser.role !== loginAs) {
        return {
          success: false,
          error: `You do not have ${loginAs} privileges`,
        }
      }

      const localToken = crypto.randomUUID()
      const localSession = {
        userId: localUser.id,
        name: localUser.name,
        email: localUser.email,
        rollNumber: localUser.rollNumber,
        token: localToken,
        role: localUser.role,
        subjects: localUser.subjects ?? [],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      const cookieStore = await cookies()
      cookieStore.set("session", JSON.stringify(localSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      cookieStore.set("authToken", localToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })

      return {
        success: true,
        token: localToken,
      }
    }

    const session = backendResult.session
    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    cookieStore.set("authToken", backendResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return {
      success: true,
      token: backendResult.token,
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
    await ensureAuthStoreLoaded()
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

    const currentUser = users.find((u) => u.email === session.email)
    const sessionUserId =
      typeof session.userId === "number" ? session.userId : Number(session.userId ?? 0)

    const profileData = {
      userId: sessionUserId || currentUser?.id || 0,
      name: currentUser?.name ?? session.name,
      email: currentUser?.email ?? session.email,
      rollNumber: currentUser?.rollNumber ?? session.rollNumber,
      role: (currentUser?.role ?? session.role) as User["role"],
      subjects: currentUser?.subjects ?? session.subjects ?? [],
    }

    if (currentUser) {
      const updatedSession = {
        ...session,
        userId: profileData.userId,
        name: profileData.name,
        email: profileData.email,
        rollNumber: profileData.rollNumber,
        role: profileData.role,
        subjects: profileData.subjects,
      }
      cookieStore.set("session", JSON.stringify(updatedSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
    }

    return {
      success: true,
      data: profileData,
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
  if (!profile.success || !profile.data) {
    redirect("/login")
  }
  return profile.data
}

export async function requireTeacher() {
  const profile = await getUserProfile()
  if (!profile.success || !profile.data || profile.data.role !== "teacher") {
    redirect("/login?role=teacher")
  }
  return profile.data
}

export async function requireAdmin() {
  const profile = await getUserProfile()
  if (!profile.success || !profile.data || profile.data.role !== "admin") {
    redirect("/login?role=admin")
  }
  return profile.data
}

export async function getAdminPanelData() {
  await ensureAuthStoreLoaded()
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
  await ensureAuthStoreLoaded()
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const courseName = name.trim().toUpperCase()
  if (!courseName) return { success: false, error: "Course name is required" }
  if (courses.some((c) => c.name === courseName)) return { success: false, error: "Course already exists" }

  const backendCreate = await createCourseViaBackend(courseName)
  if (!backendCreate.success) {
    return { success: false, error: backendCreate.error }
  }

  courses.push({
    id: courses.length + 1,
    name: courseName,
    teacherEmail: null,
    studentRollNumbers: [],
  })
  await saveAuthStore()

  return { success: true }
}

export async function assignTeacherToCourse({
  courseId,
  teacherEmail,
}: {
  courseId: number
  teacherEmail: string
}) {
  await ensureAuthStoreLoaded()
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const course = courses.find((c) => c.id === courseId)
  if (!course) return { success: false, error: "Course not found" }

  const teacher = users.find((u) => u.email === teacherEmail && u.role === "teacher")
  if (!teacher) return { success: false, error: "Teacher not found" }

  const backendAssign = await assignTeacherToCourseViaBackend(courseId, teacherEmail)
  if (!backendAssign.success) {
    const isRouteMissing = (backendAssign.error || "").toLowerCase().includes("route not found")
    if (!isRouteMissing) return backendAssign
    console.warn("Assign teacher backend route missing; applying local assignment only.")
  }

  course.teacherEmail = teacherEmail
  syncTeacherSubjectsFromCourses()
  await saveAuthStore()

  return { success: true }
}

export async function enrollStudentInCourse({
  courseId,
  studentRollNumber,
}: {
  courseId: number
  studentRollNumber: string
}) {
  await ensureAuthStoreLoaded()
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const course = courses.find((c) => c.id === courseId)
  if (!course) return { success: false, error: "Course not found" }

  const student = users.find((u) => u.rollNumber === studentRollNumber && u.role === "student")
  if (!student) return { success: false, error: "Student not found" }

  const backendEnroll = await enrollStudentInCourseViaBackend(courseId, studentRollNumber)
  if (!backendEnroll.success) {
    const isRouteMissing = (backendEnroll.error || "").toLowerCase().includes("route not found")
    if (!isRouteMissing) return backendEnroll
    console.warn("Enroll student backend route missing; applying local enrollment only.")
  }

  if (!course.studentRollNumbers.includes(studentRollNumber)) {
    course.studentRollNumbers.push(studentRollNumber)
  }
  syncStudentSubjectsFromCourses()
  await saveAuthStore()

  return { success: true }
}

export async function registerStudentByAdmin(userData: {
  name: string
  email: string
  rollNumber?: string
  fingerprintId?: string
  phone?: string
  password: string
}) {
  await ensureAuthStoreLoaded()
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const requestedRollNumber = userData.rollNumber?.trim()
  const fingerprintId = userData.fingerprintId?.trim()
  let rollNumber = requestedRollNumber ?? ""

  if (!rollNumber) {
    const yearPrefix = String(new Date().getFullYear())
    let sequence = users.filter((user) => user.role === "student").length + 1
    rollNumber = `${yearPrefix}${String(sequence).padStart(7, "0")}`

    while (users.some((user) => user.rollNumber === rollNumber)) {
      sequence += 1
      rollNumber = `${yearPrefix}${String(sequence).padStart(7, "0")}`
    }
  }

  const existingUser = users.find((user) => {
    const sameIdentity = user.email === userData.email || user.rollNumber === rollNumber
    const sameFingerprint = Boolean(fingerprintId) && Boolean(user.fingerprintId) && user.fingerprintId === fingerprintId
    return sameIdentity || sameFingerprint
  })
  if (existingUser) return { success: false, error: "User with this email, roll number, or fingerprint ID already exists" }

  const backendRegistration = await registerStudentViaBackend({
    name: userData.name,
    email: userData.email,
    fingerprintId,
    password: userData.password,
    rollNumber,
    phone: userData.phone,
  })
  if (!backendRegistration.success) {
    return backendRegistration
  }

  users.push({
    id: users.length + 1,
    name: userData.name,
    email: userData.email,
    password: userData.password,
    rollNumber,
    phone: userData.phone ?? "",
    fingerprintId,
    role: "student",
    subjects: [],
  })
  await saveAuthStore()

  return { success: true }
}

export async function registerTeacherByAdmin(userData: {
  name: string
  email: string
  role: "teacher" | "admin"
  password: string
}) {
  await ensureAuthStoreLoaded()
  const admin = await requireAdminProfile()
  if (!admin) return { success: false, error: "Not authorized" }

  const existingUser = users.find((user) => user.email === userData.email)
  if (existingUser) return { success: false, error: "User with this email already exists" }

  const backendRegistration = await registerRoleViaBackend({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role,
  })

  if (!backendRegistration.success) {
    return backendRegistration
  }

  users.push({
    id: users.length + 1,
    name: userData.name,
    email: userData.email,
    phone: "",
    password: userData.password,
    rollNumber: "",
    role: userData.role,
    subjects: [],
  })
  await saveAuthStore()

  return { success: true }
}
