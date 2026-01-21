'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  GraduationCap, Home, BookOpen, FileText, Calendar, Bell, MessageSquare, 
  Users, Settings, LogOut, Menu, X, ClipboardList, Upload, BarChart3, Building2
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/courses', label: 'My Courses', icon: BookOpen },
    { href: '/dashboard/materials', label: 'Study Materials', icon: FileText },
    { href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/dashboard/timetable', label: 'Timetable', icon: Calendar },
    { href: '/dashboard/attendance', label: 'Attendance', icon: BarChart3 },
    { type: 'separator', label: 'Services' },
    { href: '/dashboard/bonafide', label: 'Bonafide Certificate', icon: FileText },
    { href: '/dashboard/leaving-certificate', label: 'Leaving Certificate', icon: FileText },
    { href: '/dashboard/fee-payments', label: 'Fee Payments', icon: FileText },
    { href: '/dashboard/scholarships', label: 'Scholarships', icon: GraduationCap },
    { type: 'separator', label: 'Communication' },
    { href: '/dashboard/notices', label: 'Notices', icon: Bell },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  ]

  const facultyLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/courses', label: 'My Courses', icon: BookOpen },
    { href: '/dashboard/materials', label: 'Study Materials', icon: FileText },
    { href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/dashboard/attendance', label: 'Mark Attendance', icon: BarChart3 },
    { type: 'separator', label: 'Services' },
    { href: '/dashboard/faculty/bonafide-requests', label: 'Bonafide Requests', icon: FileText },
    { href: '/dashboard/faculty/leaving-certificate-requests', label: 'LC Requests', icon: FileText },
    { href: '/dashboard/faculty/fee-payments', label: 'Fee Verification', icon: FileText },
    { href: '/dashboard/faculty/scholarships', label: 'Scholarships', icon: GraduationCap },
    { type: 'separator', label: 'Communication' },
    { href: '/dashboard/notices', label: 'Notices', icon: Bell },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  ]

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/users', label: 'Manage Users', icon: Users },
    { href: '/dashboard/departments', label: 'Departments', icon: Building2 },
    { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
    { href: '/dashboard/notices', label: 'Notices', icon: Bell },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  ]

  const hodLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/users', label: 'Manage Faculty', icon: Users },
    { href: '/dashboard/courses', label: 'Department Courses', icon: BookOpen },
    { href: '/dashboard/attendance', label: 'Attendance', icon: BarChart3 },
    { type: 'separator', label: 'Services' },
    { href: '/dashboard/faculty/bonafide-requests', label: 'Bonafide Requests', icon: FileText },
    { href: '/dashboard/faculty/leaving-certificate-requests', label: 'LC Requests', icon: FileText },
    { href: '/dashboard/faculty/scholarships', label: 'Scholarships', icon: GraduationCap },
    { type: 'separator', label: 'Communication' },
    { href: '/dashboard/notices', label: 'Notices', icon: Bell },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  ]

  const principalLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/departments', label: 'Departments', icon: Building2 },
    { href: '/dashboard/faculty', label: 'Faculty', icon: Users },
    { href: '/dashboard/users', label: 'Students', icon: Users },
    { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
    { href: '/dashboard/notices', label: 'Notices', icon: Bell },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/dashboard/fee-payments', label: 'Fee Payments', icon: FileText },
  ]

  let links
  if (profile.role === 'admin') {
    links = adminLinks
  } else if (profile.role === 'principal') {
    links = principalLinks
  } else if (profile.role === 'hod') {
    links = hodLinks
  } else if (profile.role === 'faculty') {
    links = facultyLinks
  } else {
    links = studentLinks
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">EduHub</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden text-slate-500 hover:text-slate-700"
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {links.map((link, index) => {
              if (link.type === 'separator') {
                return (
                  <div key={`separator-${index}`} className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {link.label}
                    </p>
                  </div>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                  {profile.fullName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{profile.fullName}</p>
                <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden text-slate-500 hover:text-slate-700"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-4">
            <Link href="/dashboard/notices">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium text-sm">
                      {profile.fullName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{profile.fullName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile.fullName}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
