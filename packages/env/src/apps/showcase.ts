import { bool, cleanEnv, email, str, url } from 'envalid';

const validated = cleanEnv(process.env, {
  SHOWCASE_BASE_URL: url({ default: 'http://localhost:5173' }),
  SHOWCASE_HEADED: bool({ default: false }),
  SHOWCASE_OWNER_EMAIL: email({ default: 'demo@groam.example' }),
  SHOWCASE_MEMBER_EMAIL: email({ default: 'traveler.001@groam.example' }),
  SHOWCASE_MEMBER_NAME: str({ default: 'Avery Morgan' }),
  SHOWCASE_PASSWORD: str({ default: 'GroamDemo123!' })
});

export const env = {
  baseUrl: validated.SHOWCASE_BASE_URL,
  headed: validated.SHOWCASE_HEADED,
  ownerEmail: validated.SHOWCASE_OWNER_EMAIL,
  memberEmail: validated.SHOWCASE_MEMBER_EMAIL,
  memberName: validated.SHOWCASE_MEMBER_NAME,
  password: validated.SHOWCASE_PASSWORD
} as const;
