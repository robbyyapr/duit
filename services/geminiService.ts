import { GoogleGenAI, Type } from "@google/genai";

// Ensure API_KEY is set in your environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("Gemini API key not found. OCR parsing will be disabled.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

export interface ParsedReceiptField<T> {
  value: T | null;
  confidence: number; // 0 to 1
}

export interface ParsedReceipt {
  amount: ParsedReceiptField<number>;
  date: ParsedReceiptField<string>; // YYYY-MM-DD
  time: ParsedReceiptField<string>; // HH:mm
  merchant: ParsedReceiptField<string>;
  error?: string;
}

const parseReceipt = async (ocrText: string): Promise<ParsedReceipt> => {
  if (!API_KEY) {
    // Return a structured error if API key is missing
     return {
        amount: { value: null, confidence: 0 },
        date: { value: null, confidence: 0 },
        time: { value: null, confidence: 0 },
        merchant: { value: null, confidence: 0 },
        error: "Gemini API key is not configured. OCR feature is disabled."
    };
  }
  
  const prompt = `
    You are an expert financial assistant specializing in parsing Indonesian retail and service receipts.
    Analyze the provided OCR text and extract the merchant name, date, time, and the final total amount.
    Provide a confidence score from 0.0 (no confidence) to 1.0 (very high confidence) for each field.

    **CRITICAL INSTRUCTIONS:**
    1.  **Merchant Name**: Usually at the top. Common names: Indomaret, Alfamart, Gojek, Grab, McDonald's, KFC, Tokopedia, Shopee, Circle K, etc. If no clear name is found, use the most likely store title. If totally unclear, return null for the value.
    2.  **Date**: Look for formats like DD/MM/YYYY, DD-MM-YY, YYYY.MM.DD, DD MMM YYYY. Always convert the output to **YYYY-MM-DD**. If no date is found, you should return null for the value.
    3.  **Time**: Find HH:mm or HH.mm patterns. Output must be **HH:mm**. If no time is found, return null for the value.
    4.  **Total Amount**: This is the most important field. Find the FINAL amount the customer paid.
        *   Prioritize keywords: "TOTAL", "GRAND TOTAL", "JUMLAH", "TAGIHAN", "TOTAL BAYAR".
        *   The total is almost always the largest number and located at the bottom of the receipt.
        *   IGNORE any sub-totals, item prices, or change ("KEMBALI") amounts.
        *   IGNORE thousands separators (like '.' or ',') and currency symbols ('Rp'). For example, "Rp 123.456" must be parsed as 123456.
        *   If there are "DISKON" (discount) or "PPN" (tax) lines, ensure you are extracting the FINAL total *after* all calculations. If you see 'CASH' and 'CHANGE'/'KEMBALI', the total is the value before them.
    5.  **Confidence Score Rules**:
        *   **High (0.9-1.0)**: The value is next to a clear keyword (e.g., "TOTAL Rp 50.000").
        *   **Medium (0.6-0.8)**: The value is inferred from its position (e.g., largest number at the bottom) but lacks a strong keyword.
        *   **Low (0.1-0.5)**: The value is a pure guess from ambiguous text.
        *   **Zero (0.0)**: The value could not be determined at all, and the value is null.
    6.  **Output Format**: Respond ONLY with a valid JSON object matching the schema. Do not add any text, explanations, or markdown formatting before or after the JSON. If a value cannot be found, the "value" field in the JSON should be null.

    **OCR Text to Analyze:**
    ---
    ${ocrText}
    ---
  `;

  const fieldSchema = (type: Type, description: string) => ({
    type: Type.OBJECT,
    properties: {
      value: { type, description: description },
      confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" },
    },
    required: ['value', 'confidence']
  });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      amount: fieldSchema(Type.NUMBER, "The total transaction amount as a number."),
      date: fieldSchema(Type.STRING, "The date in YYYY-MM-DD format."),
      time: fieldSchema(Type.STRING, "The time in HH:mm format."),
      merchant: fieldSchema(Type.STRING, "The merchant's name."),
    },
    required: ['amount', 'date', 'time', 'merchant']
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonString = response.text;
    const parsedJson = JSON.parse(jsonString);

    if (!parsedJson.amount || !parsedJson.date || !parsedJson.merchant || !parsedJson.time) {
        throw new Error("AI response is missing required fields.");
    }

    return parsedJson as ParsedReceipt;

  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    return {
        amount: { value: null, confidence: 0 },
        date: { value: null, confidence: 0 },
        time: { value: null, confidence: 0 },
        merchant: { value: null, confidence: 0 },
        error: "Gagal memproses struk. Gambar mungkin tidak jelas atau terjadi kesalahan jaringan. Silakan coba lagi atau masukkan data secara manual."
    };
  }
};

const geminiService = { parseReceipt };
export default geminiService;
