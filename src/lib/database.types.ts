export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      capacities: {
        Row: {
          category: Database['public']['Enums']['load_category']
          user_id: string
          weekly_hours: number
        }
        Insert: {
          category: Database['public']['Enums']['load_category']
          user_id: string
          weekly_hours: number
        }
        Update: {
          category?: Database['public']['Enums']['load_category']
          user_id?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          energy: number
          id: string
          logged_on: string
          slept_well: boolean
          stress: number
          user_id: string
        }
        Insert: {
          created_at?: string
          energy: number
          id?: string
          logged_on: string
          slept_well: boolean
          stress: number
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: number
          id?: string
          logged_on?: string
          slept_well?: boolean
          stress?: number
          user_id?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          category: Database['public']['Enums']['load_category']
          created_at: string
          deferred_to: string | null
          due_at: string | null
          effort_hours: number
          google_event_id: string | null
          id: string
          is_flexible: boolean
          priority: number
          status: string
          title: string
          user_id: string
        }
        Insert: {
          category: Database['public']['Enums']['load_category']
          created_at?: string
          deferred_to?: string | null
          due_at?: string | null
          effort_hours: number
          google_event_id?: string | null
          id?: string
          is_flexible?: boolean
          priority: number
          status?: string
          title: string
          user_id: string
        }
        Update: {
          category?: Database['public']['Enums']['load_category']
          created_at?: string
          deferred_to?: string | null
          due_at?: string | null
          effort_hours?: number
          google_event_id?: string | null
          id?: string
          is_flexible?: boolean
          priority?: number
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          exam_at: string
          id: string
          revision_hours_per_week: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_at: string
          id?: string
          revision_hours_per_week: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_at?: string
          id?: string
          revision_hours_per_week?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      fitbit_connections: {
        Row: {
          access_token: string
          connected_at: string
          expires_at: string
          fitbit_user_id: string | null
          refresh_token: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          expires_at: string
          fitbit_user_id?: string | null
          refresh_token: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          expires_at?: string
          fitbit_user_id?: string | null
          refresh_token?: string
          user_id?: string
        }
        Relationships: []
      }
      fitbit_oauth_states: {
        Row: {
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state?: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      load_snapshots: {
        Row: {
          category_loads: Json
          created_at: string
          logged_on: string
          overall_percentage: number
          user_id: string
        }
        Insert: {
          category_loads?: Json
          created_at?: string
          logged_on: string
          overall_percentage: number
          user_id: string
        }
        Update: {
          category_loads?: Json
          created_at?: string
          logged_on?: string
          overall_percentage?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          accepted: boolean | null
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          activities: Json
          bedtime: string
          updated_at: string
          user_id: string
          wake_time: string
        }
        Insert: {
          activities?: Json
          bedtime?: string
          updated_at?: string
          user_id: string
          wake_time?: string
        }
        Update: {
          activities?: Json
          bedtime?: string
          updated_at?: string
          user_id?: string
          wake_time?: string
        }
        Relationships: []
      }
      wearable_metrics: {
        Row: {
          created_at: string
          id: string
          logged_on: string
          resting_heart_rate: number | null
          sleep_efficiency: number | null
          sleep_minutes: number | null
          source: string
          steps: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_on: string
          resting_heart_rate?: number | null
          sleep_efficiency?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_on?: string
          resting_heart_rate?: number | null
          sleep_efficiency?: number | null
          sleep_minutes?: number | null
          source?: string
          steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      load_category: 'mental' | 'time' | 'physical' | 'social' | 'errands'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database['public']

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]
