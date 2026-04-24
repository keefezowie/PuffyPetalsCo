export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Enums: {
      unit_type: "pcs" | "pack" | "gram" | "meter" | "cm" | "roll" | "set";
      material_category:
        | "fuzzy_pipes"
        | "pearl"
        | "stemen"
        | "stem"
        | "wrapping"
        | "accessory"
        | "adhesive"
        | "label"
        | "packaging"
        | "wire"
        | "string";
      estimation_status: "formula_estimated" | "manually_verified" | "sample_data";
      inventory_item_type: "raw_material" | "finished_good";
      inventory_movement_type:
        | "purchase"
        | "production_consumption"
        | "production_output"
        | "sale"
        | "return"
        | "damage"
        | "waste"
        | "manual_adjustment"
        | "stock_correction";
      sales_platform: "Shopee" | "Instagram" | "WhatsApp" | "Offline" | "Other";
      order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "ready_to_pack"
        | "packed"
        | "shipped"
        | "completed"
        | "cancelled"
        | "returned";
      payment_status: "unpaid" | "partial" | "paid" | "refunded";
      fulfillment_status: "unfulfilled" | "reserved" | "fulfilled" | "returned";
      costing_method: "latest_purchase" | "weighted_average" | "fifo";
      production_batch_status: "planned" | "in_progress" | "completed" | "cancelled";
      purchase_list_status: "draft" | "ordered" | "received" | "cancelled";
    };
    Tables: {
      materials: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: Database["public"]["Enums"]["material_category"];
          purchase_unit: Database["public"]["Enums"]["unit_type"];
          usage_unit: Database["public"]["Enums"]["unit_type"];
          conversion_factor: number;
          conversion_is_estimated: boolean;
          min_stock: number;
          target_stock: number;
          preferred_supplier_id: string | null;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["materials"]["Row"]> & {
          owner_id: string;
          name: string;
          category: Database["public"]["Enums"]["material_category"];
          purchase_unit: Database["public"]["Enums"]["unit_type"];
          usage_unit: Database["public"]["Enums"]["unit_type"];
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Row"]>;
      };
      material_variants: {
        Row: {
          id: string;
          owner_id: string;
          material_id: string;
          name: string;
          sku: string | null;
          color: string | null;
          size_mm: number | null;
          pack_weight_gram: number | null;
          pack_price: number;
          estimated_pcs_per_pack: number | null;
          estimated_pcs_per_pack_rounded: number | null;
          actual_counted_pcs_per_pack: number | null;
          estimation_status: Database["public"]["Enums"]["estimation_status"];
          cost_per_usage_unit: number;
          stock_quantity: number;
          min_purchase_quantity: number;
          purchase_increment_quantity: number;
          usage_unit: Database["public"]["Enums"]["unit_type"];
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["material_variants"]["Row"]> & {
          owner_id: string;
          material_id: string;
          name: string;
          usage_unit: Database["public"]["Enums"]["unit_type"];
        };
        Update: Partial<Database["public"]["Tables"]["material_variants"]["Row"]>;
      };
      products: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          sku: string;
          category: string;
          selling_price: number;
          labor_minutes: number;
          labor_rate_per_hour: number;
          packaging_cost: number;
          overhead_cost: number;
          target_margin: number;
          current_stock: number;
          reserved_stock: number;
          average_unit_manufacturing_cost: number;
          last_production_cost: number;
          active: boolean;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          owner_id: string;
          name: string;
          sku: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      inventory_movements: {
        Row: {
          id: string;
          owner_id: string;
          occurred_at: string;
          item_type: Database["public"]["Enums"]["inventory_item_type"];
          item_id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          quantity_in: number;
          quantity_out: number;
          unit: Database["public"]["Enums"]["unit_type"];
          unit_cost: number;
          total_value: number;
          reference_type: string;
          reference_id: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_movements"]["Row"]> & {
          owner_id: string;
          item_type: Database["public"]["Enums"]["inventory_item_type"];
          item_id: string;
          movement_type: Database["public"]["Enums"]["inventory_movement_type"];
          unit: Database["public"]["Enums"]["unit_type"];
          reference_type: string;
          reference_id: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_production_batch: {
        Args: {
          p_product_id: string;
          p_quantity_made: number;
          p_date?: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      plan_production_from_order: {
        Args: {
          p_order_id: string;
          p_mode: string;
          p_date?: string;
          p_notes?: string | null;
        };
        Returns: string[];
      };
      complete_production_batch: {
        Args: {
          p_production_batch_id: string;
          p_date?: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      create_purchase_list_from_batch: {
        Args: {
          p_production_batch_id: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      record_purchase: {
        Args: {
          p_supplier_id: string;
          p_date: string;
          p_shipping_cost: number;
          p_discount: number;
          p_lines: Json;
          p_purchase_list_id?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      fulfill_order: {
        Args: {
          p_order_id: string;
        };
        Returns: string;
      };
      create_stock_adjustment: {
        Args: {
          p_item_type: Database["public"]["Enums"]["inventory_item_type"];
          p_item_id: string;
          p_delta_quantity: number;
          p_unit: Database["public"]["Enums"]["unit_type"];
          p_unit_cost: number;
          p_reason: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
      recommended_price: {
        Args: {
          p_total_cost: number;
          p_target_margin: number;
          p_platform_fee_rate: number;
        };
        Returns: number;
      };
    };
    CompositeTypes: Record<string, never>;
  };
};
