import { Input } from "@/components/ui/input"
import { CurrencySelector } from "@/components/subscription/CurrencySelector"
import { FormField } from "./FormField"

interface AmountInputProps {
  amount: number
  currency: string
  onAmountChange: (value: number) => void
  onCurrencyChange: (value: string) => void
  error?: string
}

export function AmountInput({ amount, currency, onAmountChange, onCurrencyChange, error }: AmountInputProps) {
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value)
    onAmountChange(isNaN(numValue) ? 0 : numValue)
  }

  return (
    <FormField label="Amount" error={error} required>
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-3">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount || ""}
            onChange={handleNumberChange}
            className={error ? "border-destructive" : ""}
          />
        </div>
        <div className="col-span-2">
          <CurrencySelector
            value={currency}
            onValueChange={onCurrencyChange}
          />
        </div>
      </div>
    </FormField>
  )
}