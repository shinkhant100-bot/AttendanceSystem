"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginUser } from "@/app/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"
import useAuthStore from "@/hooks/use-auth-token-store"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isTeacher = searchParams.get("role") === "teacher" || searchParams.get("role") === "admin"
  const { toast } = useToast()
  const { setAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const isTeacherLogin = isTeacher

    try {
      const result = await loginUser({ email, password, isTeacher: isTeacherLogin })

      if (result.success) {
        if (result.token) {
          setAuth({ token: result.token, user: null })
        }
        toast({
          title: "Login successful",
          description: "Redirecting to dashboard",
        })

        // Redirect based on user role
        if (isTeacherLogin) {
          router.push("/admin/dashboard")
        } else {
          router.push("/student/dashboard")
        }
      } else {
        logout()
        toast({
          title: "Login failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      logout()
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">

       
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isTeacher ? "Teacher Login" : "Student Login"}
          </CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your account ! </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

         
        </CardContent>


        <CardFooter className="flex flex-col">
          <p className="text-center text-sm text-gray-600 mt-2 w-full">
            {isTeacher ? (
              <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                Login as Student
              </Link>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                  Register
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
