import { Calendar, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

interface PaymentHistoryHeaderProps {
  paymentCount: number
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddPayment: () => void
}

export function PaymentHistoryHeader({
  paymentCount,
  searchTerm,
  onSearchChange,
  onAddPayment
}: PaymentHistoryHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Payment History</span>
          <Badge variant="outline" className="text-xs">
            {paymentCount} records
          </Badge>
        </div>
        <Button
          onClick={onAddPayment}
          size="sm"
          className="gap-1.5 text-xs h-8 w-full sm:w-auto"
        >
          <Plus className="h-3 w-3" />
          Add Payment
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-sm h-8"
        />
      </div>
    </div>
  )
}