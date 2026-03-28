import type { IComputerUseSkill } from './base-skill';
import { GmailSkill } from './gmail-skill';
import { GitHubSkill } from './github-skill';
import { GoogleDriveSkill } from './google-drive-skill';
import { NotionSkill } from './notion-skill';
import { StripeSkill } from './stripe-skill';
import { LinearSkill } from './linear-skill';
import { SlackSkill } from './slack-skill';
import { GoogleCalendarSkill } from './calendar-skill';
import { AsanaSkill } from './asana-skill';
import { VercelSkill } from './vercel-skill';
import { SupabaseSkill } from './supabase-skill';

// Registry of all available Computer Use skills, keyed by service name
export const SKILLS: Record<string, IComputerUseSkill> = {
  gmail: new GmailSkill(),
  github: new GitHubSkill(),
  'google-drive': new GoogleDriveSkill(),
  notion: new NotionSkill(),
  stripe: new StripeSkill(),
  linear: new LinearSkill(),
  slack: new SlackSkill(),
  'google-calendar': new GoogleCalendarSkill(),
  asana: new AsanaSkill(),
  vercel: new VercelSkill(),
  supabase: new SupabaseSkill(),
};

export function getSkill(service: string): IComputerUseSkill | null {
  return SKILLS[service] ?? null;
}

export { type IComputerUseSkill, type SkillContext } from './base-skill';
