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
      quotes: {
        Row: {
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
          preferred_time: string | null
          property_type: string
          safe: boolean
          status: string
          storage: boolean
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
        }
        Insert: {
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
          preferred_time?: string | null
          property_type: string
          safe?: boolean
          status?: string
          storage?: boolean
          truck_size?: string | null
          unpacking?: boolean
          user_id?: string | null
        }
        Update: {
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
          preferred_time?: string | null
          property_type?: string
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
