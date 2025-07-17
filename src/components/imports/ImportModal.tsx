import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// Import types and utilities
import { SubscriptionImportData, ImportStep } from "./types"
import { parseFileContent } from "./fileParser"

// Import step components
import { FileUploadStep } from "./steps/FileUploadStep"
import { FileValidationStep } from "./steps/FileValidationStep"
import { ReviewStep } from "./steps/ReviewStep"
import { CompleteStep } from "./steps/CompleteStep"

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (subscriptions: SubscriptionImportData[]) => void
}

export function ImportModal({
  open,
  onOpenChange,
  onImport
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>(ImportStep.Upload)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [subscriptions, setSubscriptions] = useState<SubscriptionImportData[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(ImportStep.Upload)
      setFile(null)
      setProgress(0)
      setSubscriptions([])
      setErrors([])
      setIsProcessing(false)
    }
    onOpenChange(open)
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setProgress(25)
      setTimeout(() => {
        setStep(ImportStep.Validate)
      }, 500)
    }
  }

  // Handle file validation
  const validateFile = () => {
    if (!file) return
    
    setIsProcessing(true)
    setProgress(50)
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target?.result as string
      parseFileContent(file, content, setSubscriptions, setErrors)
      setProgress(75)
      setIsProcessing(false)
      setStep(ImportStep.Review)
    }
    
    reader.onerror = () => {
      setErrors(['Error reading file.'])
      setIsProcessing(false)
      setStep(ImportStep.Review)
    }
    
    if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
      reader.readAsText(file)
    } else {
      setErrors(['Unsupported file format. Please upload a CSV or JSON file.'])
      setIsProcessing(false)
      setStep(ImportStep.Review)
    }
  }

  // Handle import completion
  const completeImport = () => {
    setProgress(100)
    onImport(subscriptions)
    setStep(ImportStep.Complete)
  }

  // Render content based on current step
  const renderStepContent = () => {
    switch (step) {
      case ImportStep.Upload:
        return <FileUploadStep file={file} onFileChange={handleFileChange} />
      
      case ImportStep.Validate:
        return <FileValidationStep file={file} progress={progress} />
      
      case ImportStep.Review:
        return <ReviewStep subscriptions={subscriptions} errors={errors} />
      
      case ImportStep.Complete:
        return <CompleteStep subscriptionCount={subscriptions.length} />
    }
  }

  // Render footer buttons based on current step
  const renderFooterButtons = () => {
    switch (step) {
      case ImportStep.Upload:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!file}
              onClick={() => file && setStep(ImportStep.Validate)}
            >
              Continue
            </Button>
          </>
        )
      
      case ImportStep.Validate:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={isProcessing}
              onClick={validateFile}
            >
              {isProcessing ? "Validating..." : "Validate File"}
            </Button>
          </>
        )
      
      case ImportStep.Review:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={subscriptions.length === 0 || errors.length > 0}
              onClick={completeImport}
            >
              Import {subscriptions.length} Subscriptions
            </Button>
          </>
        )
      
      case ImportStep.Complete:
        return (
          <Button onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Subscriptions</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import multiple subscriptions at once.
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="relative mb-2">
          <div className="overflow-hidden h-1 flex rounded bg-muted">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <div className={step >= ImportStep.Upload ? "text-primary font-medium" : ""}>
              Select file
            </div>
            <div className={step >= ImportStep.Validate ? "text-primary font-medium" : ""}>
              Validate
            </div>
            <div className={step >= ImportStep.Review ? "text-primary font-medium" : ""}>
              Review
            </div>
            <div className={step >= ImportStep.Complete ? "text-primary font-medium" : ""}>
              Complete
            </div>
          </div>
        </div>
        
        {renderStepContent()}
        
        <DialogFooter>
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}