'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CreditCard, Download } from 'lucide-react'

interface FeePayment {
  _id: string
  studentId: string
  studentName: string
  studentEmail: string
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

export default function AdminFeePaymentsManagementPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchPayments = async () => {
    try {
      const url = statusFilter === 'all' ? '/api/fee-payments' : `/api/fee-payments?status=${statusFilter}`
      const res = await fetch(url)
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
    if (profile?.role === 'admin') {
      fetchPayments()
    }
  }, [profile?.role, statusFilter])

  const handleAction = async () => {
    if (!selectedPayment || !action) return

    if (action === 'approve' && !selectedPayment.receiptUrl) {
      toast.error('Cannot verify: No receipt uploaded by student')
      return
    }

    try {
      const body: any = { status: action === 'approve' ? 'paid' : 'failed' }

      const res = await fetch(`/api/fee-payments/${selectedPayment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(
        action === 'approve'
          ? 'Payment verified and marked as paid'
          : 'Payment rejected'
      )
      setActionDialogOpen(false)
      setAction(null)
      setSelectedPayment(null)
      fetchPayments()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const stats = {
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    failed: payments.filter((p) => p.status === 'failed').length,
    totalPending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    totalPaid: payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)
  }

  if (profile?.role !== 'admin') {
    return <p className="text-red-600">Only admins can access this page</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fee Payment Management</h1>
        <p className="text-muted-foreground">Verify and process student fee payments</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">₹{stats.totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-muted-foreground">₹{stats.totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed/Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{stats.totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {loading ? (
        <div>Loading...</div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{payment.studentName}</CardTitle>
                    <CardDescription>
                      Email: {payment.studentEmail} | Txn: {payment.transactionId}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">₹{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{payment.paymentType.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(payment.createdAt), 'MMM d')}</p>
                  </div>
                </div>

                {payment.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    {payment.receiptUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(payment.receiptUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View Receipt
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setSelectedPayment(payment)
                        setAction('approve')
                        setActionDialogOpen(true)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!payment.receiptUrl}
                    >
                      Verify & Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedPayment(payment)
                        setAction('reject')
                        setActionDialogOpen(true)
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {payment.status === 'paid' && payment.receiptUrl && (
                  <Button size="sm" variant="outline" onClick={() => window.open(payment.receiptUrl)}>
                    <Download className="h-4 w-4 mr-1" />
                    Receipt
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Verify Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              Student: {selectedPayment?.studentName}
              <br />
              Amount: ₹{selectedPayment?.amount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {action === 'approve' && selectedPayment?.receiptUrl && (
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

            {action === 'approve' && !selectedPayment?.receiptUrl && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">⚠️ No receipt uploaded by student. Cannot verify payment.</p>
              </div>
            )}

            {action === 'reject' && (
              <p className="text-sm text-muted-foreground">
                This payment will be marked as rejected. Student will need to resubmit.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={action === 'approve' && !selectedPayment?.receiptUrl}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
