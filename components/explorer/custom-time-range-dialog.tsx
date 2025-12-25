'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Calendar } from 'lucide-react';
import type { TimeRange } from '@/lib/stores/explorer-store';

interface CustomTimeRangeDialogProps {
  value: TimeRange | null;
  onApply: (range: TimeRange) => void;
}

export function CustomTimeRangeDialog({ value, onApply }: CustomTimeRangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(value?.start);
  const [endDate, setEndDate] = useState<Date | undefined>(value?.end);

  const handleApply = () => {
    if (startDate && endDate) {
      if (startDate >= endDate) {
        alert('Start time must be before end time');
        return;
      }
      onApply({ start: startDate, end: endDate });
      setOpen(false);
    }
  };

  const handleQuickSelect = (hours: number) => {
    const end = new Date();
    const start = new Date();
    start.setHours(start.getHours() - hours);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Custom Range
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Custom Time Range</DialogTitle>
          <DialogDescription>
            Select a custom start and end time for your data query
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(1)}>
                Last Hour
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(6)}>
                Last 6 Hours
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(24)}>
                Last 24 Hours
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(168)}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect(720)}>
                Last 30 Days
              </Button>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date & Time</Label>
            <DateTimePicker
              date={startDate}
              onSelect={setStartDate}
              placeholder="Select start date and time"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date & Time</Label>
            <DateTimePicker
              date={endDate}
              onSelect={setEndDate}
              placeholder="Select end date and time"
              disabled={(date) => {
                if (!startDate) return false;
                return date < startDate;
              }}
            />
          </div>

          {/* Preview */}
          {startDate && endDate && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium mb-1">Selected Range:</div>
              <div className="text-muted-foreground">
                {startDate.toLocaleString()} → {endDate.toLocaleString()}
              </div>
              <div className="text-muted-foreground mt-1">
                Duration: {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))} hours
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!startDate || !endDate}>
            Apply Range
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
