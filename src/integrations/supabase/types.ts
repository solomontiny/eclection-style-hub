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
      bulk_requests: {
        Row: {
          country: string
          created_at: string
          customer_name: string
          delivery_city: string
          delivery_country: string
          id: string
          notes: string | null
          products_requested: Json
          quantity: number
          status: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          country: string
          created_at?: string
          customer_name: string
          delivery_city: string
          delivery_country: string
          id?: string
          notes?: string | null
          products_requested: Json
          quantity: number
          status?: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          country?: string
          created_at?: string
          customer_name?: string
          delivery_city?: string
          delivery_country?: string
          id?: string
          notes?: string | null
          products_requested?: Json
          quantity?: number
          status?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      bundles: {
        Row: {
          child_product_id: string
          created_at: string
          id: string
          parent_product_id: string
          quantity: number
        }
        Insert: {
          child_product_id: string
          created_at?: string
          id?: string
          parent_product_id: string
          quantity?: number
        }
        Update: {
          child_product_id?: string
          created_at?: string
          id?: string
          parent_product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundles_child_product_id_fkey"
            columns: ["child_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_discount: number | null
          min_order_amount: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          order_id: string | null
          product_id: string | null
          sent_email: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          product_id?: string | null
          sent_email?: boolean
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          order_id?: string | null
          product_id?: string | null
          sent_email?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bundle_id: string | null
          color: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          bundle_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          size?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          bundle_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          courier: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount: number
          estimated_delivery: string | null
          id: string
          notes: string | null
          notified_status: Database["public"]["Enums"]["order_status"] | null
          notified_tracking: string | null
          order_number: string
          payment_amount: number | null
          payment_currency: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          paystack_reference: string | null
          shipping: number
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          taxable_subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          notified_status?: Database["public"]["Enums"]["order_status"] | null
          notified_tracking?: string | null
          order_number?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          paystack_reference?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxable_subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          notified_status?: Database["public"]["Enums"]["order_status"] | null
          notified_tracking?: string | null
          order_number?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          paystack_reference?: string | null
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxable_subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          color_images: Json | null
          colors: string[] | null
          created_at: string
          description: string | null
          discount_percent: number
          featured: boolean
          id: string
          images: string[]
          low_stock_threshold: number
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type_enum"]
          promotion_status: Database["public"]["Enums"]["promotion_status_enum"]
          sale_price: number | null
          sizes: string[] | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          color_images?: Json | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          featured?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type_enum"]
          promotion_status?: Database["public"]["Enums"]["promotion_status_enum"]
          sale_price?: number | null
          sizes?: string[] | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          color_images?: Json | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          featured?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type_enum"]
          promotion_status?: Database["public"]["Enums"]["promotion_status_enum"]
          sale_price?: number | null
          sizes?: string[] | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          bank_accounts: Json | null
          bank_transfer_enabled: boolean
          bank_transfer_instructions: string | null
          bulk_instructions: string | null
          bulk_min_qty: number | null
          bulk_order_enabled: boolean | null
          bulk_unit_price: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          id: string
          is_vat_enabled: boolean
          is_video_advert_enabled: boolean | null
          poster_image_url: string | null
          shipping_flat_rate: number
          store_description: string | null
          store_name: string
          store_policies: string | null
          tax_percent: number
          updated_at: string
          vat_rate: number
          video_description: string | null
          video_title: string | null
          video_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          bank_accounts?: Json | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          bulk_instructions?: string | null
          bulk_min_qty?: number | null
          bulk_order_enabled?: boolean | null
          bulk_unit_price?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_vat_enabled?: boolean
          is_video_advert_enabled?: boolean | null
          poster_image_url?: string | null
          shipping_flat_rate?: number
          store_description?: string | null
          store_name?: string
          store_policies?: string | null
          tax_percent?: number
          updated_at?: string
          vat_rate?: number
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          bank_accounts?: Json | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          bulk_instructions?: string | null
          bulk_min_qty?: number | null
          bulk_order_enabled?: boolean | null
          bulk_unit_price?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_vat_enabled?: boolean
          is_video_advert_enabled?: boolean | null
          poster_image_url?: string | null
          shipping_flat_rate?: number
          store_description?: string | null
          store_name?: string
          store_policies?: string | null
          tax_percent?: number
          updated_at?: string
          vat_rate?: number
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
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
      public_shop_settings: {
        Row: {
          bank_accounts: Json | null
          bank_transfer_enabled: boolean
          bank_transfer_instructions: string | null
          bulk_instructions: string | null
          bulk_min_qty: number | null
          bulk_order_enabled: boolean | null
          bulk_unit_price: number | null
          contact_email: string | null
          contact_phone: string | null
          currency: string
          id: string
          is_vat_enabled: boolean
          is_video_advert_enabled: boolean | null
          poster_image_url: string | null
          shipping_flat_rate: number
          store_description: string | null
          store_name: string
          store_policies: string | null
          tax_percent: number
          vat_rate: number
          video_description: string | null
          video_title: string | null
          video_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          bank_accounts?: Json | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          bulk_instructions?: string | null
          bulk_min_qty?: number | null
          bulk_order_enabled?: boolean | null
          bulk_unit_price?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          id?: string
          is_vat_enabled?: boolean
          is_video_advert_enabled?: boolean | null
          poster_image_url?: string | null
          shipping_flat_rate?: number
          store_description?: string | null
          store_name?: string
          store_policies?: string | null
          tax_percent?: number
          vat_rate?: number
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          bank_accounts?: Json | null
          bank_transfer_enabled?: boolean
          bank_transfer_instructions?: string | null
          bulk_instructions?: string | null
          bulk_min_qty?: number | null
          bulk_order_enabled?: boolean | null
          bulk_unit_price?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          id?: string
          is_vat_enabled?: boolean
          is_video_advert_enabled?: boolean | null
          poster_image_url?: string | null
          shipping_flat_rate?: number
          store_description?: string | null
          store_name?: string
          store_policies?: string | null
          tax_percent?: number
          vat_rate?: number
          video_description?: string | null
          video_title?: string | null
          video_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      create_order_with_stock_reservations: {
        Args: {
          p_items: Json
          p_order: Json
        }
        Returns: {
          id: string
          order_number: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          total: number
        }[]
      }
      cancel_pending_order_and_restore_reserved_stock: {
        Args: { p_order_id: string }
        Returns: string
      }
      reserve_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: number
      }
      restore_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      discount_type: "percent" | "fixed"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "out_for_delivery"
      payment_method: "paystack" | "bank_transfer"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      product_status: "draft" | "active" | "archived"
      product_type_enum: "standard" | "bundle" | "premium"
      promotion_status_enum: "regular" | "sale" | "flash_sale"
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
    Enums: {
      app_role: ["admin", "customer"],
      discount_type: ["percent", "fixed"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "out_for_delivery",
      ],
      payment_method: ["paystack", "bank_transfer"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      product_status: ["draft", "active", "archived"],
      product_type_enum: ["standard", "bundle", "premium"],
      promotion_status_enum: ["regular", "sale", "flash_sale"],
    },
  },
} as const
