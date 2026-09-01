import { IsOptional, IsString, IsEnum } from "class-validator";

export enum SubscriptionStatusFilter {
  ACTIVE = "active",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export class AdminUserListDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatusFilter, {
    message: "Subscription status must be one of: active, expired, cancelled",
  })
  status?: SubscriptionStatusFilter;

  page?: number;
  limit?: number;
}
