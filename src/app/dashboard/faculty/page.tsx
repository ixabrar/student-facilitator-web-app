'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Search, Building2, Mail, Phone } from 'lucide-react'
import { ensureArray } from '@/lib/fetchUtils'

interface Faculty {
  _id: string
  email: string
  fullName: string
  role: string
  department?: string
  departmentName?: string
  phone?: string
  createdAt: string
}

interface Department {
  _id: string
  name: string
}

export default function FacultyPage() {
  const { profile } = useAuth()
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  useEffect(() => {
    fetchDepartments()
    fetchFaculty()
  }, [departmentFilter])

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDepartments(ensureArray(data))
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchFaculty = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      // Fetch both faculty and HOD roles
      let url = '/api/profiles?role=faculty&role=hod'
      
      if (departmentFilter !== 'all') {
        url += `&department=${departmentFilter}`
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to fetch faculty')
      
      const data = await res.json()
      console.log('Faculty data received:', data.length, 'members')
      console.log('HODs count:', data.filter((f: Faculty) => f.role === 'hod').length)
      
      const sorted = ensureArray(data).sort((a: Faculty, b: Faculty) => 
        a.fullName.localeCompare(b.fullName)
      )
      setFaculty(sorted)
    } catch (error) {
      console.error('Error fetching faculty:', error)
      toast.error('Failed to load faculty members')
    } finally {
      setLoading(false)
    }
  }

  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = 
      f.fullName.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase()) ||
      (f.departmentName || '').toLowerCase().includes(search.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Faculty Members</h1>
        <p className="text-muted-foreground">View and manage all faculty members across departments</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{faculty.length}</p>
                <p className="text-sm text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
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
                <p className="text-2xl font-bold">{faculty.filter(f => f.role === 'hod').length}</p>
                <p className="text-sm text-muted-foreground">HODs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Faculty Directory</CardTitle>
          <CardDescription>Search and filter faculty members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading faculty...</p>
            </div>
          ) : filteredFaculty.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No faculty members found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFaculty.map((member) => (
                <div
                  key={member._id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-slate-50 to-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {member.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{member.fullName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={member.role === 'hod' ? 'default' : 'secondary'}
                              className={member.role === 'hod' ? 'bg-orange-100 text-orange-700 border-orange-200' : ''}
                            >
                              {member.role === 'hod' ? 'HOD' : 'Faculty'}
                            </Badge>
                            {member.departmentName && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {member.departmentName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-13 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
