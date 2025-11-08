// ============================================
// USER & AUTH TYPES
// ============================================

export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  BUYER = 'BUYER'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface Address {
  id: string;
  profileId: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ============================================
// PRODUCT & INVENTORY TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  category?: Category;
  sellerId: string;
  seller?: User;
  images: string[];
  stock?: Stock;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stock {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: Date;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: string[];
  initialStock: number;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  images?: string[];
}

// ============================================
// ORDER TYPES
// ============================================

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export interface Order {
  id: string;
  userId: string;
  user?: User;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  shippingAddressId: string;
  shippingAddress?: Address;
  transaction?: Transaction;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
}

export interface CreateOrderDto {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddressId: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

// ============================================
// PAYMENT TYPES
// ============================================

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  PAYPAL = 'PAYPAL'
}

export interface Transaction {
  id: string;
  orderId: string;
  order?: Order;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentId?: string;
  razorpayPaymentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentDto {
  orderId: string;
  amount: number;
  currency?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  STOCK_LOW = 'STOCK_LOW'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface SendEmailDto {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// ============================================
// RABBITMQ EVENT TYPES
// ============================================

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  totalAmount: number;
  timestamp: Date;
}

export interface InventoryReservedEvent {
  orderId: string;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface InventoryFailedEvent {
  orderId: string;
  reason: string;
  timestamp: Date;
}

export interface PaymentInitiatedEvent {
  orderId: string;
  amount: number;
  paymentIntentId: string;
  timestamp: Date;
}

export interface PaymentCompletedEvent {
  orderId: string;
  transactionId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
}

export interface PaymentFailedEvent {
  orderId: string;
  reason: string;
  timestamp: Date;
}

export interface OrderConfirmedEvent {
  orderId: string;
  userId: string;
  totalAmount: number;
  timestamp: Date;
}

export interface OrderCancelledEvent {
  orderId: string;
  reason: string;
  timestamp: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// ANALYTICS & REPORTING TYPES
// ============================================

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  period: string;
}

export interface ProductMetrics {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  severity: 'LOW' | 'CRITICAL';
}
