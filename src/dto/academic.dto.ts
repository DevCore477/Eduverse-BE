import { IsUUID, IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateAcademicDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: "Grade must be between 1 and 5" })
  @Max(5, { message: "Grade must be between 1 and 5" })
  grade!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAcademicDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: "Grade must be between 1 and 5" })
  @Max(5, { message: "Grade must be between 1 and 5" })
  grade?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AcademicResponseDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsInt()
  grade!: number;

  @IsOptional()
  @IsString()
  description?: string;

  created_at?: string;
  updated_at?: string;
}

