import type { createTest } from '#testing/factory';

export type AuthMail = { to: string; subject: string; text: string };

/** Auth mail scheduled for delivery, oldest first. */
export async function scheduledMail(test: ReturnType<typeof createTest>) {
  const jobs = await test.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(50)
  );
  return jobs.map((job) => job.args[0] as AuthMail);
}

/** The link in the first scheduled mail that matches. */
export async function mailLink(
  test: ReturnType<typeof createTest>,
  matches: (mail: AuthMail) => boolean
) {
  const mail = (await scheduledMail(test)).find(matches);
  return new URL(mail?.text.match(/https?:\/\/\S+/u)?.[0] ?? 'https://invalid.invalid');
}
