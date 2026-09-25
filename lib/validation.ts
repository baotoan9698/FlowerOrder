import { z } from "zod";
const validDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  });
export const statuses = {
  pending: "Chờ xác nhận",
  preparing: "Đang chuẩn bị",
  delivering: "Đang giao",
  done: "Đã giao",
} as const;
export const orderSources = ["Facebook", "Instagram", "Zalo", "TikTok", "Threads", "Trực tiếp"] as const;
export const orderItemSchema = z.object({
  productId: z.string().max(100).nullable().default(null),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(9999),
  unitPrice: z.number().int().min(0).max(2000000000),
});
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export const paymentMethods = { cash: "Tiền mặt", transfer: "Chuyển khoản", unknown: "Chưa xác định (dữ liệu cũ)" } as const;
export const orderPaymentSchema = z.object({ amount: z.number().int().min(1).max(2000000000), method: z.enum(["cash", "transfer", "unknown"]) });
export type OrderPaymentInput = z.infer<typeof orderPaymentSchema>;
const customerEmail = z.union([z.literal(""), z.email().max(254)]);
const birthday = z.union([z.literal(""), validDate]);
const gender = z.enum(["", "female", "male", "other"]);
export const orderSchema = z
  .object({
    product: z.string().trim().min(1).max(160),
    productId: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .transform((value) => value || null),
    customer: z.string().trim().min(1).max(100),
    customerId: z.string().max(160).optional().transform((value) => value || null),
    customerEmail: customerEmail.default(""),
    customerBirthday: birthday.default(""),
    customerGender: gender.default(""),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d ()-]{8,20}$/),
    address: z.string().trim().max(300).default(""),
    orderDate: validDate,
    orderTime: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
    source: z.enum(["", ...orderSources]).default(""),
    items: z.array(orderItemSchema).min(1).max(100).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const d = new Date(v);
        return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
      }),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    price: z.coerce.number().int().min(0).max(2000000000),
    paidAmount: z.coerce.number().int().min(0).max(2000000000).default(0),
    shippingFee: z.coerce.number().int().min(0).max(2000000000).default(0),
    discount: z.coerce.number().int().min(0).max(2000000000).default(0),
    payments: z.array(orderPaymentSchema).max(100).optional(),
    status: z.enum(["pending", "preparing", "delivering", "done"]),
    note: z.string().trim().max(2000),
  })
  .refine((order) => order.paidAmount <= order.price, {
    message: "Số tiền đã thanh toán không được lớn hơn giá trị đơn hàng.",
    path: ["paidAmount"],
  });
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderView = Omit<OrderInput, "customerEmail" | "customerBirthday" | "customerGender"> & { id: string; code: string; customerRecord: { code: string } };
export type CustomerView = { id: string; code: string; name: string; phone: string; address: string; email?: string; birthday?: string; gender?: string };
export const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^[+\d ()-]{8,20}$/),
  address: z.string().trim().max(300),
  email: customerEmail.optional(),
  birthday: birthday.optional(),
  gender: gender.optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  price: z.coerce.number().int().min(0).max(2000000000),
});
export type ProductInput = z.infer<typeof productSchema>;
export const cashSchema = z.object({
  type: z.enum(["income", "expense"]),
  date: validDate,
  title: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  amount: z.coerce.number().int().min(1).max(2000000000),
  note: z.string().trim().max(2000),
});
export type CashInput = z.infer<typeof cashSchema>;
export type CashView = CashInput & { id: string };
export type ProductView = ProductInput & {
  id: string;
  archived: boolean;
  images: { id: string; slot: number }[];
};
