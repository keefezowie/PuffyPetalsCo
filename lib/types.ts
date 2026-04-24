export type Unit = "pcs" | "pack" | "gram" | "meter" | "cm" | "roll" | "set";

export type MaterialCategory =
  | "pearl"
  | "wire"
  | "string"
  | "packaging"
  | "adhesive"
  | "label"
  | "accessory";

export type EstimationStatus = "formula_estimated" | "manually_verified" | "sample_data";

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_production"
  | "ready_to_pack"
  | "packed"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type FulfillmentStatus = "unfulfilled" | "reserved" | "fulfilled" | "returned";

export type SalesPlatform = "Shopee" | "Instagram" | "WhatsApp" | "Offline" | "Other";

export type MovementType =
  | "purchase"
  | "production_consumption"
  | "production_output"
  | "sale"
  | "return"
  | "damage"
  | "waste"
  | "manual_adjustment"
  | "stock_correction";

export type InventoryItemType = "raw_material" | "finished_good";

export interface Settings {
  id: string;
  ownerId: string;
  allowNegativeStock: boolean;
  targetMargin: number;
  laborRatePerHour: number;
  defaultPlatformFeeRate: number;
  costingMethod: "latest_purchase" | "weighted_average" | "fifo";
}

export interface Supplier {
  id: string;
  ownerId: string;
  name: string;
  channel: string;
  contact?: string;
  marketplaceUrl?: string;
  notes?: string;
  isPreferred: boolean;
}

export interface Material {
  id: string;
  ownerId: string;
  name: string;
  category: MaterialCategory;
  purchaseUnit: Unit;
  usageUnit: Unit;
  conversionFactor: number;
  conversionIsEstimated: boolean;
  minStock: number;
  targetStock: number;
  preferredSupplierId?: string;
  active: boolean;
  notes?: string;
}

export interface MaterialVariant {
  id: string;
  ownerId: string;
  materialId: string;
  name: string;
  sku?: string;
  color?: string;
  sizeMm?: number;
  packWeightGram?: number;
  packPrice: number;
  estimatedPcsPerPack?: number;
  estimatedPcsPerPackRounded?: number;
  actualCountedPcsPerPack?: number;
  estimationStatus: EstimationStatus;
  costPerUsageUnit: number;
  stockQuantity: number;
  usageUnit: Unit;
  active: boolean;
  notes?: string;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  laborMinutes: number;
  laborRatePerHour: number;
  packagingCost: number;
  overheadCost: number;
  targetMargin: number;
  currentStock: number;
  reservedStock: number;
  averageUnitManufacturingCost: number;
  lastProductionCost: number;
  active: boolean;
  photoUrl?: string;
}

export interface ProductBomLine {
  id: string;
  ownerId: string;
  productId: string;
  materialVariantId: string;
  quantityRequired: number;
  usageUnit: Unit;
  wastePercentage: number;
  unitCostSnapshot?: number;
  optional: boolean;
  active: boolean;
  notes?: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  ownerId: string;
  date: string;
  supplierId: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  effectiveTotal: number;
  receiptUrl?: string;
  notes?: string;
}

export interface PurchaseLine {
  id: string;
  ownerId: string;
  purchaseId: string;
  materialVariantId: string;
  quantityPurchased: number;
  purchaseUnit: Unit;
  packSize?: number;
  totalPrice: number;
  shippingAllocation: number;
  discountAllocation: number;
  effectiveCost: number;
  quantityAddedUsageUnit: number;
  costPerUsageUnit: number;
  notes?: string;
}

export interface ProductionBatch {
  id: string;
  ownerId: string;
  productId: string;
  quantityMade: number;
  date: string;
  unitManufacturingCost: number;
  totalManufacturingCost: number;
  notes?: string;
}

export interface ProductionBatchLine {
  id: string;
  ownerId: string;
  productionBatchId: string;
  materialVariantId: string;
  quantityConsumed: number;
  unitCost: number;
  totalCost: number;
  usageUnit: Unit;
}

export interface InventoryMovement {
  id: string;
  ownerId: string;
  occurredAt: string;
  itemType: InventoryItemType;
  itemId: string;
  movementType: MovementType;
  quantityIn: number;
  quantityOut: number;
  unit: Unit;
  unitCost: number;
  totalValue: number;
  referenceType: string;
  referenceId: string;
  notes?: string;
  createdBy?: string;
}

export interface Order {
  id: string;
  ownerId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  platform: SalesPlatform;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  discount: number;
  shippingFeeCharged: number;
  shippingCostPaid: number;
  platformFee: number;
  packagingCost: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  stockDeducted: boolean;
  notes?: string;
}

export interface OrderItem {
  id: string;
  ownerId: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitSellingPrice: number;
  discountAllocated: number;
  unitCost: number;
  lineRevenue: number;
  lineCogs: number;
  lineGrossProfit: number;
  lineMargin: number;
}

export interface PlatformFeeRule {
  id: string;
  ownerId: string;
  platform: SalesPlatform;
  feeRate: number;
  fixedFee: number;
  active: boolean;
  notes?: string;
}

export interface MaterialPriceHistory {
  id: string;
  ownerId: string;
  supplierId: string;
  materialVariantId: string;
  purchaseLineId?: string;
  observedAt: string;
  packPrice: number;
  costPerUsageUnit: number;
  notes?: string;
}

export interface InventoryState {
  settings: Settings;
  suppliers: Supplier[];
  materials: Material[];
  materialVariants: MaterialVariant[];
  products: Product[];
  bomLines: ProductBomLine[];
  purchases: Purchase[];
  purchaseLines: PurchaseLine[];
  productionBatches: ProductionBatch[];
  productionBatchLines: ProductionBatchLine[];
  inventoryMovements: InventoryMovement[];
  orders: Order[];
  orderItems: OrderItem[];
  platformFeeRules: PlatformFeeRule[];
  materialPriceHistory: MaterialPriceHistory[];
}

export interface BomLineCost {
  bomLineId: string;
  materialVariantId: string;
  materialName: string;
  quantityRequired: number;
  wastePercentage: number;
  effectiveQuantity: number;
  unitCost: number;
  lineCost: number;
  missingCost: boolean;
  optional: boolean;
}

export interface ProductCostBreakdown {
  productId: string;
  materialCost: number;
  laborCost: number;
  packagingCost: number;
  overheadCost: number;
  totalCost: number;
  bomLines: BomLineCost[];
  warnings: string[];
}

export interface ProductionFeasibilityLine {
  materialVariantId: string;
  materialName: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  usageUnit: Unit;
  maxProducibleByLine: number;
}

export interface ProductionFeasibility {
  productId: string;
  requestedQuantity: number;
  canProduceRequested: boolean;
  maxProducibleQuantity: number;
  limitingMaterial?: string;
  lines: ProductionFeasibilityLine[];
  warnings: string[];
}

export interface DashboardMetrics {
  rawMaterialInventoryValue: number;
  finishedGoodsInventoryValue: number;
  monthlyRevenue: number;
  monthlyNetProfit: number;
  pendingOrders: number;
  lowStockMaterialCount: number;
  bestSellingProduct?: string;
  highestMarginProduct?: string;
  lowestMarginProduct?: string;
}
