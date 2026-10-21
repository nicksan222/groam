import { cleanEnv, str } from 'envalid';

const validated = cleanEnv(process.env, {
  AUTH_EMAIL_FROM: str({
    default: 'Groam <noreply@groam.localhost>',
    desc: "Sender for authentication mail sent by the Void Worker; production uses the owner's Cloudflare email domain"
  })
});

export const env = {
  authEmailFrom: validated.AUTH_EMAIL_FROM
} as const;
