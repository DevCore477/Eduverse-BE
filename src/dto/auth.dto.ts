import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsUUID,
  Length,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from "class-validator";
import { IDENTIFIER_REGEX, PASSWORD_REGEX } from "../constants/regex";

@ValidatorConstraint({ name: "emailOrPhone", async: false })
class EmailOrPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as any;
    return !!(obj.email || obj.phone_number);
  }

  defaultMessage(args: ValidationArguments) {
    return "Either email or phone number must be provided";
  }
}

export class SignUpDto {
  @IsNotEmpty({ message: "Identifier (email or phone) is required" })
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid email or phone number",
  })
  identifier!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/(?=.*[A-Z])/, {
    message: "Password must contain at least 1 uppercase letter",
  })
  @Matches(/(?=.*\d)/, { message: "Password must contain at least 1 number" })
  password!: string;

  @IsNotEmpty({ message: "First name is required" })
  first_name!: string;

  @IsNotEmpty({ message: "Last name is required" })
  last_name!: string;
}

export class SignInDto {
  @IsNotEmpty({ message: "Identifier (email or phone) is required" })
  @Matches(IDENTIFIER_REGEX, {
    message: "Identifier must be a valid email or phone number",
  })
  identifier!: string;
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/(?=.*[A-Z])/, {
    message: "Password must contain at least 1 uppercase letter",
  })
  @Matches(/(?=.*\d)/, { message: "Password must contain at least 1 number" })
  password!: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty({ message: "Please enter your email or phone number" })
  @IsString()
  @Matches(IDENTIFIER_REGEX, {
    message: "Please enter a valid email or phone number",
  })
  identifier!: string;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(IDENTIFIER_REGEX, {
    message: "Please enter a valid email or phone number",
  })
  identifier!: string;

  @IsNotEmpty()
  @Length(6, 6, { message: "OTP must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "OTP must contain only numbers" })
  otp!: string;
}

export class ResendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(IDENTIFIER_REGEX, {
    message: "Please enter a valid email or phone number",
  })
  identifier!: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @Matches(IDENTIFIER_REGEX, {
    message: "Please enter a valid email or phone number",
  })
  identifier!: string;

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
