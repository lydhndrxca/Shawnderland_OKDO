import type { z } from 'zod';

export interface MediaPart {
  inlineData: { mimeType: string; data: string };
}

export interface ProviderGenerateOpts<T> {
  schema: z.ZodType<T>;
  prompt: string;
  mediaParts?: MediaPart[];
}

export interface Provider {
  generateStructured<T>(opts: ProviderGenerateOpts<T>): Promise<T>;
  multiSampleStructured<T>(
    opts: ProviderGenerateOpts<T> & { n: number },
  ): Promise<T[]>;
}
