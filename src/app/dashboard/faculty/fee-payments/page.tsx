'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CheckCircle, XCircle, CreditCard, Shield, Download } from 'lucide-react'

interface FeePayment {
  _id: string
  studentId: string
  studentName: string
  studentEmail: string
  department: string
  amount: number
  paymentType: 'tuition' | 'examination' | 'activity' | 'other'
  semester?: number
  status: 'pending' | 'paid' | 'rejected' | 'failed'
  transactionId: string
  paymentMethod: string
  paidAt?: string
  receiptUrl?: string
  createdAt: string
}

export default function FacultyFeePaymentsPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null)
  const [actionDialog, setActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')

  if (!profile || profile.role !== 'faculty') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Only faculty can access this page</p>
        </CardContent>
      </Card>
    )
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/fee-payments?department=${profile.department}&status=${statusFilter === 'all' ? '' : statusFilter}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPayments(data || [])
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.department) {
      fetchPayments()
    }
  }, [profile?.department, statusFilter])

  const handleAction = async () => {
    if (!selectedPayment) return

    if (actionType === 'approve' && !selectedPayment.receiptUrl) {
      toast.error('Cannot verify: No receipt uploaded by student')
      return
    }

    try {
      let payload: any = { status: actionType === 'approve' ? 'paid' : 'failed' }

      const res = await fetch(`/api/fee-payments/${selectedPayment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update')
      }

      toast.success(`Payment ${actionType === 'approve' ? 'verified' : 'rejected'}!`)
      setActionDialog(false)
      setSelectedPayment(null)
      fetchPayments()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return variants[status] || 'bg-slate-100 text-slate-800'
  }

  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    paid: payments.filter(p => p.status === 'paid').length,
    paidAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    rejected: payments.filter(p => p.status === 'failed' || p.status === 'rejected').length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Payment Verification</h1>
          <p className="text-muted-foreground">Review and verify fee payments from {profile.departmentName || profile.department} students</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xs text-slate-500">₹{stats.pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paid}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-xs text-slate-500">₹{stats.paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-2xl font-bold">₹{(stats.paidAmount + stats.pendingAmount).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payments</CardTitle>
              <CardDescription>Showing {statusFilter === 'all' ? 'all' : statusFilter} payments</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Verified</SelectItem>
                <SelectItem value="failed">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <Card key={payment._id} className="p-4 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{payment.studentName}</h3>
                        <Badge className={getStatusBadge(payment.status)}>{payment.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Email: {payment.studentEmail}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-semibold capitalize">{payment.paymentType}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Method:</span>
                          <p className="font-semibold capitalize">{payment.paymentMethod}</p>
                        </div>
                        {payment.semester && (
                          <div>
                            <span className="text-muted-foreground">Semester:</span>
                            <p className="font-semibold">{payment.semester}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        TXN ID: {payment.transactionId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {format(new Date(payment.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {payment.receiptUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(payment.receiptUrl, '_blank')}
                          className="whitespace-nowrap"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          View Receipt
                        </Button>
                      )}
                      {!payment.receiptUrl && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          No Receipt
                        </Badge>
                      )}
                      {payment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedPayment(payment)
                              setActionType('approve')
                              setActionDialog(true)
                            }}
                            disabled={!payment.receiptUrl}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedPayment(payment)
                              setActionType('reject')
                              setActionDialog(true)
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Verify Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              Student: {selectedPayment?.studentName}
              <br />
              Amount: ₹{selectedPayment?.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'approve' && selectedPayment?.receiptUrl && (
              <div className="space-y-2">
                <Label>Payment Receipt (Uploaded by Student)</Label>
                <div className="border rounded-lg p-4 bg-slate-50">
                  {selectedPayment.receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img 
                      src={selectedPayment.receiptUrl} 
                      alt="Payment Receipt" 
                      className="max-w-full h-auto rounded"
                      style={{ maxHeight: '400px' }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">PDF or other file format</p>
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Open Receipt
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            )}

            {actionType === 'approve' && !selectedPayment?.receiptUrl && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">⚠️ No receipt uploaded by student. Cannot verify payment.</p>
              </div>
            )}

            {actionType === 'reject' && (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to reject this payment? The student will be notified and can resubmit.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAction} 
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                disabled={actionType === 'approve' && !selectedPayment?.receiptUrl}
              >
                {actionType === 'approve' ? 'Verify Payment' : 'Reject Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
