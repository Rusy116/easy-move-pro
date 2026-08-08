export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          quote_id: string | null
          read_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          quote_id?: string | null
          read_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          quote_id?: string | null
          read_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          avg_runtime_ms: number
          capabilities: string[]
          category: string
          config: Json
          cpu_usage: number
          created_at: string
          created_by: string | null
          current_task: string | null
          dependencies: string[]
          description: string
          enabled: boolean
          error_count: number
          estimated_completion: string | null
          id: string
          inputs: Json
          key: string
          last_activity_at: string | null
          last_error: string | null
          last_run_at: string | null
          last_runtime_ms: number
          max_retries: number
          memory_usage: number
          name: string
          next_run_at: string | null
          outputs: Json
          priority: number
          progress: number
          queue: string
          retry_count: number
          route: string | null
          run_count: number
          schedule: string | null
          sort_order: number
          status: string
          success_rate: number
          tasks_completed: number
          tasks_failed: number
          trigger_type: string
          updated_at: string
          version: string
        }
        Insert: {
          avg_runtime_ms?: number
          capabilities?: string[]
          category?: string
          config?: Json
          cpu_usage?: number
          created_at?: string
          created_by?: string | null
          current_task?: string | null
          dependencies?: string[]
          description?: string
          enabled?: boolean
          error_count?: number
          estimated_completion?: string | null
          id?: string
          inputs?: Json
          key: string
          last_activity_at?: string | null
          last_error?: string | null
          last_run_at?: string | null
          last_runtime_ms?: number
          max_retries?: number
          memory_usage?: number
          name: string
          next_run_at?: string | null
          outputs?: Json
          priority?: number
          progress?: number
          queue?: string
          retry_count?: number
          route?: string | null
          run_count?: number
          schedule?: string | null
          sort_order?: number
          status?: string
          success_rate?: number
          tasks_completed?: number
          tasks_failed?: number
          trigger_type?: string
          updated_at?: string
          version?: string
        }
        Update: {
          avg_runtime_ms?: number
          capabilities?: string[]
          category?: string
          config?: Json
          cpu_usage?: number
          created_at?: string
          created_by?: string | null
          current_task?: string | null
          dependencies?: string[]
          description?: string
          enabled?: boolean
          error_count?: number
          estimated_completion?: string | null
          id?: string
          inputs?: Json
          key?: string
          last_activity_at?: string | null
          last_error?: string | null
          last_run_at?: string | null
          last_runtime_ms?: number
          max_retries?: number
          memory_usage?: number
          name?: string
          next_run_at?: string | null
          outputs?: Json
          priority?: number
          progress?: number
          queue?: string
          retry_count?: number
          route?: string | null
          run_count?: number
          schedule?: string | null
          sort_order?: number
          status?: string
          success_rate?: number
          tasks_completed?: number
          tasks_failed?: number
          trigger_type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      ai_automations: {
        Row: {
          agent_key: string
          capability: string
          created_at: string
          created_by: string | null
          day_of_week: number | null
          description: string | null
          enabled: boolean
          frequency: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          params: Json
          quantity: number
          run_at: string | null
          updated_at: string
        }
        Insert: {
          agent_key: string
          capability: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          description?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          params?: Json
          quantity?: number
          run_at?: string | null
          updated_at?: string
        }
        Update: {
          agent_key?: string
          capability?: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number | null
          description?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          params?: Json
          quantity?: number
          run_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_content_items: {
        Row: {
          agent_key: string | null
          archived_at: string | null
          body: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          keyword: string | null
          kind: string
          locale: string
          published_at: string | null
          quality_score: number | null
          scheduled_for: string | null
          schema_markup: Json | null
          seo: Json
          slug: string | null
          status: string
          summary: string | null
          target_city: string | null
          target_state: string | null
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_key?: string | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          keyword?: string | null
          kind?: string
          locale?: string
          published_at?: string | null
          quality_score?: number | null
          scheduled_for?: string | null
          schema_markup?: Json | null
          seo?: Json
          slug?: string | null
          status?: string
          summary?: string | null
          target_city?: string | null
          target_state?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_key?: string | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          keyword?: string | null
          kind?: string
          locale?: string
          published_at?: string | null
          quality_score?: number | null
          scheduled_for?: string | null
          schema_markup?: Json | null
          seo?: Json
          slug?: string | null
          status?: string
          summary?: string | null
          target_city?: string | null
          target_state?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metrics_daily: {
        Row: {
          created_at: string
          day: string
          dims: Json
          id: string
          metric: string
          value: number
        }
        Insert: {
          created_at?: string
          day?: string
          dims?: Json
          id?: string
          metric: string
          value?: number
        }
        Update: {
          created_at?: string
          day?: string
          dims?: Json
          id?: string
          metric?: string
          value?: number
        }
        Relationships: []
      }
      ai_notifications: {
        Row: {
          agent_key: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          severity: string
          task_id: string | null
          title: string
        }
        Insert: {
          agent_key?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          severity?: string
          task_id?: string | null
          title: string
        }
        Update: {
          agent_key?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          severity?: string
          task_id?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_products: {
        Row: {
          agent_key: string | null
          assets: Json
          bundle_of: Json
          cover_url: string | null
          created_at: string
          description: string | null
          downloads: number
          id: string
          preview_urls: Json
          price_cents: number
          product_type: string
          published_at: string | null
          quality_score: number | null
          revenue_cents: number
          scheduled_for: string | null
          seo: Json
          slug: string | null
          status: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_key?: string | null
          assets?: Json
          bundle_of?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          id?: string
          preview_urls?: Json
          price_cents?: number
          product_type?: string
          published_at?: string | null
          quality_score?: number | null
          revenue_cents?: number
          scheduled_for?: string | null
          seo?: Json
          slug?: string | null
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_key?: string | null
          assets?: Json
          bundle_of?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          id?: string
          preview_urls?: Json
          price_cents?: number
          product_type?: string
          published_at?: string | null
          quality_score?: number | null
          revenue_cents?: number
          scheduled_for?: string | null
          seo?: Json
          slug?: string | null
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_products_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ai_supervisor_incidents: {
        Row: {
          agent_key: string | null
          created_at: string
          details: Json
          id: string
          kind: string
          landing_slug: string | null
          message: string
          resolved_at: string | null
          severity: string
        }
        Insert: {
          agent_key?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind: string
          landing_slug?: string | null
          message: string
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          agent_key?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          landing_slug?: string | null
          message?: string
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      ai_supervisor_reports: {
        Row: {
          batch_label: string
          created_at: string
          id: string
          kind: string
          metrics: Json
          state_code: string | null
          summary: string
        }
        Insert: {
          batch_label: string
          created_at?: string
          id?: string
          kind: string
          metrics?: Json
          state_code?: string | null
          summary: string
        }
        Update: {
          batch_label?: string
          created_at?: string
          id?: string
          kind?: string
          metrics?: Json
          state_code?: string | null
          summary?: string
        }
        Relationships: []
      }
      ai_task_logs: {
        Row: {
          agent_key: string
          created_at: string
          id: string
          level: string
          message: string
          meta: Json
          task_id: string | null
        }
        Insert: {
          agent_key: string
          created_at?: string
          id?: string
          level?: string
          message: string
          meta?: Json
          task_id?: string | null
        }
        Update: {
          agent_key?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tasks: {
        Row: {
          agent_key: string
          capability: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          depends_on: string[]
          duration_ms: number | null
          error: string | null
          id: string
          max_retries: number
          params: Json
          priority: number
          progress: number
          result: Json | null
          retry_count: number
          scheduled_for: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          capability: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[]
          duration_ms?: number | null
          error?: string | null
          id?: string
          max_retries?: number
          params?: Json
          priority?: number
          progress?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          capability?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[]
          duration_ms?: number | null
          error?: string | null
          id?: string
          max_retries?: number
          params?: Json
          priority?: number
          progress?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          quote_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          quote_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          quote_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_of_lading: {
        Row: {
          company_id: string
          created_at: string
          id: string
          issued_at: string
          job_id: string
          number: string
          payload: Json
          quote_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          issued_at?: string
          job_id: string
          number: string
          payload?: Json
          quote_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          job_id?: string
          number?: string
          payload?: Json
          quote_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_of_lading_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      city_landing_pages: {
        Row: {
          audit_report: Json | null
          audit_score: number | null
          audited_at: string | null
          avg_position: number
          blocked_reason: string | null
          calculator_status: string
          canonical_url: string | null
          city: string
          city_status: string
          clicks: number
          content: Json
          county: string | null
          created_at: string
          ctr: number
          error: string | null
          facts: Json
          generation_ms: number
          hierarchy: Json | null
          highways: string[]
          id: string
          imported_at: string
          impressions: number
          improvement_count: number
          index_status: string
          index_submitted_at: string | null
          internal_links: number
          last_crawl: string | null
          last_improved_at: string | null
          media: Json
          monitor_health: string | null
          monitored_at: string | null
          nearby_cities: Json
          neighborhoods: string[]
          population: number | null
          prev_avg_position: number | null
          publish_attempts: number
          published_at: string | null
          run_id: string | null
          schema_valid: boolean
          seo_attempts: number
          seo_content: Json | null
          seo_error: string | null
          seo_generation_ms: number | null
          seo_published_at: string | null
          seo_score: number
          seo_slug: string | null
          seo_status: string
          slug: string
          source: string
          state_code: string
          state_name: string
          status: string
          timezone: string | null
          updated_at: string
          validation: Json
          version: number
          word_count: number
          zip_codes: string[]
        }
        Insert: {
          audit_report?: Json | null
          audit_score?: number | null
          audited_at?: string | null
          avg_position?: number
          blocked_reason?: string | null
          calculator_status?: string
          canonical_url?: string | null
          city: string
          city_status?: string
          clicks?: number
          content?: Json
          county?: string | null
          created_at?: string
          ctr?: number
          error?: string | null
          facts?: Json
          generation_ms?: number
          hierarchy?: Json | null
          highways?: string[]
          id?: string
          imported_at?: string
          impressions?: number
          improvement_count?: number
          index_status?: string
          index_submitted_at?: string | null
          internal_links?: number
          last_crawl?: string | null
          last_improved_at?: string | null
          media?: Json
          monitor_health?: string | null
          monitored_at?: string | null
          nearby_cities?: Json
          neighborhoods?: string[]
          population?: number | null
          prev_avg_position?: number | null
          publish_attempts?: number
          published_at?: string | null
          run_id?: string | null
          schema_valid?: boolean
          seo_attempts?: number
          seo_content?: Json | null
          seo_error?: string | null
          seo_generation_ms?: number | null
          seo_published_at?: string | null
          seo_score?: number
          seo_slug?: string | null
          seo_status?: string
          slug: string
          source?: string
          state_code: string
          state_name: string
          status?: string
          timezone?: string | null
          updated_at?: string
          validation?: Json
          version?: number
          word_count?: number
          zip_codes?: string[]
        }
        Update: {
          audit_report?: Json | null
          audit_score?: number | null
          audited_at?: string | null
          avg_position?: number
          blocked_reason?: string | null
          calculator_status?: string
          canonical_url?: string | null
          city?: string
          city_status?: string
          clicks?: number
          content?: Json
          county?: string | null
          created_at?: string
          ctr?: number
          error?: string | null
          facts?: Json
          generation_ms?: number
          hierarchy?: Json | null
          highways?: string[]
          id?: string
          imported_at?: string
          impressions?: number
          improvement_count?: number
          index_status?: string
          index_submitted_at?: string | null
          internal_links?: number
          last_crawl?: string | null
          last_improved_at?: string | null
          media?: Json
          monitor_health?: string | null
          monitored_at?: string | null
          nearby_cities?: Json
          neighborhoods?: string[]
          population?: number | null
          prev_avg_position?: number | null
          publish_attempts?: number
          published_at?: string | null
          run_id?: string | null
          schema_valid?: boolean
          seo_attempts?: number
          seo_content?: Json | null
          seo_error?: string | null
          seo_generation_ms?: number | null
          seo_published_at?: string | null
          seo_score?: number
          seo_slug?: string | null
          seo_status?: string
          slug?: string
          source?: string
          state_code?: string
          state_name?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          validation?: Json
          version?: number
          word_count?: number
          zip_codes?: string[]
        }
        Relationships: []
      }
      city_landing_runs: {
        Row: {
          batch_size: number
          city_slugs: string[]
          created_at: string
          created_by: string | null
          cursor: number
          failed: number
          generated: number
          id: string
          last_error: string | null
          published: number
          scope: string
          seo_generated: number
          skipped: number
          state_code: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          batch_size?: number
          city_slugs?: string[]
          created_at?: string
          created_by?: string | null
          cursor?: number
          failed?: number
          generated?: number
          id?: string
          last_error?: string | null
          published?: number
          scope: string
          seo_generated?: number
          skipped?: number
          state_code?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          batch_size?: number
          city_slugs?: string[]
          created_at?: string
          created_by?: string | null
          cursor?: number
          failed?: number
          generated?: number
          id?: string
          last_error?: string | null
          published?: number
          scope?: string
          seo_generated?: number
          skipped?: number
          state_code?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      city_production_jobs: {
        Row: {
          attempts: number
          city: string
          city_slug: string
          completed_at: string | null
          county: string | null
          created_at: string
          duration_ms: number
          id: string
          landing_slug: string
          last_error: string | null
          leased_until: string | null
          population: number
          priority: number
          queued_at: string
          skipped_reason: string | null
          stage: number
          stage_results: Json
          started_at: string | null
          state_code: string
          status: string
          supervisor_state: string
          tier: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          city: string
          city_slug: string
          completed_at?: string | null
          county?: string | null
          created_at?: string
          duration_ms?: number
          id?: string
          landing_slug: string
          last_error?: string | null
          leased_until?: string | null
          population?: number
          priority?: number
          queued_at?: string
          skipped_reason?: string | null
          stage?: number
          stage_results?: Json
          started_at?: string | null
          state_code: string
          status?: string
          supervisor_state?: string
          tier?: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          city?: string
          city_slug?: string
          completed_at?: string | null
          county?: string | null
          created_at?: string
          duration_ms?: number
          id?: string
          landing_slug?: string
          last_error?: string | null
          leased_until?: string | null
          population?: number
          priority?: number
          queued_at?: string
          skipped_reason?: string | null
          stage?: number
          stage_results?: Json
          started_at?: string | null
          state_code?: string
          status?: string
          supervisor_state?: string
          tier?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      city_publish_log: {
        Row: {
          attempt: number
          calculator_status: string
          city: string
          created_at: string
          duration_ms: number
          id: string
          reason: string | null
          result: string
          run_id: string | null
          seo_score: number
          slug: string
          state_code: string
          version: number
        }
        Insert: {
          attempt?: number
          calculator_status?: string
          city: string
          created_at?: string
          duration_ms?: number
          id?: string
          reason?: string | null
          result: string
          run_id?: string | null
          seo_score?: number
          slug: string
          state_code: string
          version?: number
        }
        Update: {
          attempt?: number
          calculator_status?: string
          city?: string
          created_at?: string
          duration_ms?: number
          id?: string
          reason?: string | null
          result?: string
          run_id?: string | null
          seo_score?: number
          slug?: string
          state_code?: string
          version?: number
        }
        Relationships: []
      }
      city_worker_runs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          failed: number
          id: string
          jobs_processed: number
          published: number
          reclaimed: number
          refilled: number
          stages_run: number
          trigger: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          failed?: number
          id?: string
          jobs_processed?: number
          published?: number
          reclaimed?: number
          refilled?: number
          stages_run?: number
          trigger?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          failed?: number
          id?: string
          jobs_processed?: number
          published?: number
          reclaimed?: number
          refilled?: number
          stages_run?: number
          trigger?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      commission_invoices: {
        Row: {
          amount: number
          amount_paid: number
          broker_amount: number
          broker_id: string | null
          broker_rate: number
          cancelled_at: string | null
          commission_id: string
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string
          final_price: number
          id: string
          issue_date: string
          notes: string | null
          number: string
          paid_at: string | null
          quote_id: string
          rate: number
          sent_at: string | null
          status: string
          updated_at: string
          viewed_at: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          broker_amount?: number
          broker_id?: string | null
          broker_rate?: number
          cancelled_at?: string | null
          commission_id: string
          company_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string
          final_price: number
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          paid_at?: string | null
          quote_id: string
          rate: number
          sent_at?: string | null
          status?: string
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          broker_amount?: number
          broker_id?: string | null
          broker_rate?: number
          cancelled_at?: string | null
          commission_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string
          final_price?: number
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          quote_id?: string
          rate?: number
          sent_at?: string | null
          status?: string
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_invoices_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: true
            referencedRelation: "company_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          amount: number
          commission_id: string | null
          company_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string
          method: string
          note: string | null
          paid_at: string
          recorded_by: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          commission_id?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          method?: string
          note?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_id?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          method?: string
          note?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "commission_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      company_activity: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string
          detail: Json
          id: string
          quote_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          quote_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_activity_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_activity_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_claims: {
        Row: {
          claimed_at: string
          claimed_by: string | null
          company_id: string
          created_at: string
          expires_at: string
          id: string
          quote_id: string
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string
          claimed_by?: string | null
          company_id: string
          created_at?: string
          expires_at?: string
          id?: string
          quote_id: string
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string
          claimed_by?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          quote_id?: string
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_claims_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_claims_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_commissions: {
        Row: {
          amount: number
          base_price: number
          broker_amount: number
          broker_id: string | null
          broker_rate: number
          cancelled_at: string | null
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          paid_at: string | null
          quote_id: string
          rate: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          base_price: number
          broker_amount?: number
          broker_id?: string | null
          broker_rate?: number
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          paid_at?: string | null
          quote_id: string
          rate?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          base_price?: number
          broker_amount?: number
          broker_id?: string | null
          broker_rate?: number
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          paid_at?: string | null
          quote_id?: string
          rate?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_commissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_commissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contact_log: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          quote_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          quote_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          quote_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contact_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contact_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contact_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_conversations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["company_conv_kind"]
          last_message_at: string
          quote_id: string | null
          subject: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["company_conv_kind"]
          last_message_at?: string
          quote_id?: string | null
          subject: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["company_conv_kind"]
          last_message_at?: string
          quote_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_conversations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_conversations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_crews: {
        Row: {
          company_id: string
          created_at: string
          id: string
          lead_name: string | null
          name: string
          notes: string | null
          phone: string | null
          size: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          lead_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          size?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          lead_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          size?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_crews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          external_url: string | null
          id: string
          invoice_id: string | null
          kind: Database["public"]["Enums"]["company_doc_kind"]
          mime: string | null
          name: string
          parent_id: string | null
          quote_id: string | null
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          external_url?: string | null
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["company_doc_kind"]
          mime?: string | null
          name: string
          parent_id?: string | null
          quote_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          external_url?: string | null
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["company_doc_kind"]
          mime?: string | null
          name?: string
          parent_id?: string | null
          quote_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "company_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "company_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invoice_items: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "company_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invoices: {
        Row: {
          amount_paid: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number
          due_date: string | null
          id: string
          issue_date: string
          kind: Database["public"]["Enums"]["company_invoice_kind"]
          notes: string | null
          number: string
          paid_at: string | null
          pdf_path: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["company_invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          issue_date?: string
          kind?: Database["public"]["Enums"]["company_invoice_kind"]
          notes?: string | null
          number: string
          paid_at?: string | null
          pdf_path?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["company_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          issue_date?: string
          kind?: Database["public"]["Enums"]["company_invoice_kind"]
          notes?: string | null
          number?: string
          paid_at?: string | null
          pdf_path?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["company_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_job_tasks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          done: boolean
          due_date: string | null
          id: string
          quote_id: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          quote_id: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          quote_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_job_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_job_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_job_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_messages: {
        Row: {
          attachments: Json
          body: string
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_name: string | null
          sender_role: string
          sender_user_id: string | null
        }
        Insert: {
          attachments?: Json
          body: string
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Update: {
          attachments?: Json
          body?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "company_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notes: {
        Row: {
          author_id: string | null
          body: string
          company_id: string
          created_at: string
          id: string
          quote_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          company_id: string
          created_at?: string
          id?: string
          quote_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          quote_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          payload: Json
          quote_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          quote_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          quote_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_price_revisions: {
        Row: {
          additional_charges: number
          attachments: Json
          company_id: string
          created_at: string
          deposit_amount: number | null
          id: string
          kind: string
          new_price: number
          notes: string | null
          previous_price: number | null
          quote_id: string
          reason: string | null
          requested_by: string | null
          revision: number
          status: string
          updated_at: string
        }
        Insert: {
          additional_charges?: number
          attachments?: Json
          company_id: string
          created_at?: string
          deposit_amount?: number | null
          id?: string
          kind?: string
          new_price: number
          notes?: string | null
          previous_price?: number | null
          quote_id: string
          reason?: string | null
          requested_by?: string | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Update: {
          additional_charges?: number
          attachments?: Json
          company_id?: string
          created_at?: string
          deposit_amount?: number | null
          id?: string
          kind?: string
          new_price?: number
          notes?: string | null
          previous_price?: number | null
          quote_id?: string
          reason?: string | null
          requested_by?: string | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_price_revisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_price_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_price_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_service_areas: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["company_service_area_kind"]
          radius_miles: number | null
          value: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["company_service_area_kind"]
          radius_miles?: number | null
          value: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["company_service_area_kind"]
          radius_miles?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_service_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_status_history: {
        Row: {
          actor_id: string | null
          company_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          quote_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          quote_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          quote_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_status_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_trucks: {
        Row: {
          capacity_cuft: number | null
          capacity_lbs: number | null
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          plate: string | null
          status: string
        }
        Insert: {
          capacity_cuft?: number | null
          capacity_lbs?: number | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          plate?: string | null
          status?: string
        }
        Update: {
          capacity_cuft?: number | null
          capacity_lbs?: number | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          plate?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_trucks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_warnings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: string
          level: number
          quote_id: string | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind?: string
          level?: number
          quote_id?: string | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          level?: number
          quote_id?: string | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_warnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_warnings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_warnings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json
          quote_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          quote_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          quote_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string
          email_marketing: boolean
          email_messages: boolean
          email_status_updates: boolean
          sms_status_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_marketing?: boolean
          email_messages?: boolean
          email_status_updates?: boolean
          sms_status_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_marketing?: boolean
          email_messages?: boolean
          email_status_updates?: boolean
          sms_status_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          download_url: string | null
          id: string
          product_id: string | null
          product_slug: string | null
          purchased_at: string
          status: string
          title: string
          user_id: string
          version: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          download_url?: string | null
          id?: string
          product_id?: string | null
          product_slug?: string | null
          purchased_at?: string
          status?: string
          title: string
          user_id: string
          version?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          download_url?: string | null
          id?: string
          product_id?: string | null
          product_slug?: string | null
          purchased_at?: string
          status?: string
          title?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          id: string
          quote_id: string
          rating_communication: number
          rating_overall: number
          rating_professionalism: number
          rating_punctuality: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quote_id: string
          rating_communication: number
          rating_overall: number
          rating_professionalism: number
          rating_punctuality: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quote_id?: string
          rating_communication?: number
          rating_overall?: number
          rating_professionalism?: number
          rating_punctuality?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_id: string
          created_at: string
          destination_address: string | null
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          origin_address: string | null
          phone: string | null
          quote_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          destination_address?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          origin_address?: string | null
          phone?: string | null
          quote_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          destination_address?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          origin_address?: string | null
          phone?: string | null
          quote_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          id: string
          price_cents: number
          published: boolean
          slug: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          price_cents?: number
          published?: boolean
          slug: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          price_cents?: number
          published?: boolean
          slug?: string
          title?: string
        }
        Relationships: []
      }
      estimate_revisions: {
        Row: {
          accepted_at: string | null
          amount: number
          assignment_id: string
          breakdown: Json
          broker_commission: number | null
          broker_estimate_high: number | null
          broker_estimate_low: number | null
          commission_rate: number
          company_estimate: number | null
          company_id: string
          currency: string
          final_accepted_price: number | null
          gross_profit: number | null
          id: string
          is_current: boolean
          notes: string | null
          quote_id: string
          rejected_at: string | null
          rejection_reason: string | null
          revision: number
          sent_at: string | null
          sent_to_email: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          assignment_id: string
          breakdown?: Json
          broker_commission?: number | null
          broker_estimate_high?: number | null
          broker_estimate_low?: number | null
          commission_rate?: number
          company_estimate?: number | null
          company_id: string
          currency?: string
          final_accepted_price?: number | null
          gross_profit?: number | null
          id?: string
          is_current?: boolean
          notes?: string | null
          quote_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision?: number
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          assignment_id?: string
          breakdown?: Json
          broker_commission?: number | null
          broker_estimate_high?: number | null
          broker_estimate_low?: number | null
          commission_rate?: number
          company_estimate?: number | null
          company_id?: string
          currency?: string
          final_accepted_price?: number | null
          gross_profit?: number | null
          id?: string
          is_current?: boolean
          notes?: string | null
          quote_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          revision?: number
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_revisions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "quote_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_revisions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_events: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          detail: Json
          id: string
          ip_address: string | null
          session_id: string
          target_role: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          detail?: Json
          id?: string
          ip_address?: string | null
          session_id: string
          target_role: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          detail?: Json
          id?: string
          ip_address?: string | null
          session_id?: string
          target_role?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "impersonation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          admin_email: string | null
          admin_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          ip_address: string | null
          started_at: string
          target_email: string | null
          target_name: string | null
          target_role: string
          target_user_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          started_at?: string
          target_email?: string | null
          target_name?: string | null
          target_role: string
          target_user_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          started_at?: string
          target_email?: string | null
          target_name?: string | null
          target_role?: string
          target_user_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          arrival_window: string | null
          broker_commission: number
          company_id: string
          created_at: string
          crew_size: number | null
          customer_id: string | null
          estimate_revision_id: string | null
          final_price: number
          gross_profit: number
          id: string
          job_number: string
          notes: string | null
          quote_id: string
          scheduled_date: string | null
          status: string
          truck_size: string | null
          updated_at: string
        }
        Insert: {
          arrival_window?: string | null
          broker_commission?: number
          company_id: string
          created_at?: string
          crew_size?: number | null
          customer_id?: string | null
          estimate_revision_id?: string | null
          final_price?: number
          gross_profit?: number
          id?: string
          job_number: string
          notes?: string | null
          quote_id: string
          scheduled_date?: string | null
          status?: string
          truck_size?: string | null
          updated_at?: string
        }
        Update: {
          arrival_window?: string | null
          broker_commission?: number
          company_id?: string
          created_at?: string
          crew_size?: number | null
          customer_id?: string | null
          estimate_revision_id?: string | null
          final_price?: number
          gross_profit?: number
          id?: string
          job_number?: string
          notes?: string | null
          quote_id?: string
          scheduled_date?: string | null
          status?: string
          truck_size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_estimate_revision_id_fkey"
            columns: ["estimate_revision_id"]
            isOneToOne: false
            referencedRelation: "estimate_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_communications: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          body: string | null
          channel: string
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          metadata: Json
          occurred_at: string
          quote_id: string
          status: string
          subject: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          body?: string | null
          channel: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          quote_id: string
          status?: string
          subject?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          occurred_at?: string
          quote_id?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_communications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_communications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distributions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          match_reason: string
          notified_at: string
          quote_id: string
          revoke_reason: string | null
          revoked_at: string | null
          round: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          match_reason?: string
          notified_at?: string
          quote_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          round?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          match_reason?: string
          notified_at?: string
          quote_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          round?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_distributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          kind: string
          mime: string | null
          name: string
          quote_id: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string | null
          uploaded_by_email: string | null
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string
          mime?: string | null
          name: string
          quote_id: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          kind?: string
          mime?: string | null
          name?: string
          quote_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          actor_type: string
          assignment_id: string | null
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          is_public: boolean
          payload: Json
          quote_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          is_public?: boolean
          payload?: Json
          quote_id: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          is_public?: boolean
          payload?: Json
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "quote_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          due_at: string | null
          id: string
          kind: string
          notes: string | null
          owner_email: string | null
          owner_id: string | null
          priority: string
          quote_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner_email?: string | null
          owner_id?: string | null
          priority?: string
          quote_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner_email?: string | null
          owner_id?: string | null
          priority?: string
          quote_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      moving_companies: {
        Row: {
          active: boolean
          address_city: string | null
          address_line1: string | null
          address_state: string | null
          address_zip: string | null
          approved: boolean
          created_at: string
          dot_number: string | null
          email: string | null
          fleet_size: number | null
          id: string
          insurance_carrier: string | null
          insurance_expires: string | null
          insurance_policy: string | null
          license_status: string
          logo_url: string | null
          mc_number: string | null
          movers_count: number | null
          name: string
          notes: string | null
          owner_first_name: string | null
          owner_last_name: string | null
          phone: string | null
          rating: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          serves_entire_state: boolean
          service_cities: string[]
          service_states: string[]
          services_offered: string[]
          settings: Json
          slug: string | null
          status: string
          suspended: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          approved?: boolean
          created_at?: string
          dot_number?: string | null
          email?: string | null
          fleet_size?: number | null
          id?: string
          insurance_carrier?: string | null
          insurance_expires?: string | null
          insurance_policy?: string | null
          license_status?: string
          logo_url?: string | null
          mc_number?: string | null
          movers_count?: number | null
          name: string
          notes?: string | null
          owner_first_name?: string | null
          owner_last_name?: string | null
          phone?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_entire_state?: boolean
          service_cities?: string[]
          service_states?: string[]
          services_offered?: string[]
          settings?: Json
          slug?: string | null
          status?: string
          suspended?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address_city?: string | null
          address_line1?: string | null
          address_state?: string | null
          address_zip?: string | null
          approved?: boolean
          created_at?: string
          dot_number?: string | null
          email?: string | null
          fleet_size?: number | null
          id?: string
          insurance_carrier?: string | null
          insurance_expires?: string | null
          insurance_policy?: string | null
          license_status?: string
          logo_url?: string | null
          mc_number?: string | null
          movers_count?: number | null
          name?: string
          notes?: string | null
          owner_first_name?: string | null
          owner_last_name?: string | null
          phone?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          serves_entire_state?: boolean
          service_cities?: string[]
          service_states?: string[]
          services_offered?: string[]
          settings?: Json
          slug?: string | null
          status?: string
          suspended?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          admin_notes: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          crew_size: number | null
          id: string
          insurance_carrier: string | null
          insurance_policy: string | null
          mc_number: string | null
          service_cities: string[] | null
          service_radius_miles: number | null
          service_states: string[] | null
          services_offered: string[] | null
          source: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          trucks_count: number | null
          updated_at: string
          usdot_number: string | null
          user_id: string | null
          utm: Json | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          admin_notes?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          crew_size?: number | null
          id?: string
          insurance_carrier?: string | null
          insurance_policy?: string | null
          mc_number?: string | null
          service_cities?: string[] | null
          service_radius_miles?: number | null
          service_states?: string[] | null
          services_offered?: string[] | null
          source?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          trucks_count?: number | null
          updated_at?: string
          usdot_number?: string | null
          user_id?: string | null
          utm?: Json | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          admin_notes?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          crew_size?: number | null
          id?: string
          insurance_carrier?: string | null
          insurance_policy?: string | null
          mc_number?: string | null
          service_cities?: string[] | null
          service_radius_miles?: number | null
          service_states?: string[] | null
          services_offered?: string[] | null
          source?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          trucks_count?: number | null
          updated_at?: string
          usdot_number?: string | null
          user_id?: string | null
          utm?: Json | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      pdf_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      pdf_downloads: {
        Row: {
          downloaded_at: string
          id: string
          product_slug: string
          user_id: string
          version: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          product_slug: string
          user_id: string
          version?: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          product_slug?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      pdf_factory_settings: {
        Row: {
          autopilot: boolean
          batch_size: number
          daily_target: number
          id: number
          min_seo_score: number
          updated_at: string
        }
        Insert: {
          autopilot?: boolean
          batch_size?: number
          daily_target?: number
          id?: number
          min_seo_score?: number
          updated_at?: string
        }
        Update: {
          autopilot?: boolean
          batch_size?: number
          daily_target?: number
          id?: number
          min_seo_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      pdf_favorites: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_jobs: {
        Row: {
          attempts: number
          brief: string | null
          category_slug: string
          created_at: string
          finished_at: string | null
          id: string
          last_error: string | null
          leased_until: string | null
          priority: number
          product_slug: string
          stage: number
          stage_results: Json
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          brief?: string | null
          category_slug?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          leased_until?: string | null
          priority?: number
          product_slug: string
          stage?: number
          stage_results?: Json
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          brief?: string | null
          category_slug?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          leased_until?: string | null
          priority?: number
          product_slug?: string
          stage?: number
          stage_results?: Json
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdf_keywords: {
        Row: {
          category_slug: string | null
          cluster: string | null
          created_at: string
          difficulty_score: number
          id: string
          intent: string
          keyword: string
          notes: string | null
          opportunity_score: number
          seasonality: string
          source: string
          status: string
          volume_score: number
        }
        Insert: {
          category_slug?: string | null
          cluster?: string | null
          created_at?: string
          difficulty_score?: number
          id?: string
          intent?: string
          keyword: string
          notes?: string | null
          opportunity_score?: number
          seasonality?: string
          source?: string
          status?: string
          volume_score?: number
        }
        Update: {
          category_slug?: string | null
          cluster?: string | null
          created_at?: string
          difficulty_score?: number
          id?: string
          intent?: string
          keyword?: string
          notes?: string | null
          opportunity_score?: number
          seasonality?: string
          source?: string
          status?: string
          volume_score?: number
        }
        Relationships: []
      }
      pdf_opportunities: {
        Row: {
          category_slug: string
          created_at: string
          demand_score: number
          difficulty_score: number
          gap_reason: string | null
          id: string
          keyword: string
          priority: number
          source: string
          status: string
          title: string
        }
        Insert: {
          category_slug?: string
          created_at?: string
          demand_score?: number
          difficulty_score?: number
          gap_reason?: string | null
          id?: string
          keyword: string
          priority?: number
          source?: string
          status?: string
          title: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          demand_score?: number
          difficulty_score?: number
          gap_reason?: string | null
          id?: string
          keyword?: string
          priority?: number
          source?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      pdf_products: {
        Row: {
          ai_prompt: string | null
          alt_text: string | null
          bundle_slugs: string[]
          canonical_url: string | null
          category_slug: string
          clicks: number
          collection_slug: string | null
          compare_at_cents: number | null
          content: Json
          cover_prompt: string | null
          cover_spec: Json
          cover_status: string
          cover_url: string | null
          created_at: string
          description: string | null
          difficulty: string
          downloads: number
          faq: Json
          features: Json
          file_size_kb: number | null
          file_url: string | null
          id: string
          impressions: number
          improvement_notes: string | null
          is_bestseller: boolean
          is_bundle: boolean
          is_featured: boolean
          is_lead_magnet: boolean
          language: string
          last_improved_at: string | null
          meta_description: string | null
          og_image_url: string | null
          page_count: number
          preview_urls: Json
          price_cents: number
          price_tier: string | null
          published_at: string | null
          quality_score: number | null
          rating: number
          related_articles: string[]
          related_calculators: string[]
          related_cities: string[]
          related_products: string[]
          revenue_cents: number
          review_count: number
          seo_score: number | null
          seo_title: string | null
          slug: string
          social_image_url: string | null
          status: string
          subtitle: string | null
          tags: string[]
          target_keywords: string[]
          title: string
          updated_at: string
          version: string
          views: number
          whats_included: Json
        }
        Insert: {
          ai_prompt?: string | null
          alt_text?: string | null
          bundle_slugs?: string[]
          canonical_url?: string | null
          category_slug?: string
          clicks?: number
          collection_slug?: string | null
          compare_at_cents?: number | null
          content?: Json
          cover_prompt?: string | null
          cover_spec?: Json
          cover_status?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          downloads?: number
          faq?: Json
          features?: Json
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          impressions?: number
          improvement_notes?: string | null
          is_bestseller?: boolean
          is_bundle?: boolean
          is_featured?: boolean
          is_lead_magnet?: boolean
          language?: string
          last_improved_at?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          page_count?: number
          preview_urls?: Json
          price_cents?: number
          price_tier?: string | null
          published_at?: string | null
          quality_score?: number | null
          rating?: number
          related_articles?: string[]
          related_calculators?: string[]
          related_cities?: string[]
          related_products?: string[]
          revenue_cents?: number
          review_count?: number
          seo_score?: number | null
          seo_title?: string | null
          slug: string
          social_image_url?: string | null
          status?: string
          subtitle?: string | null
          tags?: string[]
          target_keywords?: string[]
          title: string
          updated_at?: string
          version?: string
          views?: number
          whats_included?: Json
        }
        Update: {
          ai_prompt?: string | null
          alt_text?: string | null
          bundle_slugs?: string[]
          canonical_url?: string | null
          category_slug?: string
          clicks?: number
          collection_slug?: string | null
          compare_at_cents?: number | null
          content?: Json
          cover_prompt?: string | null
          cover_spec?: Json
          cover_status?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          downloads?: number
          faq?: Json
          features?: Json
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          impressions?: number
          improvement_notes?: string | null
          is_bestseller?: boolean
          is_bundle?: boolean
          is_featured?: boolean
          is_lead_magnet?: boolean
          language?: string
          last_improved_at?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          page_count?: number
          preview_urls?: Json
          price_cents?: number
          price_tier?: string | null
          published_at?: string | null
          quality_score?: number | null
          rating?: number
          related_articles?: string[]
          related_calculators?: string[]
          related_cities?: string[]
          related_products?: string[]
          revenue_cents?: number
          review_count?: number
          seo_score?: number | null
          seo_title?: string | null
          slug?: string
          social_image_url?: string | null
          status?: string
          subtitle?: string | null
          tags?: string[]
          target_keywords?: string[]
          title?: string
          updated_at?: string
          version?: string
          views?: number
          whats_included?: Json
        }
        Relationships: []
      }
      pdf_publish_log: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          product_slug: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          product_slug: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          product_slug?: string
        }
        Relationships: []
      }
      pdf_recent_views: {
        Row: {
          id: string
          product_slug: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_slug: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_slug?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      pdf_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          product_slug: string
          rating: number
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          product_slug: string
          rating: number
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          product_slug?: string
          rating?: number
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pdf_worker_runs: {
        Row: {
          created_at: string
          discovered: number
          duration_ms: number
          failed: number
          id: string
          improved: number
          notes: string | null
          processed: number
          published: number
          trigger: string
        }
        Insert: {
          created_at?: string
          discovered?: number
          duration_ms?: number
          failed?: number
          id?: string
          improved?: number
          notes?: string | null
          processed?: number
          published?: number
          trigger?: string
        }
        Update: {
          created_at?: string
          discovered?: number
          duration_ms?: number
          failed?: number
          id?: string
          improved?: number
          notes?: string | null
          processed?: number
          published?: number
          trigger?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          language: string
          last_name: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_assignments: {
        Row: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_by?: string | null
          closed_at?: string | null
          company_id: string
          contacted_at?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          invited_at?: string
          is_exclusive?: boolean
          lost_at?: string | null
          notes?: string | null
          override_mask?: Json
          quote_id: string
          quoted_amount?: number | null
          quoted_at?: string | null
          sla_due_at?: string | null
          state?: Database["public"]["Enums"]["assignment_state_enum"]
          status?: string
          updated_at?: string
          viewed_at?: string | null
          won_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string | null
          closed_at?: string | null
          company_id?: string
          contacted_at?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          id?: string
          invited_at?: string
          is_exclusive?: boolean
          lost_at?: string | null
          notes?: string | null
          override_mask?: Json
          quote_id?: string
          quoted_amount?: number | null
          quoted_at?: string | null
          sla_due_at?: string | null
          state?: Database["public"]["Enums"]["assignment_state_enum"]
          status?: string
          updated_at?: string
          viewed_at?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_assignments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_assignments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_notes: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          quote_id: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          quote_id: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          from_status: string | null
          id: string
          quote_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          quote_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          quote_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "mover_lead_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_status_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          accepted_estimate_id: string | null
          additional_charges: number
          ai_summary: Json | null
          ai_summary_at: string | null
          appliances: boolean
          archived_at: string | null
          arrival_window: string | null
          assembly: boolean
          assigned_at: string | null
          assigned_broker_id: string | null
          assigned_company_id: string | null
          bedrooms: number
          breakdown: Json
          broker_commission: number | null
          cancellation_note: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          claim_deadline_at: string | null
          claimed_at: string | null
          closed_at: string | null
          closed_reason:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          company_notes: string | null
          completed_at: string | null
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_language: string | null
          customer_response_at: string | null
          declined_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
          deposit_amount: number
          destination_address: string | null
          destination_city: string | null
          destination_elevator: boolean
          destination_lat: number | null
          destination_lng: number | null
          destination_long_carry: boolean
          destination_place_id: string | null
          destination_stairs: number
          destination_state: string | null
          destination_zip: string
          details: Json
          distance_miles: number | null
          elevator: boolean
          estimate_email_sent_at: string | null
          estimated_cubic_feet: number | null
          estimated_high: number
          estimated_low: number
          estimated_weight_lbs: number | null
          exclusive_assignment_id: string | null
          exclusive_expires_at: string | null
          exclusive_pause_reason: string | null
          exclusive_paused_at: string | null
          exclusive_started_at: string | null
          final_accepted_price: number | null
          final_move_date: string | null
          final_price: number | null
          final_quote_sent_at: string | null
          final_truck_size: string | null
          flexible_date: boolean
          floor: number
          fragile_items: boolean
          gross_profit: number | null
          gym_equipment: boolean
          heavy_items: boolean
          id: string
          info_requested_at: string | null
          insurance_tier: string | null
          inventory: Json
          inventory_notes: string | null
          job_services: Json
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
          landing_city: string | null
          landing_city_slug: string | null
          landing_path: string | null
          landing_state: string | null
          last_activity_at: string
          lead_phase: Database["public"]["Enums"]["lead_phase_enum"]
          lead_status: Database["public"]["Enums"]["lead_status_enum"]
          lead_status_updated_at: string
          long_carry: boolean
          move_date: string | null
          move_size: string | null
          move_type: string | null
          num_movers: number | null
          open_market_opened_at: string | null
          origin_address: string | null
          origin_city: string | null
          origin_elevator: boolean
          origin_lat: number | null
          origin_lng: number | null
          origin_long_carry: boolean
          origin_place_id: string | null
          origin_stairs: number
          origin_state: string | null
          origin_zip: string
          packing: boolean
          piano: boolean
          pickup_carry_distance: string | null
          pickup_elevator: boolean
          pickup_floor: number
          pickup_notes: string | null
          pickup_parking_distance: string | null
          pickup_property_type: string | null
          portal_token: string | null
          preferred_time: string | null
          priority: string
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
          safe: boolean
          scheduled_at: string | null
          service_type: string | null
          source: string | null
          status: string
          storage: boolean
          tags: string[]
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
          utm: Json | null
          visibility_mask: Json
        }
        Insert: {
          accepted_at?: string | null
          accepted_estimate_id?: string | null
          additional_charges?: number
          ai_summary?: Json | null
          ai_summary_at?: string | null
          appliances?: boolean
          archived_at?: string | null
          arrival_window?: string | null
          assembly?: boolean
          assigned_at?: string | null
          assigned_broker_id?: string | null
          assigned_company_id?: string | null
          bedrooms?: number
          breakdown?: Json
          broker_commission?: number | null
          cancellation_note?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          claim_deadline_at?: string | null
          claimed_at?: string | null
          closed_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          company_notes?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          created_at?: string
          crew_size?: number | null
          customer_language?: string | null
          customer_response_at?: string | null
          declined_at?: string | null
          delivery_carry_distance?: string | null
          delivery_elevator?: boolean
          delivery_floor?: number
          delivery_notes?: string | null
          delivery_parking_distance?: string | null
          delivery_property_type?: string | null
          deposit_amount?: number
          destination_address?: string | null
          destination_city?: string | null
          destination_elevator?: boolean
          destination_lat?: number | null
          destination_lng?: number | null
          destination_long_carry?: boolean
          destination_place_id?: string | null
          destination_stairs?: number
          destination_state?: string | null
          destination_zip: string
          details?: Json
          distance_miles?: number | null
          elevator?: boolean
          estimate_email_sent_at?: string | null
          estimated_cubic_feet?: number | null
          estimated_high: number
          estimated_low: number
          estimated_weight_lbs?: number | null
          exclusive_assignment_id?: string | null
          exclusive_expires_at?: string | null
          exclusive_pause_reason?: string | null
          exclusive_paused_at?: string | null
          exclusive_started_at?: string | null
          final_accepted_price?: number | null
          final_move_date?: string | null
          final_price?: number | null
          final_quote_sent_at?: string | null
          final_truck_size?: string | null
          flexible_date?: boolean
          floor?: number
          fragile_items?: boolean
          gross_profit?: number | null
          gym_equipment?: boolean
          heavy_items?: boolean
          id?: string
          info_requested_at?: string | null
          insurance_tier?: string | null
          inventory?: Json
          inventory_notes?: string | null
          job_services?: Json
          job_status?: string
          junk_removal?: boolean
          labor_hours?: number | null
          landing_city?: string | null
          landing_city_slug?: string | null
          landing_path?: string | null
          landing_state?: string | null
          last_activity_at?: string
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"]
          lead_status?: Database["public"]["Enums"]["lead_status_enum"]
          lead_status_updated_at?: string
          long_carry?: boolean
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
          open_market_opened_at?: string | null
          origin_address?: string | null
          origin_city?: string | null
          origin_elevator?: boolean
          origin_lat?: number | null
          origin_lng?: number | null
          origin_long_carry?: boolean
          origin_place_id?: string | null
          origin_stairs?: number
          origin_state?: string | null
          origin_zip: string
          packing?: boolean
          piano?: boolean
          pickup_carry_distance?: string | null
          pickup_elevator?: boolean
          pickup_floor?: number
          pickup_notes?: string | null
          pickup_parking_distance?: string | null
          pickup_property_type?: string | null
          portal_token?: string | null
          preferred_time?: string | null
          priority?: string
          property_type: string
          published_at?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          quote_number?: string | null
          redistribution_count?: number
          rejection_reason?: string | null
          safe?: boolean
          scheduled_at?: string | null
          service_type?: string | null
          source?: string | null
          status?: string
          storage?: boolean
          tags?: string[]
          truck_size?: string | null
          unpacking?: boolean
          user_id?: string | null
          utm?: Json | null
          visibility_mask?: Json
        }
        Update: {
          accepted_at?: string | null
          accepted_estimate_id?: string | null
          additional_charges?: number
          ai_summary?: Json | null
          ai_summary_at?: string | null
          appliances?: boolean
          archived_at?: string | null
          arrival_window?: string | null
          assembly?: boolean
          assigned_at?: string | null
          assigned_broker_id?: string | null
          assigned_company_id?: string | null
          bedrooms?: number
          breakdown?: Json
          broker_commission?: number | null
          cancellation_note?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          claim_deadline_at?: string | null
          claimed_at?: string | null
          closed_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          company_notes?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          created_at?: string
          crew_size?: number | null
          customer_language?: string | null
          customer_response_at?: string | null
          declined_at?: string | null
          delivery_carry_distance?: string | null
          delivery_elevator?: boolean
          delivery_floor?: number
          delivery_notes?: string | null
          delivery_parking_distance?: string | null
          delivery_property_type?: string | null
          deposit_amount?: number
          destination_address?: string | null
          destination_city?: string | null
          destination_elevator?: boolean
          destination_lat?: number | null
          destination_lng?: number | null
          destination_long_carry?: boolean
          destination_place_id?: string | null
          destination_stairs?: number
          destination_state?: string | null
          destination_zip?: string
          details?: Json
          distance_miles?: number | null
          elevator?: boolean
          estimate_email_sent_at?: string | null
          estimated_cubic_feet?: number | null
          estimated_high?: number
          estimated_low?: number
          estimated_weight_lbs?: number | null
          exclusive_assignment_id?: string | null
          exclusive_expires_at?: string | null
          exclusive_pause_reason?: string | null
          exclusive_paused_at?: string | null
          exclusive_started_at?: string | null
          final_accepted_price?: number | null
          final_move_date?: string | null
          final_price?: number | null
          final_quote_sent_at?: string | null
          final_truck_size?: string | null
          flexible_date?: boolean
          floor?: number
          fragile_items?: boolean
          gross_profit?: number | null
          gym_equipment?: boolean
          heavy_items?: boolean
          id?: string
          info_requested_at?: string | null
          insurance_tier?: string | null
          inventory?: Json
          inventory_notes?: string | null
          job_services?: Json
          job_status?: string
          junk_removal?: boolean
          labor_hours?: number | null
          landing_city?: string | null
          landing_city_slug?: string | null
          landing_path?: string | null
          landing_state?: string | null
          last_activity_at?: string
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"]
          lead_status?: Database["public"]["Enums"]["lead_status_enum"]
          lead_status_updated_at?: string
          long_carry?: boolean
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
          open_market_opened_at?: string | null
          origin_address?: string | null
          origin_city?: string | null
          origin_elevator?: boolean
          origin_lat?: number | null
          origin_lng?: number | null
          origin_long_carry?: boolean
          origin_place_id?: string | null
          origin_stairs?: number
          origin_state?: string | null
          origin_zip?: string
          packing?: boolean
          piano?: boolean
          pickup_carry_distance?: string | null
          pickup_elevator?: boolean
          pickup_floor?: number
          pickup_notes?: string | null
          pickup_parking_distance?: string | null
          pickup_property_type?: string | null
          portal_token?: string | null
          preferred_time?: string | null
          priority?: string
          property_type?: string
          published_at?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          quote_number?: string | null
          redistribution_count?: number
          rejection_reason?: string | null
          safe?: boolean
          scheduled_at?: string | null
          service_type?: string | null
          source?: string | null
          status?: string
          storage?: boolean
          tags?: string[]
          truck_size?: string | null
          unpacking?: boolean
          user_id?: string | null
          utm?: Json | null
          visibility_mask?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quotes_assigned_company_id_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_exclusive_assignment_id_fkey"
            columns: ["exclusive_assignment_id"]
            isOneToOne: false
            referencedRelation: "quote_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string
          exclusive_window_minutes: number
          id: string
          is_default: boolean
          name: string
          reminder_minutes: number[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          exclusive_window_minutes?: number
          id?: string
          is_default?: boolean
          name: string
          reminder_minutes?: number[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          exclusive_window_minutes?: number
          id?: string
          is_default?: boolean
          name?: string
          reminder_minutes?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      usa_cities: {
        Row: {
          aliases: string[]
          area_codes: string[]
          attempts: number
          calculator_slug: string | null
          calculator_status: string
          city_name: string
          city_slug: string
          country: string
          county: string | null
          created_at: string
          demand_score: number
          id: string
          imported_at: string
          last_error: string | null
          last_published_at: string | null
          latitude: number | null
          longitude: number | null
          nearby_cities: Json
          pipeline_status: string
          population: number
          published: boolean
          seo_page_status: string
          seo_priority: number
          seo_slug: string | null
          state_code: string
          state_name: string
          timezone: string | null
          updated_at: string
          zip_codes: string[]
        }
        Insert: {
          aliases?: string[]
          area_codes?: string[]
          attempts?: number
          calculator_slug?: string | null
          calculator_status?: string
          city_name: string
          city_slug: string
          country?: string
          county?: string | null
          created_at?: string
          demand_score?: number
          id?: string
          imported_at?: string
          last_error?: string | null
          last_published_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nearby_cities?: Json
          pipeline_status?: string
          population?: number
          published?: boolean
          seo_page_status?: string
          seo_priority?: number
          seo_slug?: string | null
          state_code: string
          state_name: string
          timezone?: string | null
          updated_at?: string
          zip_codes?: string[]
        }
        Update: {
          aliases?: string[]
          area_codes?: string[]
          attempts?: number
          calculator_slug?: string | null
          calculator_status?: string
          city_name?: string
          city_slug?: string
          country?: string
          county?: string | null
          created_at?: string
          demand_score?: number
          id?: string
          imported_at?: string
          last_error?: string | null
          last_published_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nearby_cities?: Json
          pipeline_status?: string
          population?: number
          published?: boolean
          seo_page_status?: string
          seo_priority?: number
          seo_slug?: string | null
          state_code?: string
          state_name?: string
          timezone?: string | null
          updated_at?: string
          zip_codes?: string[]
        }
        Relationships: []
      }
      usa_import_runs: {
        Row: {
          avg_ms: number
          completed: number
          created_at: string
          created_by: string | null
          cursor: number
          failed: number
          id: string
          imported: number
          last_error: string | null
          processed: number
          requested: number
          scope: string
          skipped: number
          state_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avg_ms?: number
          completed?: number
          created_at?: string
          created_by?: string | null
          cursor?: number
          failed?: number
          id?: string
          imported?: number
          last_error?: string | null
          processed?: number
          requested?: number
          scope?: string
          skipped?: number
          state_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avg_ms?: number
          completed?: number
          created_at?: string
          created_by?: string | null
          cursor?: number
          failed?: number
          id?: string
          imported?: number
          last_error?: string | null
          processed?: number
          requested?: number
          scope?: string
          skipped?: number
          state_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mover_lead_view: {
        Row: {
          appliances: boolean | null
          assembly: boolean | null
          assigned_at: string | null
          assigned_company_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          destination_address: string | null
          destination_city: string | null
          destination_elevator: boolean | null
          destination_long_carry: boolean | null
          destination_stairs: number | null
          destination_state: string | null
          destination_zip: string | null
          details: Json | null
          distance_miles: number | null
          elevator: boolean | null
          estimated_cubic_feet: number | null
          estimated_high: number | null
          estimated_low: number | null
          estimated_weight_lbs: number | null
          exclusive_expires_at: string | null
          exclusive_paused_at: string | null
          exclusive_started_at: string | null
          flexible_date: boolean | null
          floor: number | null
          fragile_items: boolean | null
          full_name: string | null
          gym_equipment: boolean | null
          heavy_items: boolean | null
          id: string | null
          insurance_tier: string | null
          inventory: Json | null
          inventory_notes: string | null
          junk_removal: boolean | null
          last_activity_at: string | null
          lead_phase: Database["public"]["Enums"]["lead_phase_enum"] | null
          move_date: string | null
          move_size: string | null
          move_type: string | null
          num_movers: number | null
          open_market_opened_at: string | null
          origin_address: string | null
          origin_city: string | null
          origin_elevator: boolean | null
          origin_long_carry: boolean | null
          origin_stairs: number | null
          origin_state: string | null
          origin_zip: string | null
          packing: boolean | null
          piano: boolean | null
          preferred_time: string | null
          property_type: string | null
          quote_number: string | null
          safe: boolean | null
          status: string | null
          storage: boolean | null
          truck_size: string | null
          unlocked: boolean | null
          unpacking: boolean | null
        }
        Insert: {
          appliances?: boolean | null
          assembly?: boolean | null
          assigned_at?: string | null
          assigned_company_id?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          destination_address?: never
          destination_city?: string | null
          destination_elevator?: boolean | null
          destination_long_carry?: boolean | null
          destination_stairs?: number | null
          destination_state?: string | null
          destination_zip?: string | null
          details?: never
          distance_miles?: number | null
          elevator?: boolean | null
          estimated_cubic_feet?: number | null
          estimated_high?: number | null
          estimated_low?: number | null
          estimated_weight_lbs?: number | null
          exclusive_expires_at?: string | null
          exclusive_paused_at?: string | null
          exclusive_started_at?: string | null
          flexible_date?: boolean | null
          floor?: number | null
          fragile_items?: boolean | null
          full_name?: never
          gym_equipment?: boolean | null
          heavy_items?: boolean | null
          id?: string | null
          insurance_tier?: string | null
          inventory?: Json | null
          inventory_notes?: never
          junk_removal?: boolean | null
          last_activity_at?: string | null
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"] | null
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
          open_market_opened_at?: string | null
          origin_address?: never
          origin_city?: string | null
          origin_elevator?: boolean | null
          origin_long_carry?: boolean | null
          origin_stairs?: number | null
          origin_state?: string | null
          origin_zip?: string | null
          packing?: boolean | null
          piano?: boolean | null
          preferred_time?: string | null
          property_type?: string | null
          quote_number?: string | null
          safe?: boolean | null
          status?: string | null
          storage?: boolean | null
          truck_size?: string | null
          unlocked?: never
          unpacking?: boolean | null
        }
        Update: {
          appliances?: boolean | null
          assembly?: boolean | null
          assigned_at?: string | null
          assigned_company_id?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          destination_address?: never
          destination_city?: string | null
          destination_elevator?: boolean | null
          destination_long_carry?: boolean | null
          destination_stairs?: number | null
          destination_state?: string | null
          destination_zip?: string | null
          details?: never
          distance_miles?: number | null
          elevator?: boolean | null
          estimated_cubic_feet?: number | null
          estimated_high?: number | null
          estimated_low?: number | null
          estimated_weight_lbs?: number | null
          exclusive_expires_at?: string | null
          exclusive_paused_at?: string | null
          exclusive_started_at?: string | null
          flexible_date?: boolean | null
          floor?: number | null
          fragile_items?: boolean | null
          full_name?: never
          gym_equipment?: boolean | null
          heavy_items?: boolean | null
          id?: string | null
          insurance_tier?: string | null
          inventory?: Json | null
          inventory_notes?: never
          junk_removal?: boolean | null
          last_activity_at?: string | null
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"] | null
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
          open_market_opened_at?: string | null
          origin_address?: never
          origin_city?: string | null
          origin_elevator?: boolean | null
          origin_long_carry?: boolean | null
          origin_stairs?: number | null
          origin_state?: string | null
          origin_zip?: string | null
          packing?: boolean | null
          piano?: boolean | null
          preferred_time?: string | null
          property_type?: string | null
          quote_number?: string | null
          safe?: boolean | null
          status?: string | null
          storage?: boolean | null
          truck_size?: string | null
          unlocked?: never
          unpacking?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_assigned_company_id_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "moving_companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_quote: {
        Args: { _portal_token: string; _quote_number: string }
        Returns: {
          accepted_at: string
          id: string
          quote_number: string
          status: string
        }[]
      }
      current_user_company_id: { Args: never; Returns: string }
      default_visibility_mask: { Args: never; Returns: Json }
      fn_admin_assign_lead: {
        Args: { _company_id: string; _quote_id: string }
        Returns: undefined
      }
      fn_admin_invoice_action: {
        Args: {
          _action: string
          _amount?: number
          _invoice_id: string
          _note?: string
          _reference?: string
        }
        Returns: Json
      }
      fn_admin_redistribute_lead: {
        Args: { _quote_id: string }
        Returns: number
      }
      fn_admin_set_commission_status: {
        Args: { _commission_id: string; _note?: string; _status: string }
        Returns: Json
      }
      fn_assign_broker: {
        Args: { _broker_id: string; _quote_id: string }
        Returns: undefined
      }
      fn_assign_exclusive: {
        Args: { _company_id: string; _quote_id: string; _sla_hours?: number }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_assign_multi: {
        Args: { _company_ids: string[]; _quote_id: string; _sla_hours?: number }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_broker_qualify_lead: { Args: { _quote_id: string }; Returns: Json }
      fn_can_work_lead: { Args: { _quote_id: string }; Returns: boolean }
      fn_cancel_commission_for_quote: {
        Args: { _quote_id: string; _reason: string }
        Returns: undefined
      }
      fn_claim_expiry_tick: {
        Args: never
        Returns: {
          quote_id: string
        }[]
      }
      fn_claim_lead_core: {
        Args: { _company_id: string; _quote_id: string }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_close_lead: {
        Args: { _quote_id: string; _reason: string }
        Returns: undefined
      }
      fn_company_available_jobs: {
        Args: { _company_id: string }
        Returns: {
          customer_name: string
          destination_city: string
          destination_state: string
          distance_miles: number
          estimated_cubic_feet: number
          estimated_high: number
          estimated_low: number
          id: string
          move_date: string
          move_type: string
          origin_city: string
          origin_state: string
          property_type: string
          published_at: string
          quote_number: string
          services: string[]
        }[]
      }
      fn_company_claim_job: {
        Args: { _company_id: string; _quote_id: string }
        Returns: Json
      }
      fn_company_complete_job: { Args: { _quote_id: string }; Returns: Json }
      fn_company_complete_move: {
        Args: { _company_id: string; _notes?: string; _quote_id: string }
        Returns: Json
      }
      fn_company_confirm_final_price: {
        Args: {
          _additional?: number
          _company_id: string
          _deposit?: number
          _final_price: number
          _notes?: string
          _quote_id: string
        }
        Returns: Json
      }
      fn_company_decline_job: {
        Args: { _company_id: string; _quote_id: string; _reason?: string }
        Returns: Json
      }
      fn_company_expired_claims: {
        Args: { _company_id: string }
        Returns: {
          claimed_at: string
          destination_city: string
          destination_state: string
          expires_at: string
          job_status: string
          move_date: string
          origin_city: string
          origin_state: string
          quote_id: string
          quote_number: string
        }[]
      }
      fn_company_log_view: {
        Args: { _company_id: string; _quote_id: string }
        Returns: undefined
      }
      fn_company_matches_lead: {
        Args: { _company_id: string; _quote_id: string }
        Returns: boolean
      }
      fn_company_my_jobs: {
        Args: { _company_id: string }
        Returns: {
          accepted_at: string | null
          accepted_estimate_id: string | null
          additional_charges: number
          ai_summary: Json | null
          ai_summary_at: string | null
          appliances: boolean
          archived_at: string | null
          arrival_window: string | null
          assembly: boolean
          assigned_at: string | null
          assigned_broker_id: string | null
          assigned_company_id: string | null
          bedrooms: number
          breakdown: Json
          broker_commission: number | null
          cancellation_note: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          claim_deadline_at: string | null
          claimed_at: string | null
          closed_at: string | null
          closed_reason:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          company_notes: string | null
          completed_at: string | null
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_language: string | null
          customer_response_at: string | null
          declined_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
          deposit_amount: number
          destination_address: string | null
          destination_city: string | null
          destination_elevator: boolean
          destination_lat: number | null
          destination_lng: number | null
          destination_long_carry: boolean
          destination_place_id: string | null
          destination_stairs: number
          destination_state: string | null
          destination_zip: string
          details: Json
          distance_miles: number | null
          elevator: boolean
          estimate_email_sent_at: string | null
          estimated_cubic_feet: number | null
          estimated_high: number
          estimated_low: number
          estimated_weight_lbs: number | null
          exclusive_assignment_id: string | null
          exclusive_expires_at: string | null
          exclusive_pause_reason: string | null
          exclusive_paused_at: string | null
          exclusive_started_at: string | null
          final_accepted_price: number | null
          final_move_date: string | null
          final_price: number | null
          final_quote_sent_at: string | null
          final_truck_size: string | null
          flexible_date: boolean
          floor: number
          fragile_items: boolean
          gross_profit: number | null
          gym_equipment: boolean
          heavy_items: boolean
          id: string
          info_requested_at: string | null
          insurance_tier: string | null
          inventory: Json
          inventory_notes: string | null
          job_services: Json
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
          landing_city: string | null
          landing_city_slug: string | null
          landing_path: string | null
          landing_state: string | null
          last_activity_at: string
          lead_phase: Database["public"]["Enums"]["lead_phase_enum"]
          lead_status: Database["public"]["Enums"]["lead_status_enum"]
          lead_status_updated_at: string
          long_carry: boolean
          move_date: string | null
          move_size: string | null
          move_type: string | null
          num_movers: number | null
          open_market_opened_at: string | null
          origin_address: string | null
          origin_city: string | null
          origin_elevator: boolean
          origin_lat: number | null
          origin_lng: number | null
          origin_long_carry: boolean
          origin_place_id: string | null
          origin_stairs: number
          origin_state: string | null
          origin_zip: string
          packing: boolean
          piano: boolean
          pickup_carry_distance: string | null
          pickup_elevator: boolean
          pickup_floor: number
          pickup_notes: string | null
          pickup_parking_distance: string | null
          pickup_property_type: string | null
          portal_token: string | null
          preferred_time: string | null
          priority: string
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
          safe: boolean
          scheduled_at: string | null
          service_type: string | null
          source: string | null
          status: string
          storage: boolean
          tags: string[]
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
          utm: Json | null
          visibility_mask: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_company_release_job: {
        Args: { _company_id: string; _quote_id: string; _reason?: string }
        Returns: Json
      }
      fn_company_request_price_revision: {
        Args: {
          _attachments?: Json
          _company_id: string
          _new_price: number
          _notes?: string
          _quote_id: string
          _reason: string
        }
        Returns: Json
      }
      fn_company_update_job: {
        Args: { _action: string; _payload?: Json; _quote_id: string }
        Returns: Json
      }
      fn_current_mover_company: { Args: never; Returns: string }
      fn_customer_cancel_move: {
        Args: { _note: string; _quote_id: string; _reason: string }
        Returns: Json
      }
      fn_customer_confirm_move: { Args: { _quote_id: string }; Returns: Json }
      fn_customer_name: {
        Args: { _q: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: string
      }
      fn_customer_notify: {
        Args: {
          _body: string
          _quote_id: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      fn_customer_respond_final_quote: {
        Args: { _accept: boolean; _quote_number: string; _token: string }
        Returns: Json
      }
      fn_customer_start_conversation: {
        Args: { _quote_id: string }
        Returns: string
      }
      fn_customer_submit_review: {
        Args: {
          _body: string
          _communication: number
          _overall: number
          _professionalism: number
          _punctuality: number
          _quote_id: string
          _title: string
        }
        Returns: Json
      }
      fn_distribute_lead: {
        Args: { _quote_id: string; _reason?: string }
        Returns: number
      }
      fn_estimate_mark_viewed: { Args: { _revision_id: string }; Returns: Json }
      fn_estimate_respond: {
        Args: { _accept: boolean; _reason?: string; _revision_id: string }
        Returns: Json
      }
      fn_estimate_save_draft: {
        Args: {
          _amount: number
          _assignment_id: string
          _breakdown?: Json
          _notes?: string
          _revision_id?: string
          _valid_until?: string
        }
        Returns: {
          accepted_at: string | null
          amount: number
          assignment_id: string
          breakdown: Json
          broker_commission: number | null
          broker_estimate_high: number | null
          broker_estimate_low: number | null
          commission_rate: number
          company_estimate: number | null
          company_id: string
          currency: string
          final_accepted_price: number | null
          gross_profit: number | null
          id: string
          is_current: boolean
          notes: string | null
          quote_id: string
          rejected_at: string | null
          rejection_reason: string | null
          revision: number
          sent_at: string | null
          sent_to_email: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "estimate_revisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_estimate_send: {
        Args: { _email?: string; _revision_id: string }
        Returns: Json
      }
      fn_expire_stale_claims: { Args: never; Returns: number }
      fn_extend_sla: {
        Args: { _minutes: number; _quote_id: string }
        Returns: undefined
      }
      fn_finance_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _entity_id: string
          _entity_type: string
          _quote_id: string
          _reason?: string
        }
        Returns: undefined
      }
      fn_finance_broker_report: {
        Args: never
        Returns: {
          broker_id: string
          broker_name: string
          invoices: number
          outstanding: number
          paid: number
          total: number
        }[]
      }
      fn_finance_company_report: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          invoices: number
          outstanding: number
          overdue: number
          paid: number
          total: number
        }[]
      }
      fn_finance_monthly_report: {
        Args: { _months?: number }
        Returns: {
          cancelled: number
          invoiced: number
          invoices: number
          month: string
          outstanding: number
          overdue: number
          paid: number
        }[]
      }
      fn_finance_overdue_tick: { Args: never; Returns: number }
      fn_force_open_market: {
        Args: { _quote_id: string; _reason?: string }
        Returns: undefined
      }
      fn_fulfill_accepted_quote: { Args: { _quote_id: string }; Returns: Json }
      fn_generate_commission_invoice: {
        Args: { _commission_id: string }
        Returns: {
          amount: number
          amount_paid: number
          broker_amount: number
          broker_id: string | null
          broker_rate: number
          cancelled_at: string | null
          commission_id: string
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string
          final_price: number
          id: string
          issue_date: string
          notes: string | null
          number: string
          paid_at: string | null
          quote_id: string
          rate: number
          sent_at: string | null
          status: string
          updated_at: string
          viewed_at: string | null
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "commission_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_is_company_member: { Args: { _company_id: string }; Returns: boolean }
      fn_issue_company_warning: {
        Args: {
          _company_id: string
          _kind: string
          _quote_id: string
          _reason: string
        }
        Returns: number
      }
      fn_job_log: {
        Args: {
          _action: string
          _company_id: string
          _detail?: Json
          _from: string
          _quote_id: string
          _to: string
        }
        Returns: undefined
      }
      fn_lead_claimed_by_company: {
        Args: { _company_id: string; _quote_id: string }
        Returns: boolean
      }
      fn_lead_expiry_tick: {
        Args: never
        Returns: {
          quote_id: string
        }[]
      }
      fn_lead_unlocked: { Args: { _quote_id: string }; Returns: boolean }
      fn_marketplace_status: {
        Args: { _assigned_company: string; _job_status: string }
        Returns: string
      }
      fn_matching_companies: { Args: { _quote_id: string }; Returns: string[] }
      fn_mover_accept_lead: {
        Args: { _ip?: string; _quote_id: string }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_mover_claim_open_market: {
        Args: { _quote_id: string }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_mover_decline: {
        Args: { _assignment_id: string; _reason?: string }
        Returns: undefined
      }
      fn_mover_lead_progress: {
        Args: {
          _ip?: string
          _notes?: string
          _quote_id: string
          _stage: string
        }
        Returns: undefined
      }
      fn_mover_mark_contacted: {
        Args: { _assignment_id: string; _notes?: string }
        Returns: undefined
      }
      fn_mover_open_assignment: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      fn_my_account_status: { Args: never; Returns: string }
      fn_my_company_ids: { Args: never; Returns: string[] }
      fn_my_primary_role: { Args: never; Returns: string }
      fn_notify_broker: {
        Args: { _message: string; _quote_id: string; _type: string }
        Returns: undefined
      }
      fn_notify_marketplace: {
        Args: {
          _body: string
          _company_id?: string
          _quote_id: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      fn_owns_quote: { Args: { _quote_id: string }; Returns: boolean }
      fn_pause_sla: {
        Args: { _quote_id: string; _reason: string }
        Returns: undefined
      }
      fn_portal_current_estimate: {
        Args: { _quote_number: string; _token: string }
        Returns: Json
      }
      fn_portal_respond_estimate: {
        Args: {
          _accept: boolean
          _quote_number: string
          _reason?: string
          _token: string
        }
        Returns: Json
      }
      fn_reassign_exclusive: {
        Args: {
          _new_company_id: string
          _quote_id: string
          _sla_hours?: number
        }
        Returns: {
          accepted_at: string | null
          assigned_by: string | null
          closed_at: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          id: string
          invited_at: string
          is_exclusive: boolean
          lost_at: string | null
          notes: string | null
          override_mask: Json
          quote_id: string
          quoted_amount: number | null
          quoted_at: string | null
          sla_due_at: string | null
          state: Database["public"]["Enums"]["assignment_state_enum"]
          status: string
          updated_at: string
          viewed_at: string | null
          won_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quote_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_release_lead: {
        Args: { _quote_id: string; _reason?: string }
        Returns: undefined
      }
      fn_reopen_lead: { Args: { _quote_id: string }; Returns: undefined }
      fn_request_lead_info: {
        Args: { _message: string; _quote_id: string }
        Returns: undefined
      }
      fn_resume_sla: { Args: { _quote_id: string }; Returns: undefined }
      fn_return_job_to_market: {
        Args: { _event: string; _quote_id: string; _reason: string }
        Returns: string
      }
      fn_set_lead_status: {
        Args: {
          _note?: string
          _quote_id: string
          _status: Database["public"]["Enums"]["lead_status_enum"]
        }
        Returns: {
          accepted_at: string | null
          accepted_estimate_id: string | null
          additional_charges: number
          ai_summary: Json | null
          ai_summary_at: string | null
          appliances: boolean
          archived_at: string | null
          arrival_window: string | null
          assembly: boolean
          assigned_at: string | null
          assigned_broker_id: string | null
          assigned_company_id: string | null
          bedrooms: number
          breakdown: Json
          broker_commission: number | null
          cancellation_note: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          claim_deadline_at: string | null
          claimed_at: string | null
          closed_at: string | null
          closed_reason:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          company_notes: string | null
          completed_at: string | null
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_language: string | null
          customer_response_at: string | null
          declined_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
          deposit_amount: number
          destination_address: string | null
          destination_city: string | null
          destination_elevator: boolean
          destination_lat: number | null
          destination_lng: number | null
          destination_long_carry: boolean
          destination_place_id: string | null
          destination_stairs: number
          destination_state: string | null
          destination_zip: string
          details: Json
          distance_miles: number | null
          elevator: boolean
          estimate_email_sent_at: string | null
          estimated_cubic_feet: number | null
          estimated_high: number
          estimated_low: number
          estimated_weight_lbs: number | null
          exclusive_assignment_id: string | null
          exclusive_expires_at: string | null
          exclusive_pause_reason: string | null
          exclusive_paused_at: string | null
          exclusive_started_at: string | null
          final_accepted_price: number | null
          final_move_date: string | null
          final_price: number | null
          final_quote_sent_at: string | null
          final_truck_size: string | null
          flexible_date: boolean
          floor: number
          fragile_items: boolean
          gross_profit: number | null
          gym_equipment: boolean
          heavy_items: boolean
          id: string
          info_requested_at: string | null
          insurance_tier: string | null
          inventory: Json
          inventory_notes: string | null
          job_services: Json
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
          landing_city: string | null
          landing_city_slug: string | null
          landing_path: string | null
          landing_state: string | null
          last_activity_at: string
          lead_phase: Database["public"]["Enums"]["lead_phase_enum"]
          lead_status: Database["public"]["Enums"]["lead_status_enum"]
          lead_status_updated_at: string
          long_carry: boolean
          move_date: string | null
          move_size: string | null
          move_type: string | null
          num_movers: number | null
          open_market_opened_at: string | null
          origin_address: string | null
          origin_city: string | null
          origin_elevator: boolean
          origin_lat: number | null
          origin_lng: number | null
          origin_long_carry: boolean
          origin_place_id: string | null
          origin_stairs: number
          origin_state: string | null
          origin_zip: string
          packing: boolean
          piano: boolean
          pickup_carry_distance: string | null
          pickup_elevator: boolean
          pickup_floor: number
          pickup_notes: string | null
          pickup_parking_distance: string | null
          pickup_property_type: string | null
          portal_token: string | null
          preferred_time: string | null
          priority: string
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
          safe: boolean
          scheduled_at: string | null
          service_type: string | null
          source: string | null
          status: string
          storage: boolean
          tags: string[]
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
          utm: Json | null
          visibility_mask: Json
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_set_visibility_mask: {
        Args: { _mask: Json; _quote_id: string }
        Returns: undefined
      }
      fn_sla_tick: {
        Args: never
        Returns: {
          assignment_id: string
          quote_id: string
        }[]
      }
      fn_staff_recall_job: {
        Args: { _quote_id: string; _reason?: string; _warn?: boolean }
        Returns: Json
      }
      fn_withdraw_assignment: {
        Args: { _assignment_id: string; _reason?: string }
        Returns: undefined
      }
      generate_company_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_broker: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      log_lead_event: {
        Args: {
          _actor_role: string
          _assignment_id?: string
          _company_id?: string
          _event_type: string
          _payload?: Json
          _quote_id: string
        }
        Returns: undefined
      }
      mover_can_see_quote: { Args: { _quote_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "mover" | "customer" | "broker"
      assignment_state_enum:
        | "invited"
        | "active"
        | "quoted"
        | "accepted"
        | "won"
        | "lost"
        | "declined"
        | "withdrawn"
        | "expired"
      company_conv_kind: "broker" | "internal"
      company_doc_kind:
        | "estimate"
        | "invoice"
        | "bill_of_lading"
        | "contract"
        | "insurance"
        | "license"
        | "photo"
        | "attachment"
        | "other"
      company_invoice_kind: "deposit" | "final" | "extra" | "adjustment"
      company_invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "void"
        | "overdue"
      company_service_area_kind: "city" | "zip" | "state" | "radius"
      lead_closed_reason_enum:
        | "won"
        | "lost"
        | "cancelled"
        | "duplicate"
        | "invalid"
        | "expired"
      lead_phase_enum: "unassigned" | "exclusive" | "open_market" | "closed"
      lead_status_enum:
        | "draft"
        | "submitted"
        | "under_review"
        | "qualified"
        | "published"
        | "claimed"
        | "contacted"
        | "price_confirmed"
        | "customer_confirmed"
        | "completed"
        | "rejected"
        | "cancelled"
      partner_application_status:
        | "draft"
        | "submitted"
        | "reviewing"
        | "approved"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "mover", "customer", "broker"],
      assignment_state_enum: [
        "invited",
        "active",
        "quoted",
        "accepted",
        "won",
        "lost",
        "declined",
        "withdrawn",
        "expired",
      ],
      company_conv_kind: ["broker", "internal"],
      company_doc_kind: [
        "estimate",
        "invoice",
        "bill_of_lading",
        "contract",
        "insurance",
        "license",
        "photo",
        "attachment",
        "other",
      ],
      company_invoice_kind: ["deposit", "final", "extra", "adjustment"],
      company_invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "void",
        "overdue",
      ],
      company_service_area_kind: ["city", "zip", "state", "radius"],
      lead_closed_reason_enum: [
        "won",
        "lost",
        "cancelled",
        "duplicate",
        "invalid",
        "expired",
      ],
      lead_phase_enum: ["unassigned", "exclusive", "open_market", "closed"],
      lead_status_enum: [
        "draft",
        "submitted",
        "under_review",
        "qualified",
        "published",
        "claimed",
        "contacted",
        "price_confirmed",
        "customer_confirmed",
        "completed",
        "rejected",
        "cancelled",
      ],
      partner_application_status: [
        "draft",
        "submitted",
        "reviewing",
        "approved",
        "rejected",
      ],
    },
  },
} as const
