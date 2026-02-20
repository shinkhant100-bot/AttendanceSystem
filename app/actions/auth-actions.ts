"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@/app/types"

// In a real app, this would be stored in a database
const users: (User & { password: string })[] = [
  {
    id: 1,
    name: "Teacher Alice",
    email: "alice.teacher@example.com",
    password: "teacher123", // In a real app, this would be hashed
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["CRP"],
  },
  {
    id: 2,
    name: "Teacher Bob",
    email: "bob.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["IOT"],
  },
  {
    id: 3,
    name: "Teacher Carol",
    email: "carol.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["BPS"],
  },
  {
    id: 4,
    name: "Teacher David",
    email: "david.teacher@example.com",
    password: "teacher123",
    rollNumber: "",
    phone: "",
    role: "teacher",
    subjects: ["WDD"],
  },
  {
    id: 5,
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
    id: 6,
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
    id: 7,
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
    id: 8,
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

// Register user
export async function registerUser(userData: {
  name: string
  email: string
  rollNumber: string
  phone: string
  password: string
}) {
  try {
    // Check if user already exists
    const existingUser = users.find((user) => user.email === userData.email || user.rollNumber === userData.rollNumber)

    if (existingUser) {
      return {
        success: false,
        error: "User with this email or roll number already exists",
      }
    }

    // In a real app, you would hash the password before storing it
    const newUser = {
      id: users.length + 1,
      ...userData,
      role: "student" as const,
      subjects: [],
    }

    // Add user to our "database"
    users.push(newUser)

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

// Login user
export async function loginUser({
  email,
  password,
  isTeacher = false,
}: {
  email: string
  password: string
  isTeacher?: boolean
}) {
  try {
    // Find user
    const user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return {
        success: false,
        error: "Invalid credentials",
      }
    }

    // Check if teacher login but user is not a teacher
    if (isTeacher && user.role !== "teacher") {
      return {
        success: false,
        error: "You do not have teacher privileges",
      }
    }

    const authToken = crypto.randomUUID()

    // Create session
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      token: authToken,
      role: user.role,
      subjects: user.subjects ?? [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    }

    // In a real app, you would encrypt this session data
    const sessionStr = JSON.stringify(session)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session", sessionStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    cookieStore.set("authToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
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

// Get user profile from session
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

    // In a real app, you would decrypt the session data
    const session = JSON.parse(sessionCookie.value)

    // Check if session is expired
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
        role: session.role,
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

// Logout user
export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  cookieStore.delete("authToken")
}

// Middleware to check if user is authenticated
export async function requireAuth() {
  const profile = await getUserProfile()

  if (!profile.success) {
    redirect("/login")
  }

  return profile.data
}

// Middleware to check if user is a teacher
export async function requireTeacher() {
  const profile = await getUserProfile()

  if (!profile.success || profile.data.role !== "teacher") {
    redirect("/login?role=teacher")
  }

  return profile.data
}
