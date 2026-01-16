/**
 * Vercel Analytics Custom Event Tracking
 *
 * This module provides utilities for tracking custom events with Vercel Analytics.
 * Events are tracked both client-side and server-side depending on context.
 *
 * @see https://vercel.com/docs/analytics/custom-events
 */

import { track as vercelTrack } from '@vercel/analytics';
import { track as vercelServerTrack } from '@vercel/analytics/server';

// ============================================================================
// Event Types
// ============================================================================

/**
 * Standard event names used across the application.
 * Using consistent naming helps with analytics filtering and reporting.
 */
export const AnalyticsEvents = {
  // Email & Lead Capture
  EMAIL_CAPTURED: 'email_captured',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  LEAD_CREATED: 'lead_created',

  // Purchases & Subscriptions
  CHECKOUT_STARTED: 'checkout_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Button Clicks & CTAs
  CTA_CLICKED: 'cta_clicked',
  BUTTON_CLICKED: 'button_clicked',

  // Product Usage
  REPORT_GENERATED: 'report_generated',
  REPORT_VIEWED: 'report_viewed',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',

  // Navigation & Engagement
  PAGE_ENGAGED: 'page_engaged',
  FEATURE_USED: 'feature_used',

  // Auth
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

// ============================================================================
// Client-Side Tracking
// ============================================================================

/**
 * Track a custom event from client-side code.
 * Use this in React components and client-side handlers.
 *
 * @example
 * trackEvent('cta_clicked', { button: 'get_started', location: 'hero' });
 */
export function trackEvent(
  eventName: AnalyticsEventName | string,
  properties?: Record<string, string | number | boolean | null>
): void {
  try {
    vercelTrack(eventName, properties);
  } catch (error) {
    // Silently fail in case analytics isn't available
    console.debug('[Analytics] Failed to track event:', eventName, error);
  }
}

// ============================================================================
// Server-Side Tracking
// ============================================================================

/**
 * Track a custom event from server-side code (API routes, server actions).
 * Use this in API routes and server components.
 *
 * @example
 * await trackServerEvent('purchase_completed', { product: 'call-lab-pro', plan: 'solo' });
 */
export async function trackServerEvent(
  eventName: AnalyticsEventName | string,
  properties?: Record<string, string | number | boolean | null>
): Promise<void> {
  try {
    await vercelServerTrack(eventName, properties);
  } catch (error) {
    // Silently fail - analytics should not break functionality
    console.debug('[Analytics] Failed to track server event:', eventName, error);
  }
}

// ============================================================================
// Convenience Functions for Common Events
// ============================================================================

/**
 * Track when an email is captured (newsletter signup, lead form, etc.)
 */
export async function trackEmailCaptured(params: {
  source: string;
  isNewLead?: boolean;
  hasName?: boolean;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.EMAIL_CAPTURED, {
    source: params.source,
    is_new_lead: params.isNewLead ?? false,
    has_name: params.hasName ?? false,
  });
}

/**
 * Track when a checkout session is started
 */
export async function trackCheckoutStarted(params: {
  product: string;
  planType: string;
  hasCoupon?: boolean;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.CHECKOUT_STARTED, {
    product: params.product,
    plan_type: params.planType,
    has_coupon: params.hasCoupon ?? false,
  });
}

/**
 * Track when a purchase is completed
 */
export async function trackPurchaseCompleted(params: {
  product: string;
  planType: string;
  subscriptionId?: string;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.PURCHASE_COMPLETED, {
    product: params.product,
    plan_type: params.planType,
    subscription_id: params.subscriptionId ?? null,
  });
}

/**
 * Track when a subscription is cancelled
 */
export async function trackSubscriptionCancelled(params: {
  subscriptionId: string;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.SUBSCRIPTION_CANCELLED, {
    subscription_id: params.subscriptionId,
  });
}

/**
 * Track when a report is generated
 */
export async function trackReportGenerated(params: {
  reportType: string;
  score?: number;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.REPORT_GENERATED, {
    report_type: params.reportType,
    score: params.score ?? null,
  });
}

/**
 * Track when an analysis is completed
 */
export async function trackAnalysisCompleted(params: {
  analysisType: string;
  duration?: number;
}): Promise<void> {
  await trackServerEvent(AnalyticsEvents.ANALYSIS_COMPLETED, {
    analysis_type: params.analysisType,
    duration_ms: params.duration ?? null,
  });
}

// ============================================================================
// Client-Side Convenience Functions
// ============================================================================

/**
 * Track a button click (client-side)
 */
export function trackButtonClick(params: {
  button: string;
  location?: string;
  variant?: string;
}): void {
  trackEvent(AnalyticsEvents.BUTTON_CLICKED, {
    button: params.button,
    location: params.location ?? null,
    variant: params.variant ?? null,
  });
}

/**
 * Track a CTA click (client-side)
 */
export function trackCTAClick(params: {
  cta: string;
  location: string;
  destination?: string;
}): void {
  trackEvent(AnalyticsEvents.CTA_CLICKED, {
    cta: params.cta,
    location: params.location,
    destination: params.destination ?? null,
  });
}

/**
 * Track feature usage (client-side)
 */
export function trackFeatureUsed(params: {
  feature: string;
  action?: string;
}): void {
  trackEvent(AnalyticsEvents.FEATURE_USED, {
    feature: params.feature,
    action: params.action ?? 'used',
  });
}
