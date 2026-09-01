import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendOtpSms(phoneNumber: string, otp: string) {
  const params = {
    PhoneNumber: phoneNumber,
    Message: `Your password reset code is ${otp}. It is valid for 10 minutes.`,
  };

  const result = await snsClient.send(new PublishCommand(params));
  console.log('SNS result:', result);
}
