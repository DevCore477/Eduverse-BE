import dotenv from "dotenv";
dotenv.config();
export const chargilyConfig = {
    publicKey: process.env.CHARGILY_PUBLIC_KEY || "",
    secretKey: process.env.CHARGILY_SECRET_KEY || "",
    apiEndpoint: "https://pay.chargily.net/test/api/v2/checkouts",
    currency: "dzd",
    callbackUrl: process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL}/api/subscriptions/webhook`
        : "http://localhost:5000/api/subscriptions/webhook",
    successUrl: process.env.PAYMENT_SUCCESS_URL
        ? process.env.PAYMENT_SUCCESS_URL
        // : "nedjmatiapp://pricing-plans?status=succes",
        : "https://api.nedjmati.com/subscriptions/payment-success",
    failureUrl: process.env.PAYMENT_FAILURE_URL
        ? process.env.PAYMENT_FAILURE_URL
        // : "nedjmatiapp://pricing-plans?status=fail",
        : "https://api.nedjmati.com/subscriptions/payment-failure",
};