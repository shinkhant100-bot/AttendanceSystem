"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { getStudentAttendanceHistory, getStudentAbsenteeismByDate } from "@/app/actions/attendance-actions"
import { useToast } from "@/hooks/use-toast"
import type { AttendanceRecord } from "@/app/types"
import { getUserProfile, logout } from "@/app/actions/auth-actions"
import { useRouter } from "next/navigation"

function getStatusBadgeClass(status: AttendanceRecord["status"]) {
  if (status === "present") return "bg-green-100 text-green-800"
  if (status === "late") return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

function getStatusLabel(status: AttendanceRecord["status"]) {
  if (status === "serious late") return "Serious Late"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function StudentDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [userProfile, setUserProfile] = useState<{ name: string; rollNumber: string } | null>(null)
  const [absenteeDate, setAbsenteeDate] = useState<Date | undefined>(new Date())
  const [absences, setAbsences] = useState<{ subject: string; date: string; status: string }[]>([])

  useEffect(() => {
    async function loadUserData() {
      try {
        const profile = await getUserProfile()
        if (!profile.success) {
          toast({
            title: "Authentication Error",
            description: "Please login to continue",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        if (profile.data.role !== "student") {
          router.push("/admin/dashboard")
          return
        }

        setUserProfile(profile.data)

        const history = await getStudentAttendanceHistory()
        if (history.success) {
          setAttendanceHistory(history.data)
        }

        const selected = format(new Date(), "yyyy-MM-dd")
        const absenteeism = await getStudentAbsenteeismByDate({ date: selected })
        if (absenteeism.success) {
          setAbsences(absenteeism.data)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    loadUserData()
  }, [router, toast])

  useEffect(() => {
    async function loadAbsenteeism() {
      if (!absenteeDate) return
      const selected = format(absenteeDate, "yyyy-MM-dd")
      const result = await getStudentAbsenteeismByDate({ date: selected })
      if (result.success) {
        setAbsences(result.data)
      }
    }

    loadAbsenteeism()
  }, [absenteeDate])

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <div className="flex items-center space-x-4">
            {userProfile && <p className="text-gray-600">Welcome, {userProfile.name}</p>}
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>
                  Attendance is marked by teacher fingerprint scan. Students can only view history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceHistory.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceHistory.map((record, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.subject}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}
                              >
                                {getStatusLabel(record.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No attendance records found</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Absenteeism</CardTitle>
                <CardDescription>Choose a date to view absences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {absenteeDate ? format(absenteeDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={absenteeDate} onSelect={setAbsenteeDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {absences.length > 0 ? (
                          absences.map((item, index) => (
                            <tr key={`${item.subject}-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-medium">Absent</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                              No absences for selected date
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
