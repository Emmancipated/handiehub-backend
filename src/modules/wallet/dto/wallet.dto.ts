import { z } from 'zod';

// Create escrow transaction (internal use)
export const createEscrowSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  sellerId: z.string().min(1, 'Seller ID is required'),
  buyerId: z.string().min(1, 'Buyer ID is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentReference: z.string().optional(),
  platformFeePercent: z.number().min(0).max(100).default(0), // Platform fee percentage
});

export type CreateEscrowDto = z.infer<typeof createEscrowSchema>;

// Release escrow (when order is completed)
export const releaseEscrowSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

export type ReleaseEscrowDto = z.infer<typeof releaseEscrowSchema>;

// Withdraw from wallet
export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  bankCode: z.string().min(1, 'Bank code is required'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits'),
  accountName: z.string().optional(),
});

export type WithdrawDto = z.infer<typeof withdrawSchema>;

// Get wallet transactions query params
export const walletTransactionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['held', 'pending_release', 'released', 'refunded', 'disputed']).optional(),
  type: z.enum(['escrow', 'release', 'withdrawal', 'all']).default('all'),
});

export type WalletTransactionsQueryDto = z.infer<typeof walletTransactionsQuerySchema>;
