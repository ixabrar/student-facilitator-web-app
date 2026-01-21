'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin } from 'lucide-react'

interface Course {
  _id: string
  name: string
  code: string
  facultyId: string
}

interface Timetable {
  _id: string
  courseId: string
  course?: Course
  dayOfWeek: number
  startTime: string
  endTime: string
  room?: string
  createdAt: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const { profile } = useAuth()
  const [timetable, setTimetable] = useState<Timetable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        if (profile?.role === 'student') {
          // Get student's enrolled courses
          const coursesRes = await fetch(`/api/users/${profile.id}/courses`)
          if (!coursesRes.ok) throw new Error('Failed to fetch student courses')
          const courseData = await coursesRes.json()
          const courseIds = courseData.map((c: any) => c._id)

          if (courseIds.length > 0) {
            // Get timetables for these courses
            const timetableRes = await fetch(`/api/timetables?courseIds=${courseIds.join(',')}`)
            if (!timetableRes.ok) throw new Error('Failed to fetch timetable')
            const data = await timetableRes.json()
            const sorted = data.sort((a: Timetable, b: Timetable) => {
              if (a.dayOfWeek !== b.dayOfWeek) {
                return a.dayOfWeek - b.dayOfWeek
              }
              return a.startTime.localeCompare(b.startTime)
            })
            setTimetable(sorted)
          }
        }
      } catch (error) {
        console.error('Error fetching timetable:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (profile) fetchTimetable()
  }, [profile])

  const groupByDay = () => {
    const grouped: Record<number, Timetable[]> = {}
    timetable.forEach((item) => {
      if (!grouped[item.dayOfWeek]) {
        grouped[item.dayOfWeek] = []
      }
      grouped[item.dayOfWeek].push(item)
    })
    return grouped
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const today = new Date().getDay()

  if (!profile) return null

  const groupedTimetable = groupByDay()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Class Timetable</h1>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : timetable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No timetable entries found</p>
            <p className="text-sm text-muted-foreground">Contact your faculty to add class schedules</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
            const dayClasses = groupedTimetable[dayIndex] || []
            if (dayClasses.length === 0) return null
            
            const isToday = dayIndex === today
            
            return (
              <Card key={dayIndex} className={isToday ? 'border-blue-500 shadow-md' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {DAYS[dayIndex]}
                    </CardTitle>
                    {isToday && (
                      <Badge className="bg-blue-100 text-blue-700">Today</Badge>
                    )}
                  </div>
                  <CardDescription>{dayClasses.length} class{dayClasses.length > 1 ? 'es' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayClasses.map((item) => (
                      <div 
                        key={item._id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {item.course?.code?.substring(0, 2) || 'CS'}
                          </div>
                          <div>
                            <p className="font-semibold">{item.course?.name}</p>
                            <p className="text-sm text-muted-foreground">{item.course?.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </div>
                          {item.room && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4" />
                              Room {item.room}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

