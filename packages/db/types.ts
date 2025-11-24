// Database types generated from schema
// These provide full type safety for Supabase queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          auth_method: string
          subscription_tier: string
          tags: Json
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          auth_method?: string
          subscription_tier?: string
          tags?: Json
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          auth_method?: string
          subscription_tier?: string
          tags?: Json
          preferences?: Json
          updated_at?: string
        }
      }
      agencies: {
        Row: {
          id: string
          name: string
          url: string | null
          industry: string | null
          team_size: string | null
          revenue_band: string | null
          services: Json
          icp_data: Json
          market_position: string | null
          health_scores: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url?: string | null
          industry?: string | null
          team_size?: string | null
          revenue_band?: string | null
          services?: Json
          icp_data?: Json
          market_position?: string | null
          health_scores?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string | null
          industry?: string | null
          team_size?: string | null
          revenue_band?: string | null
          services?: Json
          icp_data?: Json
          market_position?: string | null
          health_scores?: Json
          metadata?: Json
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          url: string | null
          industry: string | null
          markets_served: Json
          services_offered: Json
          competitors: Json
          icp_data: Json
          positioning_summary: string | null
          social_links: Json
          tags: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url?: string | null
          industry?: string | null
          markets_served?: Json
          services_offered?: Json
          competitors?: Json
          icp_data?: Json
          positioning_summary?: string | null
          social_links?: Json
          tags?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string | null
          industry?: string | null
          markets_served?: Json
          services_offered?: Json
          competitors?: Json
          icp_data?: Json
          positioning_summary?: string | null
          social_links?: Json
          tags?: Json
          metadata?: Json
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          agency_id: string
          company_id: string | null
          name: string
          stage: string
          value_cents: number | null
          currency: string
          timeline: Json
          buyer_reasons: Json
          desired_outcomes: Json
          objections: Json
          risks: Json
          constraints: Json
          scope_signals: Json
          competitor_context: Json
          stakeholder_ids: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          company_id?: string | null
          name: string
          stage?: string
          value_cents?: number | null
          currency?: string
          timeline?: Json
          buyer_reasons?: Json
          desired_outcomes?: Json
          objections?: Json
          risks?: Json
          constraints?: Json
          scope_signals?: Json
          competitor_context?: Json
          stakeholder_ids?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          company_id?: string | null
          name?: string
          stage?: string
          value_cents?: number | null
          currency?: string
          timeline?: Json
          buyer_reasons?: Json
          desired_outcomes?: Json
          objections?: Json
          risks?: Json
          constraints?: Json
          scope_signals?: Json
          competitor_context?: Json
          stakeholder_ids?: string[]
          metadata?: Json
          updated_at?: string
        }
      }
      ingestion_items: {
        Row: {
          id: string
          agency_id: string
          user_id: string | null
          deal_id: string | null
          company_id: string | null
          source_type: string
          source_channel: string | null
          source_url: string | null
          raw_content: string | null
          content_format: string | null
          file_path: string | null
          transcript_metadata: Json
          participants: Json
          status: string
          processed_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id?: string | null
          deal_id?: string | null
          company_id?: string | null
          source_type: string
          source_channel?: string | null
          source_url?: string | null
          raw_content?: string | null
          content_format?: string | null
          file_path?: string | null
          transcript_metadata?: Json
          participants?: Json
          status?: string
          processed_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string | null
          deal_id?: string | null
          company_id?: string | null
          source_type?: string
          source_channel?: string | null
          source_url?: string | null
          raw_content?: string | null
          content_format?: string | null
          file_path?: string | null
          transcript_metadata?: Json
          participants?: Json
          status?: string
          processed_at?: string | null
          error_message?: string | null
          metadata?: Json
          updated_at?: string
        }
      }
      call_scores: {
        Row: {
          id: string
          ingestion_item_id: string
          deal_id: string | null
          agency_id: string
          user_id: string | null
          version: string
          overall_score: number | null
          overall_grade: string | null
          lite_scores: Json
          full_scores: Json
          framework_scores: Json
          talk_listen_ratio: Json
          engagement_level: string | null
          likelihood_to_advance: number | null
          diagnosis_summary: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          ingestion_item_id: string
          deal_id?: string | null
          agency_id: string
          user_id?: string | null
          version?: string
          overall_score?: number | null
          overall_grade?: string | null
          lite_scores?: Json
          full_scores?: Json
          framework_scores?: Json
          talk_listen_ratio?: Json
          engagement_level?: string | null
          likelihood_to_advance?: number | null
          diagnosis_summary?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          ingestion_item_id?: string
          deal_id?: string | null
          agency_id?: string
          user_id?: string | null
          version?: string
          overall_score?: number | null
          overall_grade?: string | null
          lite_scores?: Json
          full_scores?: Json
          framework_scores?: Json
          talk_listen_ratio?: Json
          engagement_level?: string | null
          likelihood_to_advance?: number | null
          diagnosis_summary?: string | null
          metadata?: Json
        }
      }
      call_snippets: {
        Row: {
          id: string
          call_score_id: string
          ingestion_item_id: string
          snippet_type: string
          transcript_quote: string
          speaker: string | null
          timestamp_start: string | null
          timestamp_end: string | null
          rep_behavior: string | null
          coaching_note: string | null
          alternative_response: string | null
          category_affected: string | null
          impact: string | null
          display_order: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          call_score_id: string
          ingestion_item_id: string
          snippet_type: string
          transcript_quote: string
          speaker?: string | null
          timestamp_start?: string | null
          timestamp_end?: string | null
          rep_behavior?: string | null
          coaching_note?: string | null
          alternative_response?: string | null
          category_affected?: string | null
          impact?: string | null
          display_order?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          call_score_id?: string
          ingestion_item_id?: string
          snippet_type?: string
          transcript_quote?: string
          speaker?: string | null
          timestamp_start?: string | null
          timestamp_end?: string | null
          rep_behavior?: string | null
          coaching_note?: string | null
          alternative_response?: string | null
          category_affected?: string | null
          impact?: string | null
          display_order?: number | null
          metadata?: Json
        }
      }
      follow_up_templates: {
        Row: {
          id: string
          call_score_id: string
          deal_id: string | null
          template_type: string
          subject_line: string | null
          body: string
          task_checklist: Json
          promises_referenced: Json
          display_order: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          call_score_id: string
          deal_id?: string | null
          template_type: string
          subject_line?: string | null
          body: string
          task_checklist?: Json
          promises_referenced?: Json
          display_order?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          call_score_id?: string
          deal_id?: string | null
          template_type?: string
          subject_line?: string | null
          body?: string
          task_checklist?: Json
          promises_referenced?: Json
          display_order?: number | null
          metadata?: Json
        }
      }
      tool_runs: {
        Row: {
          id: string
          user_id: string | null
          agency_id: string | null
          lead_email: string | null
          lead_name: string | null
          tool_name: string
          tool_version: string
          status: string
          started_at: string
          completed_at: string | null
          duration_ms: number | null
          input_data: Json
          ingestion_item_id: string | null
          result_ids: Json
          error_message: string | null
          error_stack: string | null
          model_used: string | null
          tokens_used: Json
          email_sent_at: string | null
          pdf_generated_at: string | null
          pdf_path: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agency_id?: string | null
          lead_email?: string | null
          lead_name?: string | null
          tool_name: string
          tool_version?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          input_data?: Json
          ingestion_item_id?: string | null
          result_ids?: Json
          error_message?: string | null
          error_stack?: string | null
          model_used?: string | null
          tokens_used?: Json
          email_sent_at?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agency_id?: string | null
          lead_email?: string | null
          lead_name?: string | null
          tool_name?: string
          tool_version?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
          input_data?: Json
          ingestion_item_id?: string | null
          result_ids?: Json
          error_message?: string | null
          error_stack?: string | null
          model_used?: string | null
          tokens_used?: Json
          email_sent_at?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          metadata?: Json
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
