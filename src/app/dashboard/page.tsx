'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { BookOpen, FileText, ClipboardList, Bell, Calendar, Users, Building2, BarChart3, Clock } from 'lucide-react'
import Link from 'next/link'
import { ensureArray } from '@/lib/fetchUtils'

interface Notice {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  isGlobal: boolean
  createdAt: string
}

interface Course {
  _id: string
  code: string
  name: string
  credits: number
}

interface Assignment {
  _id: string
  title: string
  dueDate: string
  courseId: string
}

interface Event {
  _id: string
  title: string
  eventDate: string
  description?: string
}

interface Faculty {
  _id: string
  fullName: string
  email: string
  role: string
  department: string
}

interface Student {
  _id: string
  fullName: string
  email: string
  department: string
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, departments: 0 })
  const [facultyStats, setFacultyStats] = useState({ courses: 0, materials: 0, assignments: 0, students: 0 })
  const [departmentFaculty, setDepartmentFaculty] = useState<Faculty[]>([])
  const [departmentStats, setDepartmentStats] = useState({ faculty: 0, students: 0, courses: 0, approvals: 0 })
  const [principalData, setPrincipalData] = useState<{
    departments: Array<{
      _id: string
      name: string
      hodName?: string
      facultyCount: number
      studentCount: number
      coursesCount: number
    }>
    totalStats: { departments: number; faculty: number; students: number; courses: number }
  }>({ departments: [], totalStats: { departments: 0, faculty: 0, students: 0, courses: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('authToken')
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        // Fetch notices
        try {
          const noticesRes = await fetch('/api/notices?limit=5', { headers })
          if (noticesRes.ok) {
            const noticesData = await noticesRes.json()
            setNotices(ensureArray(noticesData))
          }
        } catch (err) {
          console.error('Error fetching notices:', err)
        }

        // Fetch user-specific data based on role
        if (profile?.userId) {
          if (profile.role === 'student') {
            try {
              const coursesRes = await fetch(`/api/users/${profile.userId}/courses`, { headers })
              if (coursesRes.ok) {
                const coursesData = await coursesRes.json()
                setCourses(ensureArray(coursesData))
              }
            } catch (err) {
              console.error('Error fetching student courses:', err)
            }
          } else if (profile.role === 'faculty') {
            try {
              // Fetch faculty courses
              const coursesRes = await fetch(`/api/courses?facultyId=${profile._id}`, { headers })
              if (coursesRes.ok) {
                const coursesData = await coursesRes.json()
                const facultyCourses = ensureArray(coursesData)
                setCourses(facultyCourses)
                
                // Fetch enrollments count
                let totalStudents = 0
                for (const course of facultyCourses) {
                  const enrollRes = await fetch(`/api/enrollments?courseId=${course._id}`, { headers })
                  if (enrollRes.ok) {
                    const enrollData = await enrollRes.json()
                    totalStudents += ensureArray(enrollData).length
                  }
                }
                
                // Fetch materials count
                const materialsRes = await fetch(`/api/materials?facultyId=${profile._id}`, { headers })
                let materialsCount = 0
                if (materialsRes.ok) {
                  const materialsData = await materialsRes.json()
                  materialsCount = ensureArray(materialsData).length
                }
                
                // Fetch assignments count
                const courseIds = facultyCourses.map((c: any) => c._id)
                let assignmentsCount = 0
                if (courseIds.length > 0) {
                  const assignRes = await fetch(`/api/assignments?courseIds=${courseIds.join(',')}`, { headers })
                  if (assignRes.ok) {
                    const assignData = await assignRes.json()
                    assignmentsCount = ensureArray(assignData).length
                  }
                }
                
                setFacultyStats({
                  courses: facultyCourses.length,
                  materials: materialsCount,
                  assignments: assignmentsCount,
                  students: totalStudents
                })
              }
            } catch (err) {
              console.error('Error fetching faculty courses:', err)
            }
          } else if (profile.role === 'hod') {
            try {
              // Fetch department faculty - try both departmentName and department ID
              let departmentFilter = profile.department
              const facultyRes = await fetch(`/api/profiles?role=faculty&department=${departmentFilter}`, { headers })
              if (facultyRes.ok) {
                const facultyData = await facultyRes.json()
                setDepartmentFaculty(ensureArray(facultyData))
                setDepartmentStats(prev => ({
                  ...prev,
                  faculty: ensureArray(facultyData).length
                }))
              } else {
                console.error('Error fetching faculty:', facultyRes.status, await facultyRes.json())
              }
              
              // Fetch department courses
              const coursesRes = await fetch(`/api/courses?departmentId=${profile.department}`, { headers })
              if (coursesRes.ok) {
                const coursesData = await coursesRes.json()
                setCourses(ensureArray(coursesData))
                setDepartmentStats(prev => ({
                  ...prev,
                  courses: ensureArray(coursesData).length
                }))
              } else {
                console.error('Error fetching courses:', coursesRes.status, await coursesRes.json())
              }

              // Fetch pending approvals
              const approvalsRes = await fetch('/api/admin/faculty-approvals', { headers })
              if (approvalsRes.ok) {
                const approvalsData = await approvalsRes.json()
                setDepartmentStats(prev => ({
                  ...prev,
                  approvals: ensureArray(approvalsData).length
                }))
              } else {
                console.error('Error fetching approvals:', approvalsRes.status, await approvalsRes.json())
              }
            } catch (err) {
              console.error('Error fetching HOD data:', err)
            }
          } else if (profile.role === 'principal') {
            try {
              // Fetch all departments with details
              const deptRes = await fetch('/api/departments', { headers })
              if (deptRes.ok) {
                const departments = await deptRes.json()
                const deptArray = ensureArray(departments)
                
                // Fetch details for each department
                const enrichedDepts = await Promise.all(
                  deptArray.map(async (dept: any) => {
                    try {
                      // Get HOD info
                      const hodRes = await fetch(`/api/faculties?department=${dept._id}&role=hod`, { headers })
                      let hodName = 'Not Assigned'
                      if (hodRes.ok) {
                        const hodData = await hodRes.json()
                        const hods = ensureArray(hodData)
                        if (hods.length > 0) {
                          hodName = hods[0].fullName || hods[0].full_name || 'Unknown'
                        }
                      }
                      
                      // Get faculty count
                      const facultyRes = await fetch(`/api/faculties?department=${dept._id}`, { headers })
                      let facultyCount = 0
                      if (facultyRes.ok) {
                        const facultyData = await facultyRes.json()
                        facultyCount = ensureArray(facultyData).length
                      }
                      
                      // Get student count
                      const studentsRes = await fetch(`/api/profiles?department=${dept._id}&role=student`, { headers })
                      let studentCount = 0
                      if (studentsRes.ok) {
                        const studentsData = await studentsRes.json()
                        studentCount = ensureArray(studentsData).length
                      }
                      
                      // Get courses count
                      const coursesRes = await fetch(`/api/courses?department=${dept._id}`, { headers })
                      let coursesCount = 0
                      if (coursesRes.ok) {
                        const coursesData = await coursesRes.json()
                        coursesCount = ensureArray(coursesData).length
                      }
                      
                      return {
                        _id: dept._id,
                        name: dept.name,
                        hodName,
                        facultyCount,
                        studentCount,
                        coursesCount
                      }
                    } catch (err) {
                      console.error(`Error fetching data for department ${dept.name}:`, err)
                      return {
                        _id: dept._id,
                        name: dept.name,
                        hodName: 'Error',
                        facultyCount: 0,
                        studentCount: 0,
                        coursesCount: 0
                      }
                    }
                  })
                )
                
                // Calculate total stats
                const totalStats = {
                  departments: enrichedDepts.length,
                  faculty: enrichedDepts.reduce((sum, d) => sum + d.facultyCount, 0),
                  students: enrichedDepts.reduce((sum, d) => sum + d.studentCount, 0),
                  courses: enrichedDepts.reduce((sum, d) => sum + d.coursesCount, 0)
                }
                
                setPrincipalData({ departments: enrichedDepts, totalStats })
              }
            } catch (err) {
              console.error('Error fetching principal data:', err)
            }
          } else if (profile.role === 'admin') {
            try {
              const statsRes = await fetch('/api/admin/stats', { headers })
              if (statsRes.ok) {
                const statsData = await statsRes.json()
                setStats(statsData || { students: 0, faculty: 0, courses: 0, departments: 0 })
              }
            } catch (err) {
              console.error('Error fetching admin stats:', err)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
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
                  <div key={assignment._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-muted-foreground">{assignment.courseId}</p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(assignment.dueDate), 'MMM d')}
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
                  <Link key={notice._id} href="/dashboard/notices" className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
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
                <p className="text-2xl font-bold">{facultyStats.courses}</p>
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
                <p className="text-2xl font-bold">{facultyStats.materials}</p>
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
                <p className="text-2xl font-bold">{facultyStats.assignments}</p>
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
                <p className="text-2xl font-bold">{facultyStats.students}</p>
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
                  <Link key={course._id} href="/dashboard/courses" className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code}</p>
                      </div>
                      <Badge variant="secondary">{course.credits} credits</Badge>
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
                  <div key={notice._id} className="p-3 rounded-lg bg-slate-50">
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

  const renderHODDashboard = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departmentStats.faculty}</p>
                <p className="text-sm text-muted-foreground">Department Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departmentStats.courses}</p>
                <p className="text-sm text-muted-foreground">Department Courses</p>
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
                <p className="text-2xl font-bold">{departmentStats.approvals}</p>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
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
                <p className="text-2xl font-bold">{profile?.departmentName || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Department</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Department Faculty
            </CardTitle>
            <CardDescription>Faculty members in your department</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentFaculty.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No faculty members</p>
            ) : (
              <div className="space-y-3">
                {departmentFaculty.slice(0, 5).map((faculty) => (
                  <div key={faculty._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium">{faculty.fullName}</p>
                      <p className="text-sm text-muted-foreground">{faculty.email}</p>
                    </div>
                    <Badge variant="outline" className={`${faculty.role === 'hod' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {faculty.role === 'hod' ? 'HOD' : 'Faculty'}
                    </Badge>
                  </div>
                ))}
                {departmentFaculty.length > 5 && (
                  <Link href="/dashboard/faculty">
                    <p className="text-sm text-blue-600 hover:text-blue-800 pt-2">View all faculty →</p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Department Courses
            </CardTitle>
            <CardDescription>Courses offered by your department</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No courses</p>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <div key={course._id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code}</p>
                      </div>
                      <Badge variant="secondary">{course.credits} credits</Badge>
                    </div>
                  </div>
                ))}
                {courses.length > 5 && (
                  <Link href="/dashboard/courses">
                    <p className="text-sm text-blue-600 hover:text-blue-800 pt-2">View all courses →</p>
                  </Link>
                )}
              </div>
            )}
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
                  <div key={notice._id} className="p-3 rounded-lg bg-slate-50">
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
              Quick Actions
            </CardTitle>
            <CardDescription>Common HOD tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/users">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Faculty
                </Button>
              </Link>
              <Link href="/dashboard/courses">
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Courses
                </Button>
              </Link>
              <Link href="/dashboard/notices">
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Post Notice
                </Button>
              </Link>
              <Link href="/dashboard/attendance">
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderPrincipalDashboard = () => (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{principalData.totalStats.departments}</p>
                <p className="text-sm text-muted-foreground">Total Departments</p>
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
                <p className="text-2xl font-bold">{principalData.totalStats.faculty}</p>
                <p className="text-sm text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{principalData.totalStats.students}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{principalData.totalStats.courses}</p>
                <p className="text-sm text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Departments Overview
              </CardTitle>
              <CardDescription>All departments with their HODs and statistics</CardDescription>
            </div>
            <Link href="/dashboard/departments">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {principalData.departments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No departments found</p>
          ) : (
            <div className="space-y-4">
              {principalData.departments.map((dept) => (
                <div key={dept._id} className="p-4 rounded-lg border bg-gradient-to-r from-slate-50 to-white hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-900">{dept.name}</h3>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {dept.coursesCount} Courses
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">HOD:</span>
                        <span className="text-sm text-slate-900">{dept.hodName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{dept.facultyCount}</p>
                            <p className="text-xs text-muted-foreground">Faculty Members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{dept.studentCount}</p>
                            <p className="text-xs text-muted-foreground">Students Enrolled</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System-wide Notices and Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              System-wide Notices
            </CardTitle>
            <CardDescription>Recent announcements and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notices</p>
            ) : (
              <div className="space-y-3">
                {notices.map((notice) => (
                  <div key={notice._id} className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{notice.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notice.content}</p>
                      </div>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                        {notice.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/notices">
                  <p className="text-sm text-blue-600 hover:text-blue-800 pt-2 text-center">View all notices →</p>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Administrative tasks and oversight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/departments">
                <Button className="w-full justify-start" variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Departments
                </Button>
              </Link>
              <Link href="/dashboard/faculty">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View All Faculty
                </Button>
              </Link>
              <Link href="/dashboard/users">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View All Students
                </Button>
              </Link>
              <Link href="/dashboard/notices">
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Post System Notice
                </Button>
              </Link>
              <Link href="/dashboard/courses">
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View All Courses
                </Button>
              </Link>
            </div>
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
                  <div key={notice._id} className="p-3 rounded-lg bg-slate-50">
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
                  <div key={event._id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                      </div>
                      <Badge variant="outline">
                        {format(new Date(event.eventDate), 'MMM d')}
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
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile.fullName}!</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your academic world</p>
      </div>

      {profile.role === 'student' && renderStudentDashboard()}
      {profile.role === 'faculty' && renderFacultyDashboard()}
      {profile.role === 'hod' && renderHODDashboard()}
      {profile.role === 'principal' && renderPrincipalDashboard()}
      {profile.role === 'admin' && renderAdminDashboard()}
    </div>
  )
}
