export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export const IDENTIFIER_REGEX = new RegExp(
  `${EMAIL_REGEX.source}|${PHONE_REGEX.source}`
);

// At least 8 chars, one uppercase, one number
export const PASSWORD_REGEX = {
  MIN_LENGTH: 8,
  UPPERCASE: /(?=.*[A-Z])/,
  NUMBER: /(?=.*\d)/,
};
