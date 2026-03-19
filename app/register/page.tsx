"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registration Disabled</CardTitle>
          <CardDescription className="text-center">Only admins can register students and teachers.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-gray-600">
          Ask an admin to create your account, then use the login page.
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-gray-600 w-full">
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Go to Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
