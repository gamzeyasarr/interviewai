import Groq from "groq-sdk";
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

const GROQ_MODEL = "llama-3.3-70b-versatile";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function readTrimmedString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY?.trim();

  if (process.env.NODE_ENV !== "production") {
    const masked = key && key.length >= 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "(too short)";
    console.log("[/api/interview] GROQ_API_KEY", {
      isDefined: !!key,
      length: key?.length ?? 0,
      masked,
    });
  }

  if (!key) return null;
  return new Groq({ apiKey: key });
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

function mapGroqError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const status = typeof o.status === "number" ? o.status : undefined;
    const message = typeof o.message === "string" ? o.message : "";
    if (status === 429 || /429|quota|rate.?limit|too many/i.test(message)) {
      return "Istek kotasi doldu. Bir sure bekleyip tekrar deneyin.";
    }
    if (status === 401 || status === 403 || /401|403|invalid.*key|unauthorized/i.test(message)) {
      return "API anahtari gecersiz. Ortam degiskenlerini kontrol edin.";
    }
    if (status === 503 || /503|unavailable|overloaded/i.test(message)) {
      return "Yapay zeka servisi gecici olarak kullaниlamıyor.";
    }
  }
  return "Yapay zeka yaniti alinamadi. Lutfen tekrar deneyin.";
}

async function generateJsonText(
  groq: Groq,
  userText: string,
  temperature: number,
  history: ConversationMessage[] = [],
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_BASE },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userText },
  ];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  if (!raw.trim()) throw new Error("empty_response");
  return raw;
}

export async function POST(request: Request) {
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "Sunucu yapilandirmasi eksik: GROQ_API_KEY tanimli degil." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gecersiz istek govdesi." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload["action"];
  if (typeof action !== "string") {
    return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
  }

  try {
    if (action === "question") {
      const company = readTrimmedString(payload, "company");
      const position = readTrimmedString(payload, "position");
      const difficulty = readTrimmedString(payload, "difficulty") || "orta";
      const category = readTrimmedString(payload, "category") || "davranissal";
      const history = Array.isArray(payload["history"])
        ? (payload["history"] as ConversationMessage[])
        : [];

      if (!company || !position) {
        return NextResponse.json(
          { error: "Sirket adi ve pozisyon bos birakilamaz." },
          { status: 400 },
        );
      }

      const userText =
        `Sirket: "${company}"\nPozisyon: "${position}"\nZorluk: "${difficulty}"\nKategori: "${category}"\n\n` +
        `Bu sirkete gercek bir mulakatta sorulabilecek, ` +
        `zorluk seviyesi "${difficulty}" ve kategorisi "${category}" olan TEK bir soru uret.\n` +
        `Daha once sorulmus sorulardan FARKLI bir soru sec.\n` +
        `Teknik: kod, sistem, algoritma sorulari.\n` +
        `Davranissal: gecmis deneyim ve yetkinlik sorulari.\n` +
        `Stres: baski altinda karar verme sorulari.\n` +
        `Soru ozgun, sirkete ozel ve gercekci olsun.\n\n` +
        'Yaniti yalnizca su JSON nesnesi olarak ver: {"question":"..."}';

      let raw: string;
      try {
        raw = await generateJsonText(groq, userText, 0.7, history);
      } catch (e) {
        if (e instanceof Error && e.message === "empty_response") {
          return NextResponse.json({ error: "Model bos yanit dondu." }, { status: 502 });
        }
        throw e;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromAssistant(raw);
      } catch {
        return NextResponse.json({ error: "Model yaniti islenemedi." }, { status: 502 });
      }

      if (!isQuestionPayload(parsed)) {
        return NextResponse.json(
          { error: "Model yaniti beklenen formatta degil." },
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
          { error: "Sirket, pozisyon, soru ve cevap gereklidir." },
          { status: 400 },
        );
      }

      const userText =
        `Baglam - Sirket: "${company}", Pozisyon: "${position}"\n\n` +
        `Mulakat sorusu:\n${question}\n\n` +
        `Adayin cevabi:\n${answer}\n\n` +
        "Cevabi degerlendir. Guclu yonler ve eksik noktalar maddeler halinde olsun. " +
        "Ideal cevap kisa ama ornek teskil edecek sekilde yazilsin. " +
        "score 0 ile 100 arasinda tam sayi olsun.\n\n" +
        "Yaniti yalnizca su JSON yapisinda ver:\n" +
        '{"feedback":{"strengths":["..."],"weaknesses":["..."],"ideal_answer":"...","score":0}}';

      let raw: string;
      try {
        raw = await generateJsonText(groq, userText, 0.4);
      } catch (e) {
        if (e instanceof Error && e.message === "empty_response") {
          return NextResponse.json({ error: "Model bos yanit dondu." }, { status: 502 });
        }
        throw e;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromAssistant(raw);
      } catch {
        return NextResponse.json({ error: "Model yaniti islenemedi." }, { status: 502 });
      }

      if (!isFeedbackPayload(parsed)) {
        return NextResponse.json(
          { error: "Model yaniti beklenen formatta degil." },
          { status: 502 },
        );
      }

      return NextResponse.json({ feedback: parsed.feedback });
    }

    if (action === "analyze-cv") {
      const cv = readTrimmedString(payload, "cv");
      if (!cv) {
        return NextResponse.json(
          { error: "CV metni bos birakilamaz." },
          { status: 400 },
        );
      }

      const userText =
        `Asagidaki CV'yi Turk is piyasasi standartlarina gore analiz et:\n\n${cv}\n\n` +
        "Yaniti yalnizca su JSON yapisinda ver:\n" +
        '{"strengths":["..."],"weaknesses":["..."],"missing":["..."],"score":0,"summary":"..."}';

      let raw: string;
      try {
        raw = await generateJsonText(groq, userText, 0.4);
      } catch (e) {
        if (e instanceof Error && e.message === "empty_response") {
          return NextResponse.json({ error: "Model bos yanit dondu." }, { status: 502 });
        }
        throw e;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonFromAssistant(raw);
      } catch {
        return NextResponse.json({ error: "Model yaniti islenemedi." }, { status: 502 });
      }

      return NextResponse.json({ result: parsed });
    }

    if (action === "parse-pdf") {
      const base64 = readTrimmedString(payload, "base64");
      if (!base64) {
        return NextResponse.json({ error: "PDF verisi bos." }, { status: 400 });
      }
      try {
        const { extractText } = await import("unpdf");
        const buffer = Buffer.from(base64, "base64");
        const { text } = await extractText(new Uint8Array(buffer));
        return NextResponse.json({ text });
      } catch (e) {
        console.error("[parse-pdf]", e);
        return NextResponse.json(
          { error: "PDF okunamadi. Dosyanin gecerli oldugunden emin olun." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Gecersiz islem." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: mapGroqError(err) }, { status: 502 });
  }
}