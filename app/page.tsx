import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Attendance System</h1>
          <div className="flex space-x-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>For Students</CardTitle>
              <CardDescription>Mark your attendance easily with your roll number and subject</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Students can login with their credentials to mark their daily attendance.</p>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li>Simple attendance marking with just roll number and subject</li>
                <li>View your attendance history</li>
                <li>Secure login with email and roll number</li>
              </ul>
              <Link href="/register">
                <Button className="w-full">Register as Student</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>For Teachers</CardTitle>
              <CardDescription>Manage and monitor attendance records for your subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Teachers can only view and export attendance records for their assigned subjects.</p>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li>View daily attendance reports</li>
                <li>Export attendance data as downloadable files</li>
                <li>See only subject-relevant records</li>
                <li>Secure teacher dashboard</li>
              </ul>
              <Link href="/login?role=teacher">
                <Button variant="outline" className="w-full">
                  Login as Teacher
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Student Attendance System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
