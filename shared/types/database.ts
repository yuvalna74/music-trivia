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
      follows: {
        Row: {
          created_at: string | null
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string | null
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string | null
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          achieved_at: string | null
          best_score: number
          category: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          best_score?: number
          category: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          best_score?: number
          category?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_sessions: {
        Row: {
          code: string
          created_at: string | null
          ended_at: string | null
          host_user_id: string
          id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string | null
          ended_at?: string | null
          host_user_id: string
          id?: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          ended_at?: string | null
          host_user_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_teams: {
        Row: {
          id: string
          name: string
          score: number
          session_id: string
        }
        Insert: {
          id?: string
          name: string
          score?: number
          session_id: string
        }
        Update: {
          id?: string
          name?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_premium: boolean | null
          spotify_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_premium?: boolean | null
          spotify_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          spotify_id?: string | null
        }
        Relationships: []
      }
      round_results: {
        Row: {
          artist_answer: string | null
          artist_correct: boolean
          artist_name: string
          id: string
          points_awarded: number
          solo_game_id: string
          song_answer: string | null
          song_correct: boolean
          track_id: string
          track_name: string
        }
        Insert: {
          artist_answer?: string | null
          artist_correct?: boolean
          artist_name: string
          id?: string
          points_awarded?: number
          solo_game_id: string
          song_answer?: string | null
          song_correct?: boolean
          track_id: string
          track_name: string
        }
        Update: {
          artist_answer?: string | null
          artist_correct?: boolean
          artist_name?: string
          id?: string
          points_awarded?: number
          solo_game_id?: string
          song_answer?: string | null
          song_correct?: boolean
          track_id?: string
          track_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_results_solo_game_id_fkey"
            columns: ["solo_game_id"]
            isOneToOne: false
            referencedRelation: "solo_games"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentation_events: {
        Row: {
          created_at: string | null
          event: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segmentation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segmentation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_games: {
        Row: {
          artists_correct: number
          category: string
          id: string
          played_at: string | null
          songs_correct: number
          total_score: number
          user_id: string
        }
        Insert: {
          artists_correct?: number
          category: string
          id?: string
          played_at?: string | null
          songs_correct?: number
          total_score?: number
          user_id: string
        }
        Update: {
          artists_correct?: number
          category?: string
          id?: string
          played_at?: string | null
          songs_correct?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_spotify_tokens: {
        Row: {
          access_token: string
          expires_at: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_spotify_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_spotify_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
