// InvoiceResponseDto — Output DTO for invoice data

export interface InvoiceResponseDto {
  id: string;
  subscriptionId: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
}
