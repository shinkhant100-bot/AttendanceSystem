"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type AuthUser = {
  name?: string
  email?: string
  role?: "student" | "teacher" | "admin"
  rollNumber?: string
  subjects?: string[]
  [key: string]: unknown
}

type AuthStore = {
  token: string | null
  user: AuthUser | null
  setAuth: (payload: { token: string | null; user: AuthUser | null }) => void
  logout: () => void
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: ({ token, user }: { token: string | null; user: AuthUser | null }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "auth-storage" },
  )
)

export default useAuthStore
