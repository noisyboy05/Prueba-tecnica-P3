// PlanResponseDto — Output DTO for plan data
// Decoupled from Plan entity: uses plain types safe for JSON serialization.

export interface PlanResponseDto {
  id: string;
  name: string;
  price: number;
  description: string;
  createdAt: string;
}
