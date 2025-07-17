import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/store/settingsStore"
import { PaymentRecord, transformPaymentsFromApi } from "@/utils/dataTransform"
import { PaymentHistorySheet } from "./PaymentHistorySheet"
import { apiClient } from '@/utils/api-client'
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// Import sub-components
import { PaymentHistoryHeader } from "./payment/PaymentHistoryHeader"
import { PaymentListItem } from "./payment/PaymentListItem"
import { PaymentListState } from "./payment/PaymentListState"
import { usePaymentOperations } from "./payment/usePaymentOperations"

interface PaymentHistorySectionProps {
  subscriptionId: number
  subscriptionName: string
}

export function PaymentHistorySection({ subscriptionId, subscriptionName }: PaymentHistorySectionProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const { toast } = useToast()
  const { apiKey } = useSettingsStore()


  // Fetch payment history for this subscription
  const fetchPaymentHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<any>(`/payment-history?subscription_id=${subscriptionId}`)
      const transformedPayments = transformPaymentsFromApi(response.payments || response.data || response || [])
      setPayments(transformedPayments)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment history'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load payment history when component mounts
  useEffect(() => {
    fetchPaymentHistory()
  }, [subscriptionId])

  // Load payment operations hook
  const {
    handleAddPayment: addPayment,
    handleEditPayment: editPayment,
    handleDeleteClick,
    deleteConfirmation
  } = usePaymentOperations(apiKey, fetchPaymentHistory)

  // Handle adding new payment
  const handleAddPayment = async (paymentData: any) => {
    await addPayment(paymentData)
    setShowAddForm(false)
  }

  // Handle editing payment
  const handleEditPayment = async (paymentData: any) => {
    if (!editingPayment) return
    await editPayment(editingPayment.id, paymentData)
    setEditingPayment(null)
  }

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment =>
    payment.paymentDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amountPaid.toString().includes(searchTerm)
  )

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Search */}
      <PaymentHistoryHeader
        paymentCount={filteredPayments.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddPayment={() => setShowAddForm(true)}
      />

      {/* Payment List */}
      <div className="space-y-2">
        <PaymentListState
          isLoading={isLoading}
          error={error}
          isEmpty={filteredPayments.length === 0}
          searchTerm={searchTerm}
          onRetry={fetchPaymentHistory}
        />
        
        {!isLoading && !error && filteredPayments.map((payment) => (
          <PaymentListItem
            key={payment.id}
            payment={payment}
            onEdit={setEditingPayment}
            onDelete={() => handleDeleteClick(payment.id, subscriptionName)}
          />
        ))}
      </div>

      {/* Payment History Sheet */}
      <PaymentHistorySheet
        open={showAddForm || editingPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingPayment(null)
          }
        }}
        initialData={editingPayment || undefined}
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onSubmit={editingPayment ? handleEditPayment : handleAddPayment}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog {...deleteConfirmation.dialogProps} />
    </div>
  )
}
