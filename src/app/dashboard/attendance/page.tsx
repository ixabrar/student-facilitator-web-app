'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { BarChart3, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'
import type { Attendance, Course, Profile } from '@/lib/supabase/types'

export default function AttendancePage() {
  const { profile } = useAuth()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const supabase = createClient()

  const fetchAttendance = async () => {
    if (profile?.role === 'student') {
      const { data } = await supabase
        .from('attendance')
        .select('*, course:courses(*)')
        .eq('student_id', profile.id)
        .order('date', { ascending: false })
      
      if (data) setAttendance(data as Attendance[])
    } else if (profile?.role === 'faculty' && selectedCourse && selectedDate) {
      const { data } = await supabase
        .from('attendance')
        .select('*, student:profiles(*), course:courses(*)')
        .eq('course_id', selectedCourse)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })
      
      if (data) setAttendance(data as Attendance[])
    }
    setLoading(false)
  }

  const fetchStudents = async () => {
    if (selectedCourse) {
      const { data } = await supabase
        .from('student_courses')
        .select('student:profiles(*)')
        .eq('course_id', selectedCourse)
      
      if (data) {
        setStudents(data.map(d => d.student as unknown as Profile).filter(Boolean))
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role === 'faculty') {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('faculty_id', profile.id)
          .order('name')
        if (coursesData) setCourses(coursesData)
      } else if (profile?.role === 'student') {
        await fetchAttendance()
      }
      setLoading(false)
    }
    
    if (profile) fetchData()
  }, [profile])

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents()
      fetchAttendance()
    }
  }, [selectedCourse, selectedDate])

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    setMarking(true)
    
    const { error } = await supabase
      .from('attendance')
      .upsert({
        student_id: studentId,
        course_id: selectedCourse,
        date: selectedDate,
        status,
        marked_by: profile?.id
      }, { onConflict: 'student_id,course_id,date' })
    
    if (error) {
      toast.error(error.message)
      setMarking(false)
      return
    }
    
    toast.success('Attendance marked')
    fetchAttendance()
    setMarking(false)
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

        <div className="grid sm:grid-cols-4 gap-4">
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
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{(record.course as Course)?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
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
                <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
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
                  const record = attendance.find(a => a.student_id === student.id)
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{record ? getStatusBadge(record.status) : <Badge variant="outline">Not marked</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={record?.status === 'present' ? 'default' : 'outline'}
                            onClick={() => markAttendance(student.id, 'present')}
                            disabled={marking}
                            className={record?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'absent' ? 'destructive' : 'outline'}
                            onClick={() => markAttendance(student.id, 'absent')}
                            disabled={marking}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'late' ? 'default' : 'outline'}
                            onClick={() => markAttendance(student.id, 'late')}
                            disabled={marking}
                            className={record?.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
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
