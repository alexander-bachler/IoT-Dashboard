'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Calendar, Mail, Download } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState([
    {
      id: '1',
      name: 'Daily Energy Report',
      description: 'Daily summary of energy consumption and production',
      schedule: '0 8 * * *', // Every day at 8 AM
      type: 'dashboard',
      format: 'pdf',
      recipients: ['manager@example.com', 'team@example.com'],
      isActive: true,
      lastRun: '2025-12-25T08:00:00Z',
      nextRun: '2025-12-26T08:00:00Z',
    },
    {
      id: '2',
      name: 'Weekly Performance Summary',
      description: 'Weekly equipment performance metrics',
      schedule: '0 9 * * 1', // Every Monday at 9 AM
      type: 'metrics',
      format: 'excel',
      recipients: ['engineering@example.com'],
      isActive: true,
      lastRun: '2025-12-23T09:00:00Z',
      nextRun: '2025-12-30T09:00:00Z',
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);

  const schedulePresets = [
    { name: 'Daily at 8 AM', cron: '0 8 * * *' },
    { name: 'Daily at 6 PM', cron: '0 18 * * *' },
    { name: 'Weekly (Monday 9 AM)', cron: '0 9 * * 1' },
    { name: 'Monthly (1st, 8 AM)', cron: '0 8 1 * *' },
    { name: 'Every 6 hours', cron: '0 */6 * * *' },
  ];

  const formatSchedule = (cron: string) => {
    const presets: Record<string, string> = {
      '0 8 * * *': 'Daily at 8:00 AM',
      '0 18 * * *': 'Daily at 6:00 PM',
      '0 9 * * 1': 'Weekly on Monday at 9:00 AM',
      '0 8 1 * *': 'Monthly on the 1st at 8:00 AM',
      '0 */6 * * *': 'Every 6 hours',
    };
    return presets[cron] || cron;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            Automate report generation and delivery
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Active Reports</h2>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </div>

            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {report.name}
                          {report.isActive && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 rounded">
                              Active
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Run Now
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Schedule</div>
                        <div className="font-medium">{formatSchedule(report.schedule)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Recipients</div>
                        <div className="font-medium">{report.recipients.length} emails</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Format</div>
                        <div className="font-medium uppercase">{report.format}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Next Run</div>
                      <div className="font-medium">
                        {new Date(report.nextRun).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Last run: {new Date(report.lastRun).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Schedule Help */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Presets</CardTitle>
                <CardDescription>Common scheduling patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedulePresets.map((preset, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-1">{preset.name}</div>
                    <code className="text-xs text-muted-foreground">{preset.cron}</code>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Cron Format</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>minute hour day month weekday</p>
                    <p className="pt-2">Examples:</p>
                    <p>• 0 8 * * * - Daily at 8 AM</p>
                    <p>• */15 * * * * - Every 15 minutes</p>
                    <p>• 0 0 1 * * - Monthly at midnight</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Report History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Daily Energy Report</span>
                    <span className="text-green-600">✓ Success</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Weekly Performance</span>
                    <span className="text-green-600">✓ Success</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Daily Energy Report</span>
                    <span className="text-green-600">✓ Success</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
