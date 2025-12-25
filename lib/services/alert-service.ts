/**
 * Alert Service
 * Monitors metrics and triggers alerts based on threshold rules
 */

import { db } from '@/db';
import { measurements, metrics } from '@/db/schema';
import { alertRules, alertEvents } from '@/db/schema-alerts';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export type AlertCondition = 'greater_than' | 'less_than' | 'equal_to' | 'not_equal_to';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged';

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  metricId: string;
  deviceId?: string;
  condition: AlertCondition;
  threshold: number;
  duration?: string;
  severity: AlertSeverity;
  notificationChannels?: string[];
  notificationConfig?: Record<string, unknown>;
}

export class AlertService {
  /**
   * Create a new alert rule
   */
  async createAlertRule(input: CreateAlertRuleInput) {
    const [rule] = await db
      .insert(alertRules)
      .values({
        name: input.name,
        description: input.description,
        metricId: input.metricId,
        deviceId: input.deviceId,
        condition: input.condition,
        threshold: input.threshold,
        duration: input.duration,
        severity: input.severity,
        notificationChannels: input.notificationChannels as any,
        notificationConfig: input.notificationConfig as any,
      })
      .returning();

    return rule;
  }

  /**
   * Get all alert rules for a metric
   */
  async getAlertRulesForMetric(metricId: string) {
    return db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.metricId, metricId), eq(alertRules.isActive, true)));
  }

  /**
   * Evaluate a measurement against alert rules
   */
  async evaluateMeasurement(
    metricId: string,
    value: number,
    timestamp: Date
  ): Promise<void> {
    const rules = await this.getAlertRulesForMetric(metricId);

    for (const rule of rules) {
      const shouldTrigger = this.checkCondition(
        value,
        rule.threshold,
        rule.condition as AlertCondition
      );

      if (shouldTrigger) {
        await this.triggerAlert(rule.id, value, timestamp);
      } else {
        await this.resolveAlert(rule.id);
      }
    }
  }

  /**
   * Check if a value meets the alert condition
   */
  private checkCondition(
    value: number,
    threshold: number,
    condition: AlertCondition
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equal_to':
        return value === threshold;
      case 'not_equal_to':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    alertRuleId: string,
    value: number,
    timestamp: Date
  ): Promise<void> {
    // Check if there's already an active alert
    const existingAlert = await db
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.alertRuleId, alertRuleId),
          eq(alertEvents.status, 'active')
        )
      )
      .limit(1);

    if (existingAlert.length > 0) {
      // Alert already active, don't create duplicate
      return;
    }

    // Create new alert event
    await db.insert(alertEvents).values({
      alertRuleId,
      triggeredAt: new Date(),
      measurementValue: value,
      measurementTime: timestamp,
      status: 'active',
    });

    // Update last triggered time on rule
    await db
      .update(alertRules)
      .set({ lastTriggered: new Date() })
      .where(eq(alertRules.id, alertRuleId));

    // TODO: Send notifications based on rule configuration
    // this.sendNotifications(alertRuleId);
  }

  /**
   * Resolve an active alert
   */
  private async resolveAlert(alertRuleId: string): Promise<void> {
    const activeAlerts = await db
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.alertRuleId, alertRuleId),
          eq(alertEvents.status, 'active')
        )
      );

    for (const alert of activeAlerts) {
      await db
        .update(alertEvents)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
        })
        .where(eq(alertEvents.id, alert.id));
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertEventId: string,
    acknowledgedBy: string
  ): Promise<void> {
    await db
      .update(alertEvents)
      .set({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
      })
      .where(eq(alertEvents.id, alertEventId));
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit: number = 50) {
    return db
      .select()
      .from(alertEvents)
      .where(eq(alertEvents.status, 'active'))
      .orderBy(desc(alertEvents.triggeredAt))
      .limit(limit);
  }

  /**
   * Get alert history for a metric
   */
  async getAlertHistory(metricId: string, limit: number = 100) {
    return db
      .select({
        event: alertEvents,
        rule: alertRules,
      })
      .from(alertEvents)
      .leftJoin(alertRules, eq(alertEvents.alertRuleId, alertRules.id))
      .where(eq(alertRules.metricId, metricId))
      .orderBy(desc(alertEvents.triggeredAt))
      .limit(limit);
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    await db.delete(alertRules).where(eq(alertRules.id, ruleId));
  }

  /**
   * Toggle alert rule active status
   */
  async toggleAlertRule(ruleId: string, isActive: boolean): Promise<void> {
    await db
      .update(alertRules)
      .set({ isActive })
      .where(eq(alertRules.id, ruleId));
  }
}

export const alertService = new AlertService();
