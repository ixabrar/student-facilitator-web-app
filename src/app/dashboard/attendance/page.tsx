'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Calendar, BarChart3, CheckCircle, XCircle, Clock } from 'lucide-react'

interface AttendanceRecord {
  _id: string
  studentId: string
  courseId: string
  date: string
  status: 'present' | 'absent' | 'late'
  createdAt: string
}

interface Course {
  _id: string
  name: string
  code: string
  facultyId: string
}

interface Student {
  _id: string
  userId: string
  fullName: string
  email: string
  role: string
}

export default function AttendancePage() {
  const { profile, user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const fetchCourses = async () => {
    try {
      let url = '/api/courses'
      if (profile?.role === 'faculty' && profile._id) {
        url += `?facultyId=${profile._id}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setCourses(data || [])
    } catch (error: any) {
      console.error('Failed to load courses', error)
    }
  }

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      let url = '/api/attendance'
      if (profile?.role === 'student' && profile?.userId) {
        url += `?studentId=${profile.userId}`
      } else if (selectedCourse) {
        url += `?courseId=${selectedCourse}`
      }
      const res = await fetch(url, { headers })
      const data = await res.json()
      setAttendance(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('Failed to load attendance', error)
      setAttendance([])
    }
    setLoading(false)
  }

  const fetchStudents = async (courseId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      // First get the course to find its department
      const courseRes = await fetch(`/api/courses`, { headers })
      const allCourses = await courseRes.json()
      const course = allCourses.find((c: any) => c._id === courseId)
      
      if (!course || !course.departmentId) {
        setStudents([])
        return
      }

      // Get all students from the same department as the course
      const studentsRes = await fetch(`/api/profiles?role=student`, { headers })
      const allProfiles = await studentsRes.json()
      
      // Filter students by department
      const deptStudents = allProfiles.filter((s: any) => 
        s.role === 'student' && 
        s.department && 
        s.department.toString() === course.departmentId.toString()
      )
      
      setStudents(deptStudents)
    } catch (error: any) {
      console.error('Failed to load students', error)
      setStudents([])
    }
  }

  useEffect(() => {
    if (profile) {
      fetchCourses()
      fetchAttendance()
    }
  }, [profile, user])

  useEffect(() => {
    if (selectedCourse && profile?.role === 'faculty') {
      fetchStudents(selectedCourse)
    }
  }, [selectedCourse])

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    setMarking(true)
    try {
      // Find the student's userId from their profile
      const student = students.find(s => s._id === studentId)
      if (!student || !student.userId) {
        toast.error('Student user ID not found')
        return
      }

      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: student.userId, // Use userId, not profile._id
          courseId: selectedCourse,
          date: selectedDate,
          status,
          facultyId: profile?.role === 'faculty' ? profile._id : undefined
        })
      })

      if (!res.ok) throw new Error('Failed to mark attendance')
      toast.success('Attendance marked')
      await fetchAttendance()
    } catch (error: any) {
      console.error('Error marking attendance:', error)
      toast.error('Failed to mark attendance')
    } finally {
      setMarking(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Present</Badge>
      case 'absent':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Late</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const calculateStats = () => {
    if (attendance.length === 0) return { present: 0, absent: 0, late: 0, percentage: 0 }
    const present = attendance.filter(a => a.status === 'present').length
    const absent = attendance.filter(a => a.status === 'absent').length
    const late = attendance.filter(a => a.status === 'late').length
    const percentage = Math.round(((present + late) / attendance.length) * 100)
    return { present, absent, late, percentage }
  }

  if (!profile) return null

  const stats = calculateStats()

  if (profile.role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
          <p className="text-muted-foreground">View your attendance records</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-40 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ) : attendance.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attendance records found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => {
                    const course = courses.find(c => c._id === record.courseId)
                    return (
                      <TableRow key={record._id}>
                        <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{course ? `${course.code} - ${course.name}` : record.courseId}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>
        <p className="text-muted-foreground">Record student attendance for your courses</p>
      </div>

      <div className="flex gap-4">
        <div className="w-64">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          type="date"
          title="Select date for attendance"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
          aria-label="Attendance date"
        />
      </div>

      {!selectedCourse ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a course to mark attendance</p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No students enrolled in this course</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Students - {format(new Date(selectedDate), 'MMMM d, yyyy')}</CardTitle>
            <CardDescription>{students.length} students enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const record = attendance.find(a => a.studentId === student._id)
                  return (
                    <TableRow key={student._id}>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{record ? getStatusBadge(record.status) : <Badge variant="outline">Not marked</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={record?.status === 'present' ? 'default' : 'outline'}
                            onClick={() => markAttendance(student._id, 'present')}
                            disabled={marking}
                            className={record?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                            title="Mark present"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'absent' ? 'destructive' : 'outline'}
                            onClick={() => markAttendance(student._id, 'absent')}
                            disabled={marking}
                            title="Mark absent"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'late' ? 'default' : 'outline'}
                            onClick={() => markAttendance(student._id, 'late')}
                            disabled={marking}
                            className={record?.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                            title="Mark late"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

