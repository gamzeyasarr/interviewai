/**
 * `node_modules` kurulu değilken IDE/TypeScript modül çözümlemesi için.
 * `npm install` sonrası gerçek paket tipleri kullanılır; çakışma olmaz.
 */
declare module "@google/generative-ai" {
  export interface GenerativeModel {
    generateContent(
      request: string | Record<string, unknown>,
    ): Promise<{
      response: { text(): string };
    }>;
  }

  export class GoogleGenerativeAI {
    constructor(options: { apiKey: string });
    getGenerativeModel(config: {
      model: string;
      systemInstruction?: string;
      generationConfig?: {
        temperature?: number;
        responseMimeType?: string;
      };
    }): GenerativeModel;
  }
}

declare module "next/server" {
  export class NextResponse {
    static json(body: unknown, init?: { status?: number }): Response;
  }
}
