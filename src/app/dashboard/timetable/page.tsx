'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin } from 'lucide-react'
import type { Timetable, Course } from '@/lib/supabase/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const { profile } = useAuth()
  const [timetable, setTimetable] = useState<Timetable[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTimetable = async () => {
      if (profile?.role === 'student') {
        const { data: enrollments } = await supabase
          .from('student_courses')
          .select('course_id')
          .eq('student_id', profile.id)
        
        const courseIds = enrollments?.map(e => e.course_id) || []
        
        if (courseIds.length > 0) {
          const { data } = await supabase
            .from('timetable')
            .select('*, course:courses(*)')
            .in('course_id', courseIds)
            .order('day_of_week')
            .order('start_time')
          
          if (data) setTimetable(data as Timetable[])
        }
      }
      setLoading(false)
    }
    
    if (profile) fetchTimetable()
  }, [profile])

  const groupByDay = () => {
    const grouped: Record<number, Timetable[]> = {}
    timetable.forEach((item) => {
      if (!grouped[item.day_of_week]) {
        grouped[item.day_of_week] = []
      }
      grouped[item.day_of_week].push(item)
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
                        key={item.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {(item.course as Course)?.code?.substring(0, 2) || 'CS'}
                          </div>
                          <div>
                            <p className="font-semibold">{(item.course as Course)?.name}</p>
                            <p className="text-sm text-muted-foreground">{(item.course as Course)?.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
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
