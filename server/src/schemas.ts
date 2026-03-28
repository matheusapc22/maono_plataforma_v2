import { z } from 'zod';

// ==========================================
// 🛡️ SCHEMAS DE AUTENTICAÇÃO E USUÁRIO
// ==========================================
export const registerSchema = z.object({
  orgName: z.string().min(2),
  orgType: z.enum(['PLATFORM', 'RETAILER', 'DISTRIBUTOR']),
  userName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ==========================================
// 📊 SCHEMAS DO MOTOR DE BI (ESTADO DE 2KB)
// ==========================================
export const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  // O state_json é validado como string, mas o front manda um JSON.stringify()
  state_json: z.string().min(2), 
});

// ==========================================
// 🛒 SCHEMAS DO MARKETPLACE (PREPARAÇÃO FASE 3.0)
// ==========================================
export const demandListSchema = z.object({
  title: z.string().min(5),
  expires_at: z.string().datetime(),
  items: z.array(z.object({
    product_name: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
  })).min(1)
});