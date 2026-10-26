import { z } from 'zod';
import type { CatalogueResult } from './catalogue';
import { folderFields, parseFolderTemplate } from './folder-template';

export const folderFieldSchema = z.enum(folderFields);
export type FolderField = z.infer<typeof folderFieldSchema>;

export const preferencesSchema = z.object({
  material: z.enum(['aluminium', 'ceramic', 'slate', 'graphite', 'paper', 'copper', 'carbon']),
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
  layout: z.enum(['flat', 'release', 'custom']),
  folderTemplate: z
    .string()
    .max(1024)
    .refine((value) => parseFolderTemplate(value).ok, {
      message: 'Choose a valid relative folder layout.',
    })
    .optional(),
  folders: z
    .array(folderFieldSchema)
    .max(folderFields.length)
    .refine((fields) => new Set(fields).size === fields.length)
    .optional(),
  directory: z.string().min(1).max(4096).nullable(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  material: 'aluminium',
  accent: 'blue',
  layout: 'custom',
  folderTemplate: '<source>/<genre>/<subgenre>/<year>',
  directory: null,
};
export type PreferencesResult = CatalogueResult<Preferences>;
export interface PreferencesBridge {
  read: () => Promise<PreferencesResult>;
  save: (input: Omit<Preferences, 'directory'>) => Promise<PreferencesResult>;
  chooseDirectory: () => Promise<PreferencesResult>;
}
