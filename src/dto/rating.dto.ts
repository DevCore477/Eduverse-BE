import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from "class-validator";

export class CreateRatingDto {
  @IsNotEmpty({ message: "Rating is required" })
  @IsInt({ message: "Rating must be an integer" })
  @Min(1, { message: "Rating must be at least 1" })
  @Max(5, { message: "Rating must be at most 5" })
  rating!: number;

  @IsOptional()
  @IsString({ message: "Comment must be a string" })
  @MaxLength(1000, { message: "Comment must not exceed 1000 characters" })
  comment?: string;
}

export class GetRatingDto {
  id!: string;
  parent_id!: string;
  rating!: number;
  comment?: string | null;
  created_at!: Date;
  updated_at!: Date;
}

