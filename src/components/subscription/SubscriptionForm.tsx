import { useState, useEffect } from "react"
import { format } from "date-fns"
import { getBaseCurrency } from '@/config/currency'
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { calculateNextBillingDateFromStart } from "@/lib/subscription-utils"
import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"

// Form components
import { FormField } from "./form/FormField"
import { CategorySelector } from "./form/CategorySelector"
import { PaymentMethodSelector } from "./form/PaymentMethodSelector"
import { AmountInput } from "./form/AmountInput"
import { SubscriptionFormData, FormErrors } from "./form/types"
import { validateForm, handleFieldChange } from "./form/validation"

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Subscription
  onSubmit: (data: SubscriptionFormData & { nextBillingDate: string }) => void
}

export function SubscriptionForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: SubscriptionFormProps) {
  // Get categories, payment methods and plan options from store
  const {
    categories,
    paymentMethods
  } = useSubscriptionStore()
  
  const { t } = useTranslation(['common', 'subscription', 'validation'])

  // State for form data and validation errors
  const [form, setForm] = useState<SubscriptionFormData>({
    name: "",
    plan: "",
    billingCycle: "monthly",
    amount: 0,
    currency: getBaseCurrency(),
    paymentMethodId: 0,
    startDate: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    categoryId: 0,
    renewalType: "manual",
    notes: "",
    website: ""
  })

  // State for form errors
  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const { ...formData } = initialData
      setForm({
        ...formData,
        website: formData.website || ""
      })
    }
  }, [initialData])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      if (!initialData) {
        setForm({
          name: "",
          plan: "",
          billingCycle: "monthly",
          amount: 0,
          currency: "USD",
          paymentMethodId: 0,
          startDate: format(new Date(), "yyyy-MM-dd"),
          status: "active",
          categoryId: 0,
          renewalType: "manual",
          notes: "",
          website: ""
        })
      }
      setErrors({})
    }
  }, [open, initialData])

  // Handle basic input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    handleFieldChange(name, value, setForm, errors, setErrors)
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    handleFieldChange(name, value, setForm, errors, setErrors)
  }



  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors = validateForm(form, t)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Calculate next billing date based on start date, current date and billing cycle
    const nextBillingDate = calculateNextBillingDateFromStart(
      new Date(form.startDate),
      new Date(),
      form.billingCycle
    )

    // Submit the form with calculated next billing date
    onSubmit({
      ...form,
      nextBillingDate
    })
    onOpenChange(false)
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? t('common:editSubscription') : t('common:addNewSubscription')}</DialogTitle>
            <DialogDescription>
              {initialData
                ? t('common:updateDetails')
                : t('common:enterDetails')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Subscription name */}
            <FormField label={t('common:name')} error={errors.name} required>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={errors.name ? "border-destructive" : ""}
              />
            </FormField>

            {/* Subscription plan */}
            <FormField label={t('common:plan')} error={errors.plan} required>
              <Input
                id="plan"
                name="plan"
                value={form.plan}
                onChange={handleChange}
                placeholder={t('common:planPlaceholder')}
                className={errors.plan ? "border-destructive" : ""}
              />
            </FormField>

            {/* Category */}
            <CategorySelector
              value={form.categoryId}
              onChange={(value) => handleFieldChange('categoryId', value, setForm, errors, setErrors)}
              categories={categories}
              error={errors.categoryId}
            />

            {/* Amount and Currency */}
            <AmountInput
              amount={form.amount}
              currency={form.currency}
              onAmountChange={(value) => handleFieldChange('amount', value, setForm, errors, setErrors)}
              onCurrencyChange={(value) => handleFieldChange('currency', value, setForm, errors, setErrors)}
              error={errors.amount}
            />

            {/* Billing Cycle */}
            <FormField label={t('common:billingCycle')} required>
              <Select 
                value={form.billingCycle} 
                onValueChange={(value) => handleSelectChange("billingCycle", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common:selectBillingCycle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('common:monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('common:yearly')}</SelectItem>
                  <SelectItem value="quarterly">{t('common:quarterly')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>



            {/* Payment Method */}
            <PaymentMethodSelector
              value={form.paymentMethodId}
              onChange={(value) => handleFieldChange('paymentMethodId', value, setForm, errors, setErrors)}
              paymentMethods={paymentMethods}
              error={errors.paymentMethodId}
            />

            {/* Start Date */}
            <FormField label={t('common:startDate')}>
              <DatePicker
                value={form.startDate ? new Date(form.startDate) : undefined}
                onChange={(date) => {
                  if (date) {
                    handleFieldChange('startDate', format(date, "yyyy-MM-dd"), setForm, errors, setErrors)
                  }
                }}
                placeholder={t('common:pickDate')}
              />
            </FormField>

            {/* Status */}
            <FormField label={t('common:status')}>
              <Select
                value={form.status}
                onValueChange={(value: "active" | "trial" | "cancelled") => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common:selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Renewal Type */}
            <FormField label={t('common:renewalType')}>
              <Select
                value={form.renewalType}
                onValueChange={(value: "auto" | "manual") => handleSelectChange("renewalType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common:selectRenewalType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('common:automaticRenewal')}</SelectItem>
                  <SelectItem value="manual">{t('common:manualRenewal')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Website */}
            <FormField label={t('common:website')}>
              <Input
                id="website"
                name="website"
                value={form.website || ""}
                onChange={handleChange}
                placeholder={t('common:websitePlaceholder')}
              />
            </FormField>

            {/* Notes */}
            <FormField label={t('common:notes')}>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                placeholder={t('common:additionalInformation')}
              />
            </FormField>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit">
              {initialData ? t('common:update') : t('common:add')} {t('common:subscription')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}