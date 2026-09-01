import { IsUUID, IsNotEmpty, IsString, IsOptional, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';

export class PupilResponseDto {
  @IsString()
  id!: string;

  @IsString()
  parent_id!: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  @IsIn(["male", "female"])
  gender?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  pin_code?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: "Grade must be between 1 and 5" })
  @Max(5, { message: "Grade must be between 1 and 5" })
  grade?: number;

  @IsOptional()
  @IsUUID()
  current_year_id?: string;

  @IsDateString()
  created_at!: string;
}


export class CreatePupilDto {
  @IsNotEmpty()
  parent_id!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsOptional()
  @IsInt()
  @Min(6, { message: "Age must be between 6 and 11" })
  @Max(11, { message: "Age must be between 6 and 11" })
  age?: number;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female'])
  gender?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  pin_code?: string;

  @IsOptional()
  @IsUUID()
  current_year_id?: string;
}


export class UpdatePupilDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsInt()
  @Min(6, { message: "Age must be between 6 and 11" })
  @Max(11, { message: "Age must be between 6 and 11" })
  age?: number;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female'])
  gender?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  pin_code?: string;

  @IsOptional()
  @IsUUID()
  current_year_id?: string;
}