import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from "class-validator";
import { PASSWORD_REGEX } from "../constants/regex";

export class AdminLoginDto {
  @IsNotEmpty({ message: "Email address is a required field" })
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @IsNotEmpty({ message: "Password is a required field" })
  @IsString({ message: "Enter a valid password" })
  password!: string;
}

export class AdminForgotPasswordDto {
  @IsNotEmpty({ message: "Email address is a required field" })
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;
}

export class AdminResetPasswordDto {
  @IsNotEmpty({ message: "Reset token is required" })
  @IsString()
  token!: string;

  @IsString()
  @MinLength(PASSWORD_REGEX.MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_REGEX.MIN_LENGTH} characters`,
  })
  @Matches(PASSWORD_REGEX.UPPERCASE, {
    message: "Password must contain at least 1 uppercase letter",
  })
  @Matches(PASSWORD_REGEX.NUMBER, {
    message: "Password must contain at least 1 number",
  })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: "Confirm password is required" })
  confirm_password!: string;
}

export class AdminCreateDto {
  @IsNotEmpty({ message: "Email address is a required field" })
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @IsString()
  @MinLength(PASSWORD_REGEX.MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_REGEX.MIN_LENGTH} characters`,
  })
  @Matches(PASSWORD_REGEX.UPPERCASE, {
    message: "Password must contain at least 1 uppercase letter",
  })
  @Matches(PASSWORD_REGEX.NUMBER, {
    message: "Password must contain at least 1 number",
  })
  password!: string;

  @IsNotEmpty({ message: "First name is required" })
  @IsString()
  first_name!: string;

  @IsNotEmpty({ message: "Last name is required" })
  @IsString()
  last_name!: string;
}
