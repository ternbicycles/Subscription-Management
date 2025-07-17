import * as React from "react"
import { Calendar, ChevronDown } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [viewDate, setViewDate] = React.useState<Date>(value || new Date())

  React.useEffect(() => {
    setSelectedDate(value)
    if (value) {
      setViewDate(value)
    }
  }, [value])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i)
  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" }
  ]

  const handleMonthChange = (monthValue: string) => {
    const monthIndex = parseInt(monthValue)
    const newDate = new Date(viewDate.getFullYear(), monthIndex, 1)
    setViewDate(newDate)
  }

  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue)
    const newDate = new Date(year, viewDate.getMonth(), 1)
    setViewDate(newDate)
  }

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    setSelectedDate(newDate)
    onChange?.(newDate)
    setOpen(false)
  }

  const handleQuickSelect = (date: Date) => {
    setSelectedDate(date)
    setViewDate(date)
    onChange?.(date)
    setOpen(false)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(viewDate)
    const firstDay = getFirstDayOfMonth(viewDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && 
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === viewDate.getMonth() &&
        selectedDate.getFullYear() === viewDate.getFullYear()
      
      const isToday = new Date().toDateString() === 
        new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString()

      days.push(
        <Button
          key={day}
          variant={isSelected ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0 font-normal",
            isToday && !isSelected && "bg-accent text-accent-foreground",
            isSelected && "bg-primary text-primary-foreground"
          )}
          onClick={() => handleDateSelect(day)}
        >
          {day}
        </Button>
      )
    }

    return days
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedDate ? format(selectedDate, "PPP") : placeholder}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[max(var(--radix-popover-trigger-width),280px)] p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Quick selection buttons */}
          <div className="flex justify-center space-x-1 pb-2 border-b flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickSelect(new Date())}
              className="text-xs h-7 px-2"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                handleQuickSelect(tomorrow)
              }}
              className="text-xs h-7 px-2"
            >
              Tomorrow
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextWeek = new Date()
                nextWeek.setDate(nextWeek.getDate() + 7)
                handleQuickSelect(nextWeek)
              }}
              className="text-xs h-7 px-2"
            >
              Next Week
            </Button>
          </div>

          {/* Month and Year selectors */}
          <div className="flex justify-center items-center space-x-2">
            <Select value={viewDate.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="flex-1 h-8 text-sm min-w-[100px]">
                <SelectValue>
                  {months[viewDate.getMonth()].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewDate.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-20 h-8 text-sm">
                <SelectValue>
                  {viewDate.getFullYear()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar grid */}
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="h-8 w-8 text-center text-sm font-medium text-muted-foreground flex items-center justify-center">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
