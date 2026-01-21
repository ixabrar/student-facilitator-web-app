'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Upload, GraduationCap, FileText, CheckCircle2 } from 'lucide-react'

const SCHOLARSHIPS = [
  {
    category: 'Social Justice and Special Assistance Department',
    items: [
      'Government of India Post-Matric Scholarship',
      'Pre-Matric Scholarship',
      'Savitribai Phule Scholarship for Scheduled Caste girls (Std. 5–10)',
      'Maharshi Vithhal Ramaji Shinde Tuition & Exam Fee Scholarship',
      'Prematric Merit Scholarship (Std. V–X)',
      'Pre-matric Scholarship for Children of those engaged in unclean occupations'
    ]
  },
  {
    category: 'Tribal Development Department',
    items: [
      'Post-Matric Scholarship Scheme (Government of India)',
      'Tuition & Examination Fee for Tribal Students (Freeship)',
      'Vocational Education Fee Reimbursement',
      'Vocational Education Maintenance Allowance',
      'Vocational Training Fee Reimbursement for Scheduled Tribe Students'
    ]
  },
  {
    category: 'Directorate of Higher Education',
    items: [
      'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Scheme',
      'Assistance to Meritorious Students (Junior & Senior Level)',
      'Eklavya Scholarship',
      'State Government Open Merit Scholarship',
      'Scholarship to Meritorious Students (Mathematics/Physics)',
      'Government Vidya Niketan Scholarship',
      'State Government Dakshina Adhichatra Scholarship',
      'Government Research Adhichatra',
      'Education Concession to Children of Ex-Servicemen',
      'Education Concession to Children of Freedom Fighters',
      'Jawaharlal Nehru University Scholarship',
      'Dr. Panjabrao Deshmukh Vastigruh Nirvah Bhatta Yojana (DHE)'
    ]
  },
  {
    category: 'Directorate of Technical Education',
    items: [
      'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)',
      'Dr. Panjabrao Deshmukh Vastigruh Nirvah Bhatta Yojna (DTE)'
    ]
  },
  {
    category: 'OBC, SEBC, VJNT & SBC Welfare Department',
    items: [
      'Post-Matric Scholarship to VJNT Students',
      'Tuition & Examination Fees for VJNT Students',
      'Post-Matric Scholarship to OBC Students',
      'Tuition & Examination Fees for OBC Students',
      'Post-Matric Scholarship to SBC Students',
      'Tuition & Examination Fees for SBC Students',
      'Maintenance Allowance for VJNT & SBC Students in Professional Courses (Hostellers)',
      'Rajarshi Chhatrapati Shahu Maharaj Merit Scholarship (VJNT & SBC, Std. 11–12)'
    ]
  }
]

interface ScholarshipApplication {
  _id: string
  fullName: string
  aadhaarNumber: string
  phoneNumber: string
  address: string
  selectedScholarships: string[]
  documents: {
    sscMarksheet?: string
    diplomaSem1Marksheet?: string
    diplomaSem2Marksheet?: string
  }
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  remarks?: string
  createdAt: string
}

export default function ScholarshipsPage() {
  const { profile } = useAuth()
  const [application, setApplication] = useState<ScholarshipApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedScholarships, setSelectedScholarships] = useState<string[]>([])
  const [formData, setFormData] = useState({
    fullName: '',
    aadhaarNumber: '',
    phoneNumber: '',
    address: ''
  })
  const [documents, setDocuments] = useState({
    sscMarksheet: null as File | null,
    diplomaSem1Marksheet: null as File | null,
    diplomaSem2Marksheet: null as File | null
  })

  useEffect(() => {
    if (profile?._id) {
      fetchApplication()
    }
  }, [profile?._id])

  const fetchApplication = async () => {
    try {
      const res = await fetch(`/api/scholarships?studentId=${profile?._id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.length > 0) {
        setApplication(data[0])
        setSelectedScholarships(data[0].selectedScholarships)
      }
    } catch (error) {
      console.error('Failed to load application:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScholarshipToggle = (scholarship: string) => {
    setSelectedScholarships(prev =>
      prev.includes(scholarship)
        ? prev.filter(s => s !== scholarship)
        : [...prev, scholarship]
    )
  }

  const handleFileChange = (field: keyof typeof documents, file: File | null) => {
    setDocuments(prev => ({ ...prev, [field]: file }))
  }

  const uploadFile = async (file: File, type: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) throw new Error('File upload failed')
    const { url } = await res.json()
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedScholarships.length === 0) {
      toast.error('Please select at least one scholarship')
      return
    }

    if (!documents.sscMarksheet || !documents.diplomaSem1Marksheet || !documents.diplomaSem2Marksheet) {
      toast.error('Please upload all required documents')
      return
    }

    try {
      toast.loading('Uploading documents...')

      // Upload all documents
      const [sscUrl, sem1Url, sem2Url] = await Promise.all([
        uploadFile(documents.sscMarksheet, 'scholarship-ssc'),
        uploadFile(documents.diplomaSem1Marksheet, 'scholarship-diploma1'),
        uploadFile(documents.diplomaSem2Marksheet, 'scholarship-diploma2')
      ])

      toast.dismiss()
      toast.loading(editMode ? 'Updating application...' : 'Submitting application...')

      const payload = {
        studentId: profile?._id,
        fullName: formData.fullName,
        aadhaarNumber: formData.aadhaarNumber,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        selectedScholarships,
        documents: {
          sscMarksheet: sscUrl,
          diplomaSem1Marksheet: sem1Url,
          diplomaSem2Marksheet: sem2Url
        },
        status: 'pending' // Reset to pending on resubmit
      }

      // Submit application (create new or update existing)
      const res = await fetch(
        editMode ? `/api/scholarships/${application?._id}` : '/api/scholarships',
        {
          method: editMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

      toast.dismiss()

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit')
      }

      toast.success(editMode ? 'Application updated successfully!' : 'Scholarship application submitted successfully!')
      setEditMode(false)
      fetchApplication()
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message)
    }
  }

  const filteredScholarships = SCHOLARSHIPS.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const handleEditApplication = () => {
    if (!application) return
    
    // Populate form with existing data
    setFormData({
      fullName: application.fullName,
      aadhaarNumber: application.aadhaarNumber,
      phoneNumber: application.phoneNumber,
      address: application.address
    })
    setSelectedScholarships(application.selectedScholarships)
    setEditMode(true)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setFormData({ fullName: '', aadhaarNumber: '', phoneNumber: '', address: '' })
    setSelectedScholarships([])
    setDocuments({ sscMarksheet: null, diplomaSem1Marksheet: null, diplomaSem2Marksheet: null })
  }

  if (!profile) return null

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (application && !editMode) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scholarship Application</h1>
          <p className="text-muted-foreground">Your scholarship application status</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Application Submitted
                </CardTitle>
                <CardDescription>Submitted on {new Date(application.createdAt).toLocaleDateString()}</CardDescription>
              </div>
              <Badge className={getStatusColor(application.status)}>
                {application.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium">{application.fullName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Aadhaar Number</Label>
                <p className="font-medium">{application.aadhaarNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone Number</Label>
                <p className="font-medium">{application.phoneNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{application.address}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Selected Scholarships ({application.selectedScholarships.length})</Label>
              <ul className="mt-2 space-y-1">
                {application.selectedScholarships.map((sch, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{sch}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label className="text-muted-foreground">Uploaded Documents</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {application.documents.sscMarksheet && (
                  <Button size="sm" variant="outline" onClick={() => window.open(application.documents.sscMarksheet)}>
                    <FileText className="h-4 w-4 mr-1" />
                    SSC Marksheet
                  </Button>
                )}
                {application.documents.diplomaSem1Marksheet && (
                  <Button size="sm" variant="outline" onClick={() => window.open(application.documents.diplomaSem1Marksheet)}>
                    <FileText className="h-4 w-4 mr-1" />
                    Diploma Sem 1
                  </Button>
                )}
                {application.documents.diplomaSem2Marksheet && (
                  <Button size="sm" variant="outline" onClick={() => window.open(application.documents.diplomaSem2Marksheet)}>
                    <FileText className="h-4 w-4 mr-1" />
                    Diploma Sem 2
                  </Button>
                )}
              </div>
            </div>

            {application.remarks && (
              <div className={`p-4 border rounded ${
                application.status === 'rejected' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <Label className={application.status === 'rejected' ? 'text-red-900 font-medium' : 'text-blue-900 font-medium'}>
                  Remarks from Faculty
                </Label>
                <p className={`text-sm mt-1 ${
                  application.status === 'rejected' ? 'text-red-800' : 'text-blue-800'
                }`}>{application.remarks}</p>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="pt-4 border-t">
                <Button onClick={handleEditApplication} className="w-full">
                  Edit Application
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {editMode ? 'Edit Scholarship Application' : 'Scholarship Application'}
          </h1>
          <p className="text-muted-foreground">
            {editMode ? 'Update your application and resubmit' : 'Apply for scholarships and financial assistance'}
          </p>
        </div>
        {editMode && (
          <Button variant="outline" onClick={handleCancelEdit}>
            Cancel
          </Button>
        )}
      </div>

      {/* Scholarship Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Available Scholarships
          </CardTitle>
          <CardDescription>Select scholarships you want to apply for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scholarships..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-6 pr-2">
            {filteredScholarships.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="font-semibold text-sm text-slate-700">{category.category}</h3>
                <div className="space-y-2 pl-2">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-start space-x-2">
                      <Checkbox
                        id={`${idx}-${itemIdx}`}
                        checked={selectedScholarships.includes(item)}
                        onCheckedChange={() => handleScholarshipToggle(item)}
                      />
                      <label
                        htmlFor={`${idx}-${itemIdx}`}
                        className="text-sm cursor-pointer leading-relaxed"
                      >
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedScholarships.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-green-600">
                {selectedScholarships.length} scholarship(s) selected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Fill in your details and upload required documents</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="As per Aadhaar card"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadhaar">Aadhaar Number *</Label>
                <Input
                  id="aadhaar"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  placeholder="12 digit Aadhaar number"
                  pattern="\d{12}"
                  maxLength={12}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="10 digit mobile number"
                  pattern="\d{10}"
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Documents
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ssc">SSC Marksheet *</Label>
                  <Input
                    id="ssc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('sscMarksheet', e.target.files?.[0] || null)}
                    required
                  />
                  {documents.sscMarksheet && (
                    <p className="text-xs text-green-600">✓ {documents.sscMarksheet.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sem1">Diploma Sem 1 Marksheet *</Label>
                  <Input
                    id="sem1"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('diplomaSem1Marksheet', e.target.files?.[0] || null)}
                    required
                  />
                  {documents.diplomaSem1Marksheet && (
                    <p className="text-xs text-green-600">✓ {documents.diplomaSem1Marksheet.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sem2">Diploma Sem 2 Marksheet *</Label>
                  <Input
                    id="sem2"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('diplomaSem2Marksheet', e.target.files?.[0] || null)}
                    required
                  />
                  {documents.diplomaSem2Marksheet && (
                    <p className="text-xs text-green-600">✓ {documents.diplomaSem2Marksheet.name}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              {editMode ? 'Update & Resubmit Application' : 'Submit Scholarship Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
