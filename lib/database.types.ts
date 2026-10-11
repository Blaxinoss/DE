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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activation_attempts: {
        Row: {
          answer: string
          correct: boolean
          corrected_answer: string | null
          created_at: string
          errors_json: Json
          evaluator_version: number
          feedback_ar: string
          grammar_score: number
          id: string
          language: string
          meaning_score: number
          model: string
          natural_suggestion: string | null
          naturalness_score: number
          user_id: string
        }
        Insert: {
          answer: string
          correct: boolean
          corrected_answer?: string | null
          created_at?: string
          errors_json?: Json
          evaluator_version: number
          feedback_ar: string
          grammar_score: number
          id: string
          language: string
          meaning_score: number
          model: string
          natural_suggestion?: string | null
          naturalness_score: number
          user_id?: string
        }
        Update: {
          answer?: string
          correct?: boolean
          corrected_answer?: string | null
          created_at?: string
          errors_json?: Json
          evaluator_version?: number
          feedback_ar?: string
          grammar_score?: number
          id?: string
          language?: string
          meaning_score?: number
          model?: string
          natural_suggestion?: string | null
          naturalness_score?: number
          user_id?: string
        }
        Relationships: []
      }
      activation_word_results: {
        Row: {
          attempt_id: string
          collocation_correct: boolean
          created_at: string
          feedback_ar: string | null
          grammar_correct: boolean
          id: string
          meaning_correct: boolean
          natural_usage: boolean
          review_id: string | null
          usage_score: number
          used: boolean
          vocabulary_id: string | null
          word_snapshot: string
        }
        Insert: {
          attempt_id: string
          collocation_correct: boolean
          created_at?: string
          feedback_ar?: string | null
          grammar_correct: boolean
          id?: string
          meaning_correct: boolean
          natural_usage: boolean
          review_id?: string | null
          usage_score: number
          used: boolean
          vocabulary_id?: string | null
          word_snapshot: string
        }
        Update: {
          attempt_id?: string
          collocation_correct?: boolean
          created_at?: string
          feedback_ar?: string | null
          grammar_correct?: boolean
          id?: string
          meaning_correct?: boolean
          natural_usage?: boolean
          review_id?: string | null
          usage_score?: number
          used?: boolean
          vocabulary_id?: string | null
          word_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_word_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "activation_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_word_results_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_word_results_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_daily_usage: {
        Row: {
          action: string
          request_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          action: string
          request_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          action?: string
          request_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      global_lexicon: {
        Row: {
          chunk: string | null
          commonness: string | null
          created_at: string
          example: string | null
          grammar_json: Json
          id: string
          language: string
          meaning_ar: string
          model: string
          normalized_word: string
          schema_version: number
          search_terms: string[]
          sense_key: string
          type: string
          updated_at: string
          word: string
        }
        Insert: {
          chunk?: string | null
          commonness?: string | null
          created_at?: string
          example?: string | null
          grammar_json?: Json
          id?: string
          language: string
          meaning_ar: string
          model: string
          normalized_word: string
          schema_version?: number
          search_terms?: string[]
          sense_key: string
          type: string
          updated_at?: string
          word: string
        }
        Update: {
          chunk?: string | null
          commonness?: string | null
          created_at?: string
          example?: string | null
          grammar_json?: Json
          id?: string
          language?: string
          meaning_ar?: string
          model?: string
          normalized_word?: string
          schema_version?: number
          search_terms?: string[]
          sense_key?: string
          type?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          activation_attempt_id: string | null
          id: string
          result: string
          review_type: string
          reviewed_at: string
          vocabulary_id: string
        }
        Insert: {
          activation_attempt_id?: string | null
          id?: string
          result: string
          review_type: string
          reviewed_at?: string
          vocabulary_id: string
        }
        Update: {
          activation_attempt_id?: string | null
          id?: string
          result?: string
          review_type?: string
          reviewed_at?: string
          vocabulary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          learning_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          learning_language?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          learning_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          chunk: string | null
          commonness: string | null
          created_at: string
          example: string | null
          grammar_json: Json
          id: string
          language: string
          lexicon_id: string | null
          meaning_ar: string
          next_review_at: string | null
          state: string
          target: string
          type: string
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          chunk?: string | null
          commonness?: string | null
          created_at?: string
          example?: string | null
          grammar_json?: Json
          id?: string
          language?: string
          lexicon_id?: string | null
          meaning_ar?: string
          next_review_at?: string | null
          state?: string
          target: string
          type: string
          updated_at?: string
          user_id?: string
          word: string
        }
        Update: {
          chunk?: string | null
          commonness?: string | null
          created_at?: string
          example?: string | null
          grammar_json?: Json
          id?: string
          language?: string
          lexicon_id?: string | null
          meaning_ar?: string
          next_review_at?: string | null
          state?: string
          target?: string
          type?: string
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_lexicon_id_fkey"
            columns: ["lexicon_id"]
            isOneToOne: false
            referencedRelation: "global_lexicon"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_quota: { Args: { p_action: string }; Returns: boolean }
      record_learning_result:
        | {
            Args: {
              p_next_review_at: string
              p_result: string
              p_review_type: string
              p_reviewed_at: string
              p_state: string
              p_vocabulary_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_activation_attempt_id: string
              p_next_review_at: string
              p_result: string
              p_review_type: string
              p_reviewed_at: string
              p_state: string
              p_vocabulary_id: string
            }
            Returns: Json
          }
      record_learning_results: { Args: { p_results: Json }; Returns: Json }
      save_activation_history: {
        Args: { p_attempts: Json; p_word_results: Json }
        Returns: Json
      }
      search_global_lexicon: {
        Args: { p_language: string; p_limit?: number; p_query: string }
        Returns: {
          chunk: string
          commonness: string
          example: string
          grammar_json: Json
          id: string
          language: string
          meaning_ar: string
          score: number
          search_terms: string[]
          sense_key: string
          type: string
          word: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
