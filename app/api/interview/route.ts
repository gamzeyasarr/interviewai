import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";



import { parseJsonFromAssistant } from "@/lib/model-json";

const SYSTEM_BASE =
  "Sen Türkiye'nin en deneyimli mülakat koçusun. " +
  "15 yıldır Trendyol, Getir, Akbank, Arçelik gibi Türk şirketlerinde " +
  "ve Google, Microsoft gibi global şirketlerde işe alım süreçlerini yönettin. " +
  "Adaylara her zaman Türkçe, yapıcı ve somut geri bildirim verirsin. " +
  "Sorularını şirketin kültürüne, büyüklüğüne ve sektörüne göre özelleştirirsin. " +
  "Geri bildirimlerinde her zaman: " +
  "1) Somut güçlü yönler, " +
  "2) Geliştirilmesi gereken spesifik noktalar, " +
  "3) Gerçek bir mülakatı kazandıracak ideal cevap örneği verirsin. " +
  "Tüm çıktıların Türkçe olmalı.";

const GEMINI_MODEL = "gemini-2.5-flash";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function readTrimmedString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function getGoogleApiKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getGenAI() {
  const key = getGoogleApiKey();
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (GoogleGenerativeAI as any)(key);
}

interface QuestionPayload {
  question: string;
}

interface FeedbackPayload {
  feedback: {
    strengths: string[];
    weaknesses: string[];
    ideal_answer: string;
    score: number;
  };
}

function isQuestionPayload(x: unknown): x is QuestionPayload {
  return (
    typeof x === "object" &&
    x !== null &&
    "question" in x &&
    typeof (x as QuestionPayload).question === "string" &&
    (x as QuestionPayload).question.trim().length > 0
  );
}

function isFeedbackPayload(x: unknown): x is FeedbackPayload {
  if (typeof x !== "object" || x === null || !("feedback" in x)) return false;
  const fb = (x as FeedbackPayload).feedback;
  if (typeof fb !== "object" || fb === null) return false;
  const o = fb as Record<string, unknown>;
  return (
    Array.isArray(o.strengths) &&
    o.strengths.every((s) => typeof s === "string") &&
    Array.isArray(o.weaknesses) &&
    o.weaknesses.every((s) => typeof s === "string") &&
    typeof o.ideal_answer === "string" &&
    typeof o.score === "number" &&
    o.score >= 0 &&
    o.score <= 100
  );
}

function mapGeminiError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const status = typeof o.status === "number" ? o.status : undefined;
    const message = typeof o.message === "string" ? o.message : "";
    if (
      status === 401 ||
      status === 403 ||
      /API key|API_KEY|PERMISSION_DENIED|invalid api key/i.test(message)
    ) {
      return "API anahtarı geçersiz. Ortam değişkenlerini kontrol edin.";
    }
    if (status === 429 || /429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(message)) {
      return "Çok fazla istek yapıldı. Bir süre sonra tekrar deneyin.";
    }
    if (status === 503 || /503|UNAVAILABLE|overloaded|temporarily/i.test(message)) {
      return "Yapay zeka servisi geçici olarak kullanılamıyor.";
    }
  }
  return "Yapay zeka yanıtı alınamadı. Lütfen tekrar deneyin.";
}

async function generateJsonText(
  genAI: GoogleGenerativeAI,
  userText: string,
  temperature: number,
  history: ConversationMessage[] = [],
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_BASE,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });

  const contents = [
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: userText }] },
  ];

  const result = await model.generateContent({ contents });
  let raw: string;
  try {
    raw = result.response.text();
  } catch {
    throw new Error("empty_response");
  }
  if (!raw?.trim()) {
    throw new Error("empty_response");
  }
  return raw;
}

export async function POST(request: Request) {
  const genAI = getGenAI();
  if (!genAI) {
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik: GOOGLE_GENERATIVE_AI_API_KEY tanımlı değil." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
  }

  const payload = body as unknown as Record<string, unknown>;
  const action = payload["action"];
  if (typeof action !== "string") {
    return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
  }

  try {
    if (action === "question") {
      const company = readTrimmedString(payload, "company");
      const position = readTrimmedString(payload, "position");
      const difficulty = readTrimmedString(payload, "difficulty") || "orta";
      const category = readTrimmedString(payload, "category") || "davranışsal";
      const history = Array.isArray(payload["history"])
        ? (payload["history"] as ConversationMessage[])
        : [];

      if (!company || !position) {
        return NextResponse.json(
          { error: "Şirket adı ve pozisyon boş bırakılamaz." },
          { status: 400 },
        );
      }

      const userText =
        `Şirket: "${company}"\nPozisyon: "${position}"\nZorluk: "${difficulty}"\nKategori: "${category}"\n\n` +
        `Bu şirkete gerçek bir mülakatda sorulabilecek, ` +
        `zorluk seviyesi "${difficulty}" ve kategorisi "${category}" olan TEK bir soru üret.\n` +
        `Daha önce sorulmuş sorulardan FARKLI bir soru seç.\n` +
        `Teknik: kod, sistem, algoritma soruları.\n` +
        `Davranışsal: geçmiş deneyim ve yetkinlik soruları.\n` +
        `Stres: baskı altında karar verme soruları.\n` +
        `Soru özgün, şirkete özel ve gerçekçi olsun.\n\n` +
        'Yanıtı yalnızca şu JSON nesnesi olarak ver: {"question":"..."}';

      let raw: string;
      try {
        raw = await generateJsonText(genAI, userText, 0.7, history);
      } catch (e) {
        if (e instanceof Error && e.message === "empty_response") {
          return NextResponse.json({ error: "Model boş yanıt döndü." }, { status: 502 });
        }
        throw e;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromAssistant(raw);
      } catch {
        return NextResponse.json({ error: "Model yanıtı işlenemedi." }, { status: 502 });
      }

      if (!isQuestionPayload(parsed)) {
        return NextResponse.json(
          { error: "Model yanıtı beklenen formatta değil." },
          { status: 502 },
        );
      }

      return NextResponse.json({ question: parsed.question.trim() });
    }

    if (action === "evaluate") {
      const company = readTrimmedString(payload, "company");
      const position = readTrimmedString(payload, "position");
      const question = readTrimmedString(payload, "question");
      const answer = readTrimmedString(payload, "answer");

      if (!company || !position || !question || !answer) {
        return NextResponse.json(
          { error: "Şirket, pozisyon, soru ve cevap gereklidir." },
          { status: 400 },
        );
      }

      const userText =
        `Bağlam — Şirket: "${company}", Pozisyon: "${position}"\n\n` +
        `Mülakat sorusu:\n${question}\n\n` +
        `Adayın cevabı:\n${answer}\n\n` +
        "Cevabı değerlendir. Güçlü yönler ve eksik noktalar maddeler halinde olsun. " +
        "İdeal cevap kısa ama örnek teşkil edecek şekilde yazılsın. " +
        "score 0 ile 100 arasında tam sayı olsun.\n\n" +
        "Yanıtı yalnızca şu JSON yapısında ver:\n" +
        '{"feedback":{"strengths":["..."],"weaknesses":["..."],"ideal_answer":"...","score":0}}';

      let raw: string;
      try {
        raw = await generateJsonText(genAI, userText, 0.4);
      } catch (e) {
        if (e instanceof Error && e.message === "empty_response") {
          return NextResponse.json({ error: "Model boş yanıt döndü." }, { status: 502 });
        }
        throw e;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromAssistant(raw);
      } catch {
        return NextResponse.json({ error: "Model yanıtı işlenemedi." }, { status: 502 });
      }

      if (!isFeedbackPayload(parsed)) {
        return NextResponse.json(
          { error: "Model yanıtı beklenen formatta değil." },
          { status: 502 },
        );
      }

      return NextResponse.json({ feedback: parsed.feedback });
    }

    if (action === "analyze-cv") {
      const cv = readTrimmedString(payload, "cv");
      if (!cv) {
        return NextResponse.json(
          { error: "CV metni boş bırakılamaz." },
          { status: 400 },
        );
      }

      const userText =
        `Aşağıdaki CV'yi Türk iş piyasası standartlarına göre analiz et:\n\n${cv}\n\n` +
        "Yanıtı yalnızca şu JSON yapısında ver:\n" +
        '{"strengths":["..."],"weaknesses":["..."],"missing":["..."],"score":0,"summary":"..."}';

      const raw = await generateJsonText(genAI, userText, 0.4);
      const parsed = parseJsonFromAssistant(raw);
      return NextResponse.json({ result: parsed });
    }

    
      if (action === "parse-pdf") {
        const base64 = readTrimmedString(payload, "base64");
        if (!base64) {
          return NextResponse.json({ error: "PDF verisi boş." }, { status: 400 });
        }
        const { extractText } = await import("unpdf");
        const buffer = Buffer.from(base64, "base64");
        const { text } = await extractText(new Uint8Array(buffer));
        return NextResponse.json({ text });
      }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: mapGeminiError(err) }, { status: 502 });
  }
}