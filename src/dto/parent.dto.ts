import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  Matches,
  Length,
  IsEmail,
} from "class-validator";
import { IDENTIFIER_REGEX } from "../constants/regex";

export class UpdateParentDto {
  @IsOptional()
  @IsString({ message: "First name must be a string" })
  @IsNotEmpty({ message: "First name cannot be empty if provided" })
  first_name?: string;

  @IsOptional()
  @IsString({ message: "Last name must be a string" })
  @IsNotEmpty({ message: "Last name cannot be empty if provided" })
  last_name?: string;

  @IsOptional()
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid email or phone number",
  })
  identifier?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/(?=.*[A-Z])/, {
    message: "Password must contain at least 1 uppercase letter",
  })
  @Matches(/(?=.*\d)/, { message: "Password must contain at least 1 number" })
  password?: string;

  @IsOptional()
  @IsString({ message: "PIN code must be a string" })
  @Length(4, 4, { message: "PIN code must be 4 digits" })
  @Matches(/^\d+$/, { message: "PIN code must contain only digits" })
  pin_code?: string;
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg);base64,/, {
    message: "profile_image must be valid base64 image",
  })
  profile_image_base64?: string;
}

export class GetParentProfileDto {
  id!: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  created_at?: string;
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: "Current password is required" })
  @IsString({ message: "Current password must be a string" })
  current_password!: string;

  @IsNotEmpty({ message: "New password is required" })
  @IsString({ message: "New password must be a string" })
  @MinLength(8, { message: "New password must be at least 8 characters" })
  @Matches(/(?=.*[A-Z])/, {
    message: "New password must contain at least 1 uppercase letter",
  })
  @Matches(/(?=.*\d)/, { message: "New password must contain at least 1 number" })
  new_password!: string;

  @IsNotEmpty({ message: "Confirm new password is required" })
  @IsString({ message: "Confirm new password must be a string" })
  confirm_new_password!: string;
}
