"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, Fingerprint, Search } from "lucide-react"
import {
  getAllAttendanceRecords,
  exportAttendanceData,
  getFingerprintRoster,
  markAttendanceByFingerprint,
  getTeacherAbsenteesByDate,
} from "@/app/actions/attendance-actions"
import { getUserProfile, logout } from "@/app/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"
import type { AttendanceRecord } from "@/app/types"

interface FingerprintStudent {
  name: string
  rollNumber: string
  fingerprintId: string
}

function getStatusBadgeClass(status: AttendanceRecord["status"]) {
  if (status === "present") return "bg-green-100 text-green-800"
  if (status === "late") return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

function getStatusLabel(status: AttendanceRecord["status"]) {
  if (status === "serious late") return "Serious Late"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function TeacherDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [teacherName, setTeacherName] = useState("")
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [fingerprintRoster, setFingerprintRoster] = useState<FingerprintStudent[]>([])
  const [absentees, setAbsentees] = useState<
    { studentName: string; rollNumber: string; subject: string; date: string; status: string }[]
  >([])
  const [absenteeDate, setAbsenteeDate] = useState<Date | undefined>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isExporting, setIsExporting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    async function checkTeacherAuth() {
      try {
        const profile = await getUserProfile()
        if (!profile.success || profile.data.role !== "teacher") {
          toast({
            title: "Access Denied",
            description: "You must be a teacher to access this page",
            variant: "destructive",
          })
          router.push("/login?role=teacher")
          return
        }

        setTeacherName(profile.data.name)
        setTeacherSubjects(profile.data.subjects ?? [])

        const records = await getAllAttendanceRecords()
        if (records.success) {
          setAttendanceRecords(records.data)
          setFilteredRecords(records.data)
        }

        const roster = await getFingerprintRoster()
        if (roster.success) {
          setFingerprintRoster(roster.data)
        }

        const today = format(new Date(), "yyyy-MM-dd")
        const absenteeData = await getTeacherAbsenteesByDate({ date: today })
        if (absenteeData.success) {
          setAbsentees(absenteeData.data)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load teacher data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    checkTeacherAuth()
  }, [router, toast])

  useEffect(() => {
    let filtered = [...attendanceRecords]

    if (searchQuery) {
      filtered = filtered.filter(
        (record) =>
          record.rollNumber.includes(searchQuery) ||
          record.studentName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      filtered = filtered.filter((record) => record.date.startsWith(dateString))
    }

    setFilteredRecords(filtered)
  }, [searchQuery, selectedDate, attendanceRecords])

  useEffect(() => {
    async function loadAbsenteesByDate() {
      if (!absenteeDate) return
      const selected = format(absenteeDate, "yyyy-MM-dd")
      const result = await getTeacherAbsenteesByDate({ date: selected })
      if (result.success) {
        setAbsentees(result.data)
      }
    }

    loadAbsenteesByDate()
  }, [absenteeDate])

  async function handleExportData() {
    setIsExporting(true)
    try {
      const result = await exportAttendanceData({
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
      })

      if (result.success) {
        toast({
          title: "Export Successful",
          description: "Attendance data has been exported",
        })
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to export attendance data",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  async function handleFingerprintScan(fingerprintId: string) {
    setIsScanning(true)
    try {
      const result = await markAttendanceByFingerprint({ fingerprintId })

      if (result.success) {
        toast({
          title: "Fingerprint Accepted",
          description: result.message || "Attendance marked",
        })

        const records = await getAllAttendanceRecords()
        if (records.success) {
          setAttendanceRecords(records.data)
          setFilteredRecords(records.data)
        }
      } else {
        toast({
          title: "Scan Failed",
          description: result.error || "Failed to mark attendance",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  async function handleLogout() {
    await logout()
    router.push("/login?role=teacher")
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
            {teacherName && <p className="text-sm text-gray-500">{teacherName}</p>}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="fingerprint">Fingerprint Scan</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="absentees">Absentees</TabsTrigger>
            <TabsTrigger value="export">Export Data</TabsTrigger>
          </TabsList>

          <TabsContent value="fingerprint" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fingerprint Attendance</CardTitle>
                <CardDescription>Click a student fingerprint to mark attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Current Subject: </span>
                    {teacherSubjects[0] || "Not assigned"}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {fingerprintRoster.map((student) => (
                      <Button
                        key={student.fingerprintId}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2"
                        onClick={() => handleFingerprintScan(student.fingerprintId)}
                        disabled={isScanning}
                      >
                        <div className="flex items-center gap-2 text-primary">
                          <Fingerprint className="h-4 w-4" />
                          <span>Fingerprint</span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.rollNumber}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>View and filter attendance records for your subjects only</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Your Subject(s): </span>
                    {teacherSubjects.length > 0 ? teacherSubjects.join(", ") : "Not assigned"}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search" className="sr-only">
                        Search
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          id="search"
                          placeholder="Search by roll number or name"
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="date-picker" className="sr-only">
                        Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date-picker"
                            variant="outline"
                            className="w-full justify-start text-left font-normal sm:w-[200px]"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roll Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
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
                        {filteredRecords.length > 0 ? (
                          filteredRecords.map((record, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.rollNumber}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.studentName}
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
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absentees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Absentees</CardTitle>
                <CardDescription>View absent students by date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div>
                      <Label htmlFor="absentee-date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="absentee-date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal sm:w-[220px]"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {absenteeDate ? format(absenteeDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={absenteeDate} onSelect={setAbsenteeDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roll Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
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
                        {absentees.length > 0 ? (
                          absentees.map((item, index) => (
                            <tr key={`${item.rollNumber}-${item.subject}-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.rollNumber}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.studentName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-medium">
                                Absent
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                              No absentees for selected date
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Attendance Data</CardTitle>
                <CardDescription>Download attendance records for your subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Your Subject(s): </span>
                    {teacherSubjects.length > 0 ? teacherSubjects.join(", ") : "Not assigned"}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="export-date">Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="export-date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                  </div>

                  <Button onClick={handleExportData} className="w-full" disabled={isExporting}>
                    {isExporting ? (
                      "Exporting..."
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export Attendance Data
                      </>
                    )}
                  </Button>

                  <div className="bg-gray-50 p-4 rounded-md border">
                    <h3 className="font-medium mb-2">Export Information</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                      <li>Exports are generated as CSV files</li>
                      <li>Files are secured with encryption</li>
                      <li>Only records for your assigned subjects are included</li>
                      <li>You can filter by date before exporting</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
