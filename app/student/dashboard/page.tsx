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
import useAuthStore from "@/hooks/use-auth-token-store"

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
  const clearToken = useAuthStore((state) => state.logout)
  const [isLoading, setIsLoading] = useState(false)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [userProfile, setUserProfile] = useState<{ name: string; rollNumber: string; subjects?: string[] } | null>(null)
  const [historySubject, setHistorySubject] = useState("all")
  const [historyDate, setHistoryDate] = useState<Date | undefined>(undefined)
  const [absenteeDate, setAbsenteeDate] = useState<Date | undefined>(new Date())
  const [absences, setAbsences] = useState<{ subject: string; date: string; status: string }[]>([])

  const totalRecords = attendanceHistory.length
  const presentCount = attendanceHistory.filter((record) => record.status === "present").length
  const lateCount = attendanceHistory.filter((record) => record.status === "late").length
  const seriousLateCount = attendanceHistory.filter((record) => record.status === "serious late").length
  const absenceAbsentCount = absences.filter((item) => String(item.status).toLowerCase() !== "leave").length
  const absenceLeaveCount = absences.filter((item) => String(item.status).toLowerCase() === "leave").length

  const attendanceSubjects = Array.from(
    new Set([...(userProfile?.subjects ?? []), ...attendanceHistory.map((record) => record.subject)].filter(Boolean)),
  )
  const filteredAttendanceHistory = attendanceHistory.filter((record) => {
    if (historySubject !== "all") {
      const selectedSubject = historySubject.trim().toLowerCase()
      const recordSubject = String(record.subject ?? "")
        .trim()
        .toLowerCase()
      if (recordSubject !== selectedSubject) return false
    }

    if (historyDate) {
      const selectedDate = format(historyDate, "yyyy-MM-dd")
      const parsed = new Date(record.date)
      const recordDate = Number.isNaN(parsed.getTime()) ? String(record.date).slice(0, 10) : format(parsed, "yyyy-MM-dd")
      if (recordDate !== selectedDate) return false
    }
    return true
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        const profile = await getUserProfile()
        if (!profile.success || !profile.data) {
          toast({
            title: "Authentication Error",
            description: "Please login to continue",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        if (profile.data.role !== "student") {
          if (profile.data.role === "admin") {
            router.push("/admin/panel")
          } else {
            router.push("/admin/dashboard")
          }
          return
        }

        setUserProfile(profile.data)

        const history = await getStudentAttendanceHistory()
        if (history.success && history.data) {
          setAttendanceHistory(history.data)
        } else {
          setAttendanceHistory([])
        }

        const selected = format(new Date(), "yyyy-MM-dd")
        const absenteeism = await getStudentAbsenteeismByDate({ date: selected })
        if (absenteeism.success && absenteeism.data) {
          setAbsences(absenteeism.data)
        } else {
          setAbsences([])
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
      if (result.success && result.data) {
        setAbsences(result.data)
      }
    }

    loadAbsenteeism()
  }, [absenteeDate])

  async function handleLogout() {
    await logout()
    clearToken()
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
        <div className="grid grid-cols-1 gap-4 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Student</CardDescription>
              <CardTitle className="text-2xl">{userProfile?.rollNumber ?? "-"}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">{userProfile?.name ?? "Not loaded"}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-2xl">{totalRecords}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">All subjects</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Present</CardDescription>
              <CardTitle className="text-2xl text-green-700">{presentCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">All time</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Late</CardDescription>
              <CardTitle className="text-2xl text-yellow-700">{lateCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">All time</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Serious Late</CardDescription>
              <CardTitle className="text-2xl text-red-700">{seriousLateCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">All time</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Absences</CardDescription>
              <CardTitle className="text-2xl">
                {absences.length}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({absenceAbsentCount} absent, {absenceLeaveCount} leave)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-500">
              {absenteeDate ? `Date: ${format(absenteeDate, "PPP")}` : "Pick a date"}
            </CardContent>
          </Card>
        </div>

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
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="h-10 rounded-md border px-3"
                    value={historySubject}
                    onChange={(e) => setHistorySubject(e.target.value)}
                  >
                    <option value="all">All Subjects</option>
                    {attendanceSubjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDate ? format(historyDate, "PPP") : "All Dates"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={historyDate} onSelect={setHistoryDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                {filteredAttendanceHistory.length > 0 ? (
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
                        {filteredAttendanceHistory.map((record, index) => (
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
                  <p className="text-gray-500 text-center py-4">No attendance records for selected filters</p>
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
                              <td
                                className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                  item.status === "leave" ? "text-blue-700" : "text-red-700"
                                }`}
                              >
                                {item.status === "leave" ? "Leave" : "Absent"}
                              </td>
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
