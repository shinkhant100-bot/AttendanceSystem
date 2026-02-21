"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  assignTeacherToCourse,
  createCourse,
  enrollStudentInCourse,
  getAdminPanelData,
  getUserProfile,
  logout,
  registerStudentByAdmin,
  registerTeacherByAdmin,
} from "@/app/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"
import useAuthStore from "@/hooks/use-auth-token-store"

interface Course {
  id: number
  name: string
  teacherEmail: string | null
  studentRollNumbers: string[]
}

interface TeacherOption {
  name: string
  email: string
}

interface StudentOption {
  name: string
  rollNumber: string
  email: string
}

export default function AdminPanelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const clearToken = useAuthStore((state) => state.logout)

  const [isLoading, setIsLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])

  const [newCourseName, setNewCourseName] = useState("")
  const [selectedCourseForTeacher, setSelectedCourseForTeacher] = useState("")
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState("")
  const [selectedCourseForStudent, setSelectedCourseForStudent] = useState("")
  const [selectedStudentRoll, setSelectedStudentRoll] = useState("")

  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    rollNumber: "",
    phone: "",
    password: "",
  })
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  async function loadAdminData() {
    const data = await getAdminPanelData()
    if (data.success) {
      setCourses(data.data.courses)
      setTeachers(data.data.teachers)
      setStudents(data.data.students)
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const profile = await getUserProfile()
        if (!profile.success || profile.data.role !== "admin") {
          toast({
            title: "Access Denied",
            description: "You must be an admin to access this page",
            variant: "destructive",
          })
          router.push("/login?role=admin")
          return
        }

        await loadAdminData()
      } finally {
        setIsLoading(false)
      }
    }

    boot()
  }, [router, toast])

  async function handleCreateCourse() {
    const result = await createCourse({ name: newCourseName })
    if (result.success) {
      setNewCourseName("")
      await loadAdminData()
      toast({ title: "Success", description: "Course created" })
    } else {
      toast({ title: "Error", description: result.error || "Failed", variant: "destructive" })
    }
  }

  async function handleAssignTeacher() {
    const result = await assignTeacherToCourse({
      courseId: Number(selectedCourseForTeacher),
      teacherEmail: selectedTeacherEmail,
    })
    if (result.success) {
      await loadAdminData()
      toast({ title: "Success", description: "Teacher assigned to course" })
    } else {
      toast({ title: "Error", description: result.error || "Failed", variant: "destructive" })
    }
  }

  async function handleEnrollStudent() {
    const result = await enrollStudentInCourse({
      courseId: Number(selectedCourseForStudent),
      studentRollNumber: selectedStudentRoll,
    })
    if (result.success) {
      await loadAdminData()
      toast({ title: "Success", description: "Student enrolled to course" })
    } else {
      toast({ title: "Error", description: result.error || "Failed", variant: "destructive" })
    }
  }

  async function handleRegisterStudent() {
    const result = await registerStudentByAdmin(studentForm)
    if (result.success) {
      setStudentForm({ name: "", email: "", rollNumber: "", phone: "", password: "" })
      await loadAdminData()
      toast({ title: "Success", description: "Student registered" })
    } else {
      toast({ title: "Error", description: result.error || "Failed", variant: "destructive" })
    }
  }

  async function handleRegisterTeacher() {
    const result = await registerTeacherByAdmin(teacherForm)
    if (result.success) {
      setTeacherForm({ name: "", email: "", phone: "", password: "" })
      await loadAdminData()
      toast({ title: "Success", description: "Teacher registered" })
    } else {
      toast({ title: "Error", description: result.error || "Failed", variant: "destructive" })
    }
  }

  async function handleLogout() {
    await logout()
    clearToken()
    router.push("/login?role=admin")
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
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Course</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input placeholder="Course name" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} />
            <Button onClick={handleCreateCourse}>Create</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Teacher</CardTitle>
            <CardDescription>Choose course and teacher</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="h-10 rounded-md border px-3"
              value={selectedCourseForTeacher}
              onChange={(e) => setSelectedCourseForTeacher(e.target.value)}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border px-3"
              value={selectedTeacherEmail}
              onChange={(e) => setSelectedTeacherEmail(e.target.value)}
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.email} value={t.email}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
            <Button onClick={handleAssignTeacher} disabled={!selectedCourseForTeacher || !selectedTeacherEmail}>
              Assign
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enroll Student</CardTitle>
            <CardDescription>Choose course and student (dropdown)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="h-10 rounded-md border px-3"
              value={selectedCourseForStudent}
              onChange={(e) => setSelectedCourseForStudent(e.target.value)}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border px-3"
              value={selectedStudentRoll}
              onChange={(e) => setSelectedStudentRoll(e.target.value)}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.rollNumber} value={s.rollNumber}>
                  {s.name} ({s.rollNumber})
                </option>
              ))}
            </select>
            <Button onClick={handleEnrollStudent} disabled={!selectedCourseForStudent || !selectedStudentRoll}>
              Enroll
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Register Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label>Name</Label>
              <Input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
              <Label>Email</Label>
              <Input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              />
              <Label>Roll Number</Label>
              <Input
                value={studentForm.rollNumber}
                onChange={(e) => setStudentForm({ ...studentForm, rollNumber: e.target.value })}
              />
              <Label>Phone</Label>
              <Input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
              <Label>Password</Label>
              <Input
                type="password"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
              />
              <Button onClick={handleRegisterStudent}>Register Student</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Register Teacher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label>Name</Label>
              <Input value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} />
              <Label>Email</Label>
              <Input
                type="email"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
              />
              <Label>Phone</Label>
              <Input value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} />
              <Label>Password</Label>
              <Input
                type="password"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
              />
              <Button onClick={handleRegisterTeacher}>Register Teacher</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Courses Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrolled Students
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{course.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {teachers.find((t) => t.email === course.teacherEmail)?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{course.studentRollNumbers.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
