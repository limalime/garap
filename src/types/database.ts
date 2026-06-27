// AUTO-GENERATED from the live Supabase schema. Do not edit by hand.
// Regenerate after migrations:
//   npx supabase gen types typescript --project-id oquihpmdpdmntpysbdcl > src/types/database.ts
// (or via the Supabase MCP `generate_typescript_types`).

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
      notes: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          linked_bounty_id: string | null
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          linked_bounty_id?: string | null
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          linked_bounty_id?: string | null
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_linked_bounty_id_fkey"
            columns: ["linked_bounty_id"]
            isOneToOne: false
            referencedRelation: "bounties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bounties: {
        Row: {
          bounty_name: string
          category: string | null
          created_at: string
          deadline: string
          deleted_at: string | null
          id: string
          notes: string | null
          platform: string | null
          platform_custom_name: string | null
          prize_amount: number
          prize_in_usd: number
          prize_unit: string | null
          source_link: string | null
          status: string
          submission_link: string | null
          todos: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bounty_name: string
          category?: string | null
          created_at?: string
          deadline: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          platform_custom_name?: string | null
          prize_amount?: number
          prize_in_usd?: number
          prize_unit?: string | null
          source_link?: string | null
          status?: string
          submission_link?: string | null
          todos?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bounty_name?: string
          category?: string | null
          created_at?: string
          deadline?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          platform_custom_name?: string | null
          prize_amount?: number
          prize_in_usd?: number
          prize_unit?: string | null
          source_link?: string | null
          status?: string
          submission_link?: string | null
          todos?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_history: {
        Row: {
          amount_usd: number
          bounty_id: string | null
          category: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_usd?: number
          bounty_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          bounty_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_history_bounty_id_fkey"
            columns: ["bounty_id"]
            isOneToOne: false
            referencedRelation: "bounties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_revenue: {
        Row: {
          id: string
          last_updated: string
          total_revenue_usd: number
          user_id: string
          win_rate: number
        }
        Insert: {
          id?: string
          last_updated?: string
          total_revenue_usd?: number
          user_id: string
          win_rate?: number
        }
        Update: {
          id?: string
          last_updated?: string
          total_revenue_usd?: number
          user_id?: string
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_revenue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          language: string
          notification_enabled: boolean
          profile_picture_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          language?: string
          notification_enabled?: boolean
          profile_picture_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          language?: string
          notification_enabled?: boolean
          profile_picture_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalc_user_revenue: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
