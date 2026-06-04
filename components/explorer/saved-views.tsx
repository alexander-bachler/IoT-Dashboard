'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSavedViewsStore } from '@/lib/stores/saved-views-store';
import { Bookmark, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SavedViews() {
  const { views, saveView, applyView, deleteView } = useSavedViewsStore();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  // Avoid SSR/client hydration mismatch from the persisted (localStorage) list.
  useEffect(() => setMounted(true), []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveView(trimmed);
    setName('');
    setOpen(false);
    toast.success(`View "${trimmed}" saved`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Bookmark className="h-4 w-4" />
          Saved Views
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2">
            <Label htmlFor="view-name" className="text-xs text-muted-foreground">
              Save current view as
            </Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boiler temp – last 7d"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <Button size="sm" className="w-full" onClick={handleSave} disabled={!name.trim()}>
              Save view
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {mounted && views.length > 0 ? (
        <div className="custom-scrollbar max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
          {views.map((v) => (
            <div key={v.id} className="group flex items-center gap-1 rounded-md hover:bg-accent">
              <button
                type="button"
                onClick={() => {
                  applyView(v.id);
                  toast.success(`Loaded "${v.name}"`);
                }}
                className="flex-1 truncate px-2 py-1.5 text-left text-sm"
                title={v.name}
              >
                {v.name}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  deleteView(v.id);
                  toast.success(`Deleted "${v.name}"`);
                }}
                aria-label={`Delete view ${v.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {mounted ? 'No saved views yet — configure the explorer and click Save.' : ' '}
        </p>
      )}
    </div>
  );
}
