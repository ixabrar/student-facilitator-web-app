'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { BookOpen, FileText, ClipboardList, Bell, Calendar, Users, Building2, BarChart3, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Notice, Course, Assignment, Event } from '@/lib/supabase/types'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, departments: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (noticesData) setNotices(noticesData)

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(5)
      if (eventsData) setEvents(eventsData)

      if (profile?.role === 'student') {
        const { data: enrollments } = await supabase
          .from('student_courses')
          .select('course:courses(*)')
          .eq('student_id', profile.id)
        if (enrollments) {
          setCourses(enrollments.map(e => e.course as unknown as Course).filter(Boolean))
        }

        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('*, course:courses(*)')
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(5)
        if (assignmentsData) setAssignments(assignmentsData as Assignment[])
      } else if (profile?.role === 'faculty') {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('faculty_id', profile.id)
        if (coursesData) setCourses(coursesData)
      } else if (profile?.role === 'admin') {
        const { count: studentsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
        
        const { count: facultyCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'faculty')
        
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
        
        const { count: departmentsCount } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })

        setStats({
          students: studentsCount || 0,
          faculty: facultyCount || 0,
          courses: coursesCount || 0,
          departments: departmentsCount || 0
        })
      }
    }

    if (profile) fetchData()
  }, [profile])

  if (!profile) return null

  const renderStudentDashboard = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-sm text-muted-foreground">Enrolled Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">Pending Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notices.length}</p>
                <p className="text-sm text-muted-foreground">New Notices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
            <CardDescription>Assignments due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending assignments</p>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">{(assignment.course as Course)?.name}</p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(assignment.due_date), 'MMM d')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notices
            </CardTitle>
            <CardDescription>Latest announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notices</p>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <Link key={notice.id} href="/dashboard/notices" className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{notice.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{notice.content}</p>
                      </div>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                        {notice.priority}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderFacultyDashboard = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-sm text-muted-foreground">Teaching Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Materials Uploaded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Courses
            </CardTitle>
            <CardDescription>Courses you are teaching</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No courses assigned</p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Link key={course.id} href="/dashboard/courses" className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code}</p>
                      </div>
                      <Badge variant="secondary">Semester {course.semester}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notices
            </CardTitle>
            <CardDescription>Latest announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notices</p>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{notice.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{notice.content}</p>
                      </div>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                        {notice.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.students}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.faculty}</p>
                <p className="text-sm text-muted-foreground">Faculty Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.courses}</p>
                <p className="text-sm text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.departments}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notices
            </CardTitle>
            <CardDescription>System-wide announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notices</p>
            ) : (
              <div className="space-y-4">
                {notices.map((notice) => (
                  <div key={notice.id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{notice.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{notice.content}</p>
                      </div>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                        {notice.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Scheduled events</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming events</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                      </div>
                      <Badge variant="outline">
                        {format(new Date(event.event_date), 'MMM d')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile.full_name}!</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your academic world</p>
      </div>

      {profile.role === 'student' && renderStudentDashboard()}
      {profile.role === 'faculty' && renderFacultyDashboard()}
      {profile.role === 'admin' && renderAdminDashboard()}
    </div>
  )
}
