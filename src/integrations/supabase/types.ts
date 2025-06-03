export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          name: string
          type: string
          category: string
          size: string
          date: string
          path: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          category: string
          size: string
          date: string
          path: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          category?: string
          size?: string
          date?: string
          path?: string
        }
      }
      cattle: {
        Row: {
          id: string
          name: string
          breed: string
          age: number
          weight: number
          gender: string
          category: string
          status: string
        }
        Insert: {
          id?: string
          name: string
          breed: string
          age: number
          weight: number
          gender: string
          category: string
          status: string
        }
        Update: {
          id?: string
          name?: string
          breed?: string
          age?: number
          weight?: number
          gender?: string
          category?: string
          status?: string
        }
      }
      horses: {
        Row: {
          id: string
          name: string
          breed: string
          age: number
          color: string
          gender: string
          status: string
          dateOfBirth?: string
          entryDate?: string
          weight?: number
          observations?: string
        }
        Insert: {
          id?: string
          name: string
          breed: string
          age: number
          color: string
          gender: string
          status: string
          dateOfBirth?: string
          entryDate?: string
          weight?: number
          observations?: string
        }
        Update: {
          id?: string
          name?: string
          breed?: string
          age?: number
          color?: string
          gender?: string
          status?: string
          dateOfBirth?: string
          entryDate?: string
          weight?: number
          observations?: string
        }
      }
      animals: {
        Row: {
          id: string
          name: string
          type: string
          breed?: string
          age?: number
          weight?: number
          gender?: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: string
          breed?: string
          age?: number
          weight?: number
          gender?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          breed?: string
          age?: number
          weight?: number
          gender?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      health_records: {
        Row: {
          id: string
          animal_id: string
          animal_type: string
          type: string
          procedure: string
          date: string
          veterinarian: string
          status: string
          observations?: string
          cost?: number
          created_at: string
          updated_at: string
          user_id?: string
        }
        Insert: {
          id?: string
          animal_id: string
          animal_type: string
          type?: string
          procedure: string
          date: string
          veterinarian: string
          status?: string
          observations?: string
          cost?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          animal_id?: string
          animal_type?: string
          type?: string
          procedure?: string
          date?: string
          veterinarian?: string
          status?: string
          observations?: string
          cost?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          title: string
          description?: string
          date: string
          time: string
          type: string
          animal_id?: string
          reminder: boolean
          location?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          date: string
          time: string
          type: string
          animal_id?: string
          reminder?: boolean
          location?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          date?: string
          time?: string
          type?: string
          animal_id?: string
          reminder?: boolean
          location?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
