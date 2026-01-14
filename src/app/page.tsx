'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen, Users, Calendar, Bell, MessageSquare, FileText, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function HomePage() {
  const { user, profile, loading } = useAuth()

  const features = [
    { icon: BookOpen, title: 'Study Materials', description: 'Access notes, PDFs, and assignments anytime' },
    { icon: Calendar, title: 'Timetable & Schedules', description: 'View class schedules and exam timetables' },
    { icon: Bell, title: 'Notices & Announcements', description: 'Stay updated with college announcements' },
    { icon: Users, title: 'Attendance Tracking', description: 'Monitor your attendance records' },
    { icon: MessageSquare, title: 'Faculty Communication', description: 'Direct messaging with teachers' },
    { icon: FileText, title: 'Assignment Submission', description: 'Submit assignments online easily' },
  ]

  const benefits = [
    'Reduce manual and paper-based work',
    'Improve student-faculty communication',
    'Digital access to all study materials',
    'Organized academic life',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%232563eb%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
      
      <nav className="relative z-10 border-b bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">EduHub</span>
            </div>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
              ) : user && profile ? (
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Go to Dashboard
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                Student Facilitator Platform
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 animate-fade-in animate-delay-100">
                Your Complete
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Academic </span>
                Companion
              </h1>
              <p className="text-xl text-slate-600 mb-10 animate-fade-in animate-delay-200">
                A centralized platform for students, faculty, and administrators to manage academic activities, 
                communication, and resources seamlessly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animate-delay-300">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                    Start Learning Today
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base border-2">
                    Sign In to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Powerful features designed to make academic life organized and stress-free
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                  Built for Modern
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Education</span>
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                  EduHub acts as a digital assistant for students and a communication bridge between 
                  students, faculty, and college administration.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-1">
                  <div className="h-full w-full rounded-[22px] bg-white p-8 flex flex-col justify-center">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50">
                        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Student Portal</p>
                          <p className="text-sm text-slate-600">View courses, grades & more</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50">
                        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Faculty Dashboard</p>
                          <p className="text-sm text-slate-600">Manage classes & students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50">
                        <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Admin Control</p>
                          <p className="text-sm text-slate-600">Full system management</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Academic Experience?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join thousands of students and educators already using EduHub
            </p>
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base bg-white text-blue-600 hover:bg-blue-50 shadow-xl">
                Get Started for Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t bg-white/70 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">EduHub</span>
            </div>
            <p className="text-slate-600 text-sm">
              &copy; {new Date().getFullYear()} EduHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
