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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      compartimente: {
        Row: {
          created_at: string | null
          created_by: string | null
          fond_id: string
          id: string
          nume: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fond_id: string
          id?: string
          nume: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fond_id?: string
          id?: string
          nume?: string
        }
        Relationships: [
          {
            foreignKeyName: "compartimente_fond_id_fkey"
            columns: ["fond_id"]
            isOneToOne: false
            referencedRelation: "fonduri"
            referencedColumns: ["id"]
          },
        ]
      }
      dosare: {
        Row: {
          continut: string
          created_at: string | null
          created_by: string | null
          date_extreme: string
          id: string
          indicativ_nomenclator: string
          inventar_id: string
          nr_crt: number
          nr_cutie: number | null
          numar_file: number | null
          observatii: string | null
        }
        Insert: {
          continut: string
          created_at?: string | null
          created_by?: string | null
          date_extreme: string
          id?: string
          indicativ_nomenclator: string
          inventar_id: string
          nr_crt: number
          nr_cutie?: number | null
          numar_file?: number | null
          observatii?: string | null
        }
        Update: {
          continut?: string
          created_at?: string | null
          created_by?: string | null
          date_extreme?: string
          id?: string
          indicativ_nomenclator?: string
          inventar_id?: string
          nr_crt?: number
          nr_cutie?: number | null
          numar_file?: number | null
          observatii?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dosare_inventar_id_fkey"
            columns: ["inventar_id"]
            isOneToOne: false
            referencedRelation: "inventare"
            referencedColumns: ["id"]
          },
        ]
      }
      fonduri: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          nume: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nume: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nume?: string
        }
        Relationships: []
      }
      inventare: {
        Row: {
          an: number
          compartiment_id: string
          created_at: string | null
          created_by: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          numar_dosare: number
          termen_pastrare: string
        }
        Insert: {
          an: number
          compartiment_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          numar_dosare?: number
          termen_pastrare: string
        }
        Update: {
          an?: number
          compartiment_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          numar_dosare?: number
          termen_pastrare?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventare_compartiment_id_fkey"
            columns: ["compartiment_id"]
            isOneToOne: false
            referencedRelation: "compartimente"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_access: boolean
          id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_access?: boolean
          id: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_access?: boolean
          id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
