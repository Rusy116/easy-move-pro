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
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
          amount: number
          assignment_id: string
          breakdown: Json
          company_id: string
          currency: string
          id: string
          is_current: boolean
          notes: string | null
          quote_id: string
          revision: number
          submitted_at: string
          submitted_by: string | null
          valid_until: string | null
        }
        Insert: {
          amount: number
          assignment_id: string
          breakdown?: Json
          company_id: string
          currency?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          quote_id: string
          revision?: number
          submitted_at?: string
          submitted_by?: string | null
          valid_until?: string | null
        }
        Update: {
          amount?: number
          assignment_id?: string
          breakdown?: Json
          company_id?: string
          currency?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          quote_id?: string
          revision?: number
          submitted_at?: string
          submitted_by?: string | null
          valid_until?: string | null
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
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_type: string
          assignment_id: string | null
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          is_public: boolean
          payload: Json
          quote_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_type: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_public?: boolean
          payload?: Json
          quote_id: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_type?: string
          assignment_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
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
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      moving_companies: {
        Row: {
          active: boolean
          approved: boolean
          created_at: string
          dot_number: string | null
          email: string | null
          id: string
          license_status: string
          logo_url: string | null
          mc_number: string | null
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          service_states: string[]
          slug: string | null
          suspended: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          approved?: boolean
          created_at?: string
          dot_number?: string | null
          email?: string | null
          id?: string
          license_status?: string
          logo_url?: string | null
          mc_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          service_states?: string[]
          slug?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          approved?: boolean
          created_at?: string
          dot_number?: string | null
          email?: string | null
          id?: string
          license_status?: string
          logo_url?: string | null
          mc_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          service_states?: string[]
          slug?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
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
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          appliances: boolean
          assembly: boolean
          assigned_broker_id: string | null
          bedrooms: number
          breakdown: Json
          closed_at: string | null
          closed_reason:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
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
          flexible_date: boolean
          floor: number
          fragile_items: boolean
          gym_equipment: boolean
          heavy_items: boolean
          id: string
          insurance_tier: string | null
          inventory: Json
          inventory_notes: string | null
          junk_removal: boolean
          labor_hours: number | null
          last_activity_at: string
          lead_phase: Database["public"]["Enums"]["lead_phase_enum"]
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
          portal_token: string | null
          preferred_time: string | null
          property_type: string
          quote_number: string | null
          safe: boolean
          status: string
          storage: boolean
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
          visibility_mask: Json
        }
        Insert: {
          accepted_at?: string | null
          appliances?: boolean
          assembly?: boolean
          assigned_broker_id?: string | null
          bedrooms?: number
          breakdown?: Json
          closed_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
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
          flexible_date?: boolean
          floor?: number
          fragile_items?: boolean
          gym_equipment?: boolean
          heavy_items?: boolean
          id?: string
          insurance_tier?: string | null
          inventory?: Json
          inventory_notes?: string | null
          junk_removal?: boolean
          labor_hours?: number | null
          last_activity_at?: string
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"]
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
          portal_token?: string | null
          preferred_time?: string | null
          property_type: string
          quote_number?: string | null
          safe?: boolean
          status?: string
          storage?: boolean
          truck_size?: string | null
          unpacking?: boolean
          user_id?: string | null
          visibility_mask?: Json
        }
        Update: {
          accepted_at?: string | null
          appliances?: boolean
          assembly?: boolean
          assigned_broker_id?: string | null
          bedrooms?: number
          breakdown?: Json
          closed_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["lead_closed_reason_enum"]
            | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
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
          flexible_date?: boolean
          floor?: number
          fragile_items?: boolean
          gym_equipment?: boolean
          heavy_items?: boolean
          id?: string
          insurance_tier?: string | null
          inventory?: Json
          inventory_notes?: string | null
          junk_removal?: boolean
          labor_hours?: number | null
          last_activity_at?: string
          lead_phase?: Database["public"]["Enums"]["lead_phase_enum"]
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
          portal_token?: string | null
          preferred_time?: string | null
          property_type?: string
          quote_number?: string | null
          safe?: boolean
          status?: string
          storage?: boolean
          truck_size?: string | null
          unpacking?: boolean
          user_id?: string | null
          visibility_mask?: Json
        }
        Relationships: [
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
      [_ in never]: never
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
      generate_quote_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "mover" | "customer"
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
      lead_closed_reason_enum:
        | "won"
        | "lost"
        | "cancelled"
        | "duplicate"
        | "invalid"
        | "expired"
      lead_phase_enum: "unassigned" | "exclusive" | "open_market" | "closed"
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
      app_role: ["admin", "mover", "customer"],
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
      lead_closed_reason_enum: [
        "won",
        "lost",
        "cancelled",
        "duplicate",
        "invalid",
        "expired",
      ],
      lead_phase_enum: ["unassigned", "exclusive", "open_market", "closed"],
    },
  },
} as const
