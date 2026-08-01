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
      commission_invoices: {
        Row: {
          amount: number
          broker_id: string | null
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
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          broker_id?: string | null
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
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          broker_id?: string | null
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
          status?: string
          updated_at?: string
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
          broker_id: string | null
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
          broker_id?: string | null
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
          broker_id?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
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
          appliances: boolean
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
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_response_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
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
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
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
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
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
          accepted_estimate_id?: string | null
          appliances?: boolean
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
          contact_email?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          created_at?: string
          crew_size?: number | null
          customer_response_at?: string | null
          delivery_carry_distance?: string | null
          delivery_elevator?: boolean
          delivery_floor?: number
          delivery_notes?: string | null
          delivery_parking_distance?: string | null
          delivery_property_type?: string | null
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
          job_status?: string
          junk_removal?: boolean
          labor_hours?: number | null
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
          property_type: string
          published_at?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          quote_number?: string | null
          redistribution_count?: number
          rejection_reason?: string | null
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
          accepted_estimate_id?: string | null
          appliances?: boolean
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
          contact_email?: string | null
          contact_phone?: string | null
          contacted_at?: string | null
          created_at?: string
          crew_size?: number | null
          customer_response_at?: string | null
          delivery_carry_distance?: string | null
          delivery_elevator?: boolean
          delivery_floor?: number
          delivery_notes?: string | null
          delivery_parking_distance?: string | null
          delivery_property_type?: string | null
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
          job_status?: string
          junk_removal?: boolean
          labor_hours?: number | null
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
          property_type?: string
          published_at?: string | null
          qualified_at?: string | null
          qualified_by?: string | null
          quote_number?: string | null
          redistribution_count?: number
          rejection_reason?: string | null
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
      fn_admin_redistribute_lead: {
        Args: { _quote_id: string }
        Returns: number
      }
      fn_admin_set_commission_status: {
        Args: { _commission_id: string; _note?: string; _status: string }
        Returns: Json
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
          appliances: boolean
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
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_response_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
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
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
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
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
          safe: boolean
          status: string
          storage: boolean
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
          visibility_mask: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: false
          isSetofReturn: true
        }
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
      fn_generate_commission_invoice: {
        Args: { _commission_id: string }
        Returns: {
          amount: number
          broker_id: string | null
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
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "commission_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_is_company_member: { Args: { _company_id: string }; Returns: boolean }
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
      fn_set_lead_status: {
        Args: {
          _note?: string
          _quote_id: string
          _status: Database["public"]["Enums"]["lead_status_enum"]
        }
        Returns: {
          accepted_at: string | null
          accepted_estimate_id: string | null
          appliances: boolean
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
          contact_email: string | null
          contact_phone: string | null
          contacted_at: string | null
          created_at: string
          crew_size: number | null
          customer_response_at: string | null
          delivery_carry_distance: string | null
          delivery_elevator: boolean
          delivery_floor: number
          delivery_notes: string | null
          delivery_parking_distance: string | null
          delivery_property_type: string | null
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
          job_status: string
          junk_removal: boolean
          labor_hours: number | null
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
          property_type: string
          published_at: string | null
          qualified_at: string | null
          qualified_by: string | null
          quote_number: string | null
          redistribution_count: number
          rejection_reason: string | null
          safe: boolean
          status: string
          storage: boolean
          truck_size: string | null
          unpacking: boolean
          user_id: string | null
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
