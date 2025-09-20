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
    You are an intelligent receipt parsing engine specializing in Indonesian receipts.
    Analyze the following OCR text from a receipt and extract the merchant name, date, time, and total amount.
    Provide a confidence score (0.0 to 1.0) for each extracted field.

    **Instructions & Heuristics:**
    1.  **Merchant Name**: Usually located at the top of the receipt. It might be a well-known brand (e.g., Indomaret, Alfamart, Gojek, Grab, McDonald's) or a local store name. Confidence should be high if it's a known brand.
    2.  **Date**: Look for patterns like DD/MM/YYYY, DD-MM-YY, YYYY.MM.DD. Always convert the final output to **YYYY-MM-DD** format. If the year is ambiguous (e.g., '24'), assume the current century (2024). Confidence depends on how clear the date format is.
    3.  **Time**: Look for patterns like HH:mm or HH.mm. The format should be **HH:mm**.
    4.  **Total Amount**: This is the most critical field. Look for keywords like "TOTAL", "GRAND TOTAL", "JUMLAH", "TAGIHAN", "TUNAI". It's often the largest numerical value on the receipt. The currency is Indonesian Rupiah (IDR). Ignore thousands separators (e.g., '.', ',') and currency symbols ('Rp'). For example, "Rp 33.500" should be parsed as 33500.
    5.  **Confidence Score**: Base your confidence score on the clarity of the OCR text and the presence of clear keywords. For example, if you see "TOTAL Rp 50.000", the amount confidence should be very high (e.g., 0.98). If you are guessing based on the largest number without a keyword, the confidence should be lower (e.g., 0.7).
    6.  **Null Values**: If you cannot find a value for any field, set its "value" to null and "confidence" to 0.0.

    Respond ONLY with a valid JSON object matching the specified schema. Do not include any explanations or markdown formatting.

    **OCR Text:**
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
        error: "Failed to parse receipt data from AI. Please check your network or try again."
    };
  }
};

const geminiService = { parseReceipt };
export default geminiService;
