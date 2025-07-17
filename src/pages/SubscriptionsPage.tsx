import { useState, useEffect } from "react"
import { 
  Calendar, 
  Plus, 
  Search, 
  Tags,
  Check,
  Download,
  Upload,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { useToast } from "@/hooks/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"

import { 
  useSubscriptionStore, 
  Subscription, 
  SubscriptionStatus,
  BillingCycle
} from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { exportSubscriptionsToCSV } from "@/lib/subscription-utils"

import { SubscriptionCard } from "@/components/subscription/SubscriptionCard"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog"
import { ImportModal } from "@/components/imports/ImportModal"

export function SubscriptionsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [currentView, setCurrentView] = useState<"all" | "active" | "cancelled">("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBillingCycles, setSelectedBillingCycles] = useState<BillingCycle[]>([])
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [billingCycleFilterOpen, setBillingCycleFilterOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [detailSubscription, setDetailSubscription] = useState<Subscription | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const { fetchSettings } = useSettingsStore()
  
  const {
    subscriptions,
    categories,
    addSubscription,
    bulkAddSubscriptions,
    updateSubscription,
    deleteSubscription,
    fetchSubscriptions,
    getUniqueCategories,
    initializeData,
    initializeWithRenewals,
    manualRenewSubscription,
    isLoading
  } = useSubscriptionStore()

  // Initialize subscriptions without auto-renewals
  useEffect(() => {
    const initialize = async () => {
      await fetchSettings()
      await initializeData()
    }

    initialize()
  }, []) // Remove dependencies to prevent infinite re-renders
  
  // Get categories actually in use
  const usedCategories = getUniqueCategories()
  
  // Get unique billing cycles in use
  const getUniqueBillingCycles = () => {
    const billingCycles = subscriptions.map(sub => sub.billingCycle)
    return Array.from(new Set(billingCycles)).map(cycle => ({
      value: cycle,
      label: cycle.charAt(0).toUpperCase() + cycle.slice(1)
    }))
  }
  
  const usedBillingCycles = getUniqueBillingCycles()

  // Filter subscriptions based on search term, current view, selected categories and billing cycles
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sub.plan.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      currentView === "all" || 
      (currentView === "active" && sub.status !== "cancelled") ||
      (currentView === "cancelled" && sub.status === "cancelled")
    
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(categoryValue => {
        const category = categories.find(cat => cat.value === categoryValue)
        return category && sub.categoryId === category.id
      })
      
    const matchesBillingCycle =
      selectedBillingCycles.length === 0 ||
      selectedBillingCycles.includes(sub.billingCycle)
    
    return matchesSearch && matchesStatus && matchesCategory && matchesBillingCycle
  })

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    const dateA = new Date(a.nextBillingDate).getTime()
    const dateB = new Date(b.nextBillingDate).getTime()

    if (sortOrder === "asc") {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })

  // Handler for adding new subscription
  const handleAddSubscription = async (subscription: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await addSubscription(subscription)
    
    if (error) {
      toast({
        title: "Error adding subscription",
        description: error.message || "Failed to add subscription",
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "Subscription added",
      description: `${subscription.name} has been added successfully.`
    })
  }

  // Handler for updating subscription
  const handleUpdateSubscription = async (id: number, data: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await updateSubscription(id, data)
    
    if (error) {
      toast({
        title: "Error updating subscription",
        description: error.message || "Failed to update subscription",
        variant: "destructive"
      })
      return
    }
    
    setEditingSubscription(null)
    toast({
      title: "Subscription updated",
      description: `${data.name} has been updated successfully.`
    })
  }

  // State for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  
  // Handler for deleting subscription
  const handleDeleteSubscription = async () => {
    if (!deleteTarget) return
    
    const { error } = await deleteSubscription(deleteTarget.id)
    
    if (error) {
      toast({
        title: "Error deleting subscription",
        description: error.message || "Failed to delete subscription",
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: "Subscription deleted",
      description: `${deleteTarget.name} has been deleted.`,
      variant: "destructive"
    })
    
    setDeleteTarget(null)
  }
  
  // Confirmation dialog hook
  const deleteConfirmation = useConfirmation({
    title: "Delete Subscription",
    description: deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : "",
    confirmText: "Delete",
    onConfirm: handleDeleteSubscription,
  })
  
  // Handler to open delete confirmation
  const handleDeleteClick = (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return
    
    setDeleteTarget({ id, name: subscription.name })
    deleteConfirmation.openDialog()
  }

  // Handler for changing subscription status
  const handleStatusChange = async (id: number, status: SubscriptionStatus) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error } = await updateSubscription(id, { status })

    if (error) {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update status",
        variant: "destructive"
      })
      return
    }

    toast({
      title: status === "active" ? "Subscription activated" : "Subscription cancelled",
      description: `${subscription.name} has been ${status === "active" ? "activated" : "cancelled"}.`
    })
  }

  // Handler for manual renewal
  const handleManualRenew = async (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error, renewalData } = await manualRenewSubscription(id)

    if (error) {
      toast({
        title: "Error renewing subscription",
        description: error,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Subscription renewed successfully",
      description: `${subscription.name} has been renewed. Next billing date: ${renewalData?.newNextBilling}`
    })
  }

  // Handler for toggling a category in the filter
  const toggleCategoryFilter = (categoryValue: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryValue)) {
        return prev.filter(c => c !== categoryValue)
      } else {
        return [...prev, categoryValue]
      }
    })
  }
  
  // Handler for toggling a billing cycle in the filter
  const toggleBillingCycleFilter = (billingCycle: BillingCycle) => {
    setSelectedBillingCycles(prev => {
      if (prev.includes(billingCycle)) {
        return prev.filter(c => c !== billingCycle)
      } else {
        return [...prev, billingCycle]
      }
    })
  }

  // Handler for importing subscriptions
  const handleImportSubscriptions = async (newSubscriptions: Omit<Subscription, "id">[]) => {
    const { error } = await bulkAddSubscriptions(newSubscriptions);

    if (error) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import subscriptions",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Import successful",
        description: `${newSubscriptions.length} subscriptions have been imported.`,
      });
    }

    // Final fetch to ensure UI is up-to-date
    fetchSubscriptions();
  };

  // Handler for exporting subscriptions
  const handleExportSubscriptions = () => {
    // Generate CSV data
    const csvData = exportSubscriptionsToCSV(subscriptions)
    
    // Create a blob and download link
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    toast({
      title: "Export successful",
      description: "Your subscriptions have been exported to CSV."
    })
  }
  
  // Get billing cycle badge variant
  const getBillingCycleBadgeVariant = (billingCycle: BillingCycle) => {
    switch (billingCycle) {
      case 'yearly':
        return "success" // Green color for yearly
      case 'monthly':
        return "warning" // Orange/yellow for monthly
      case 'quarterly':
        return "info" // Blue for quarterly
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage all your subscription services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowAddForm(true)} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Subscription</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setShowImportModal(true)} size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleExportSubscriptions} size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <SearchInput
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          />

          <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Tags className="h-4 w-4" />
                {selectedCategories.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>Filter by Category</span>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedCategories([])}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedCategories.map((category) => (
                  <div
                    key={category.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedCategories.includes(category.value) && "bg-muted"
                    )}
                    onClick={() => toggleCategoryFilter(category.value)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedCategories.includes(category.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}>
                      {selectedCategories.includes(category.value) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{category.label}</div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {subscriptions.filter(s => s.category?.value === category.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Billing Cycle Filter */}
          <Popover open={billingCycleFilterOpen} onOpenChange={setBillingCycleFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <CalendarIcon className="h-4 w-4" />
                {selectedBillingCycles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedBillingCycles.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>Filter by Billing Cycle</span>
                  {selectedBillingCycles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedBillingCycles([])}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedBillingCycles.map((cycle) => (
                  <div
                    key={cycle.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedBillingCycles.includes(cycle.value as BillingCycle) && "bg-muted"
                    )}
                    onClick={() => toggleBillingCycleFilter(cycle.value as BillingCycle)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedBillingCycles.includes(cycle.value as BillingCycle)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}>
                      {selectedBillingCycles.includes(cycle.value as BillingCycle) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{cycle.label}</div>
                    <Badge
                      variant={getBillingCycleBadgeVariant(cycle.value as BillingCycle)}
                      className="ml-auto text-xs"
                    >
                      {subscriptions.filter(s => s.billingCycle === cycle.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sort by Next Billing Date ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "all" ? "default" : "outline"}
            onClick={() => setCurrentView("all")}
          >
            All
          </Button>
          <Button
            variant={currentView === "active" ? "default" : "outline"}
            onClick={() => setCurrentView("active")}
          >
            Active
          </Button>
          <Button
            variant={currentView === "cancelled" ? "default" : "outline"}
            onClick={() => setCurrentView("cancelled")}
          >
            Cancelled
          </Button>
        </div>
      </div>

      {/* Display selected category filters */}
      {(selectedCategories.length > 0 || selectedBillingCycles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map(categoryValue => {
            const category = categories.find(c => c.value === categoryValue)
            return (
              <Badge
                key={categoryValue}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {category?.label || categoryValue}
                <button
                  onClick={() => toggleCategoryFilter(categoryValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">Remove</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}

          {/* Display selected billing cycle filters */}
          {selectedBillingCycles.map(cycleValue => {
            const cycle = usedBillingCycles.find(c => c.value === cycleValue)
            return (
              <Badge
                key={cycleValue}
                variant={getBillingCycleBadgeVariant(cycleValue)}
                className="flex items-center gap-1 px-2 py-1"
              >
                {cycle?.label || cycleValue}
                <button
                  onClick={() => toggleBillingCycleFilter(cycleValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">Remove</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 text-white"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Subscriptions Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Loading skeleton cards */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card shadow animate-pulse">
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-5 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-40"></div>
                  <div className="h-4 bg-muted rounded w-28"></div>
                  <div className="h-4 bg-muted rounded w-36"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No subscriptions found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategories.length > 0 || selectedBillingCycles.length > 0
              ? `No results for your current filters. Try changing your search terms or filters.`
              : currentView !== "all"
                ? `You don't have any ${currentView} subscriptions.`
                : "Get started by adding your first subscription."
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Subscriptions
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={() => setEditingSubscription(subscription)}
              onDelete={() => handleDeleteClick(subscription.id)}
              onStatusChange={handleStatusChange}
              onManualRenew={handleManualRenew}
              onViewDetails={(subscription) => setDetailSubscription(subscription)}
            />
          ))}
        </div>
      )}

      {/* Forms and Modals */}
      <SubscriptionForm
        open={showAddForm || editingSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingSubscription(null)
          }
        }}
        initialData={editingSubscription || undefined}
        onSubmit={editingSubscription
          ? (data) => handleUpdateSubscription(editingSubscription.id, data)
          : handleAddSubscription
        }
      />

      <SubscriptionDetailDialog
        subscription={detailSubscription}
        open={detailSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailSubscription(null)
          }
        }}
        onEdit={(id) => {
          const subscription = subscriptions.find(s => s.id === id)
          if (subscription) {
            setEditingSubscription(subscription)
            setDetailSubscription(null)
          }
        }}
        onManualRenew={handleManualRenew}
      />

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
      <ConfirmDialog {...deleteConfirmation.dialogProps} />
    </>
  )
}
