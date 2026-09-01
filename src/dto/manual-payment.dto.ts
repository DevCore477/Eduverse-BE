import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber, Min, MaxLength } from "class-validator";

/** Max screenshot size in bytes (5 MB) */
export const MANUAL_PAYMENT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types for payment screenshot (JPG / PNG) */
export const MANUAL_PAYMENT_ALLOWED_TYPES = ["image/jpeg", "image/png"] as const;

/**
 * Validates base64 image: allowed JPG/PNG, max 5MB.
 * Accepts raw base64 or data URL (data:image/jpeg;base64,...).
 */
export function validateScreenshotBase64(base64: string): void {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Payment screenshot is required (base64 image).");
  }
  let data = base64;
  let mime = "";
  if (base64.startsWith("data:")) {
    const match = base64.match(/^data:(image\/jpeg|image\/png);base64,/i);
    if (!match) {
      throw new Error("Invalid image format. Allowed: JPG or PNG.");
    }
    mime = match[1].toLowerCase();
    data = base64.replace(/^data:image\/\w+;base64,/, "");
  } else {
    throw new Error("Screenshot must be a base64 data URL (e.g. data:image/jpeg;base64,...).");
  }
  if (!MANUAL_PAYMENT_ALLOWED_TYPES.includes(mime as (typeof MANUAL_PAYMENT_ALLOWED_TYPES)[number])) {
    throw new Error("Invalid image format. Allowed: JPG or PNG.");
  }
  const decoded = Buffer.from(data, "base64");
  if (decoded.length > MANUAL_PAYMENT_SCREENSHOT_MAX_BYTES) {
    throw new Error(`Image size must not exceed ${MANUAL_PAYMENT_SCREENSHOT_MAX_BYTES / 1024 / 1024} MB.`);
  }
  if (decoded.length === 0) {
    throw new Error("Invalid image data.");
  }
}

export class ManualPaymentRequestDto {
  @IsNotEmpty({ message: "Subscription plan ID is required" })
  @IsString()
  plan_id!: string;

  @IsNotEmpty({ message: "Request type is required (upgrade or renew)" })
  @IsIn(["upgrade", "renew"], { message: "Request type must be 'upgrade' or 'renew'" })
  request_type!: "upgrade" | "renew";

  @IsNotEmpty({ message: "Payment screenshot (base64 image) is required" })
  @IsString()
  screenshot_base64!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
