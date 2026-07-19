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
      moving_companies: {
        Row: {
          active: boolean
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
          updated_at: string
        }
        Insert: {
          active?: boolean
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
          updated_at?: string
        }
        Update: {
          active?: boolean
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
          assigned_by: string | null
          company_id: string
          contacted_at: string | null
          created_at: string
          id: string
          notes: string | null
          quote_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          company_id: string
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          company_id?: string
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_id?: string
          status?: string
          updated_at?: string
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
          bedrooms: number
          breakdown: Json
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
          long_carry: boolean
          move_date: string | null
          move_size: string | null
          move_type: string | null
          num_movers: number | null
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
        }
        Insert: {
          accepted_at?: string | null
          appliances?: boolean
          assembly?: boolean
          bedrooms?: number
          breakdown?: Json
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
          long_carry?: boolean
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
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
        }
        Update: {
          accepted_at?: string | null
          appliances?: boolean
          assembly?: boolean
          bedrooms?: number
          breakdown?: Json
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
          long_carry?: boolean
          move_date?: string | null
          move_size?: string | null
          move_type?: string | null
          num_movers?: number | null
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
    },
  },
} as const
