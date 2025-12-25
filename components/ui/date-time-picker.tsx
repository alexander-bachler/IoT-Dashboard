'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateTimePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function DateTimePicker({
  date,
  onSelect,
  placeholder = 'Pick a date and time',
  disabled,
  className,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [hours, setHours] = React.useState(date ? date.getHours().toString().padStart(2, '0') : '00');
  const [minutes, setMinutes] = React.useState(date ? date.getMinutes().toString().padStart(2, '0') : '00');

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined);
      onSelect?.(undefined);
      return;
    }

    const updatedDate = new Date(newDate);
    updatedDate.setHours(parseInt(hours) || 0);
    updatedDate.setMinutes(parseInt(minutes) || 0);
    setSelectedDate(updatedDate);
    onSelect?.(updatedDate);
  };

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    if (!selectedDate) return;

    const h = parseInt(newHours) || 0;
    const m = parseInt(newMinutes) || 0;

    if (h < 0 || h > 23 || m < 0 || m > 59) return;

    const updatedDate = new Date(selectedDate);
    updatedDate.setHours(h);
    updatedDate.setMinutes(m);
    setSelectedDate(updatedDate);
    onSelect?.(updatedDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'PPP p')
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="space-y-4 p-3">
          <Calendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disabled}
          />

          <div className="border-t pt-3">
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => {
                  const val = e.target.value.padStart(2, '0');
                  setHours(val);
                  handleTimeChange(val, minutes);
                }}
                className="w-16 text-center"
                placeholder="HH"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => {
                  const val = e.target.value.padStart(2, '0');
                  setMinutes(val);
                  handleTimeChange(hours, val);
                }}
                className="w-16 text-center"
                placeholder="MM"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
