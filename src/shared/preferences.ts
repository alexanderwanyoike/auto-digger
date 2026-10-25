import { z } from 'zod';
import type { CatalogueResult } from './catalogue';

export const preferencesSchema = z.object({
  material: z.enum(['aluminium', 'ceramic', 'slate', 'graphite', 'paper', 'copper']),
  accent: z.enum([
    'blue',
    'teal',
    'amber',
    'coral',
    'sage',
    'lilac',
    'rose',
    'electric',
    'green',
    'orange',
    'pink',
    'violet',
  ]),
  layout: z.enum(['flat', 'release']),
  directory: z.string().min(1).max(4096).nullable(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  material: 'aluminium',
  accent: 'blue',
  layout: 'flat',
  directory: null,
};
export type PreferencesResult = CatalogueResult<Preferences>;
export interface PreferencesBridge {
  read: () => Promise<PreferencesResult>;
  save: (input: Omit<Preferences, 'directory'>) => Promise<PreferencesResult>;
  chooseDirectory: () => Promise<PreferencesResult>;
}
