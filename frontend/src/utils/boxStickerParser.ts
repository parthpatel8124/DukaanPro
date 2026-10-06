export interface ParsedBoxSticker {
  brand?: string;
  modelName?: string;
  color?: string;
  ram?: string;
  storage?: string;
  imei1?: string;
  imei2?: string;
  serialNumber?: string;
  barcode?: string;
  rawText?: string;
}

/**
 * Clean common OCR misread characters in 15-digit IMEI candidates
 */
function cleanOcrImei(candidate: string): string {
  let cleaned = candidate
    .replace(/[O|o|D]/g, '0')
    .replace(/[I|l|i|\|]/g, '1')
    .replace(/[Z|z]/g, '2')
    .replace(/[S|s]/g, '5')
    .replace(/[B]/g, '8')
    .replace(/[q|g]/g, '9')
    .replace(/\D/g, '');
  return cleaned;
}

/**
 * Advanced Multi-Brand Box Sticker Text Parser
 */
export function parseBoxStickerText(text: string): ParsedBoxSticker {
  const result: ParsedBoxSticker = { rawText: text };
  if (!text) return result;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const normalizedText = text.replace(/\s+/g, ' ');

  // 1. Extract ALL 15-digit IMEIs
  const rawImeis: string[] = [];

  // Match labelled IMEIs (IMEI1, IMEI 1, IMEI-1, IMEI2, IMEI 2)
  const labelledImeiRegex = /(?:IMEI|MEID|TAC|SN)\s*(?:1|2|I|II)?\s*[:\-\=\.]?\s*([0-9OlIZSBgq\|\s]{15,18})/gi;
  let match: RegExpExecArray | null;
  while ((match = labelledImeiRegex.exec(text)) !== null) {
    const cleaned = cleanOcrImei(match[1]);
    if (cleaned.length === 15 && !rawImeis.includes(cleaned)) {
      rawImeis.push(cleaned);
    }
  }

  // Match unlabelled 15-digit numbers anywhere in text
  const all15DigitMatches = text.match(/\b\d{15}\b/g) || [];
  all15DigitMatches.forEach(num => {
    const cleaned = cleanOcrImei(num);
    if (cleaned.length === 15 && !rawImeis.includes(cleaned)) {
      rawImeis.push(cleaned);
    }
  });

  // Extract from normalized text digits sequence
  const fallbackDigits = text.replace(/[^0-9]/g, '');
  for (let i = 0; i <= fallbackDigits.length - 15; i += 15) {
    const chunk = fallbackDigits.slice(i, i + 15);
    if (chunk.length === 15 && (chunk.startsWith('86') || chunk.startsWith('35') || chunk.startsWith('861') || chunk.startsWith('354') || chunk.startsWith('359'))) {
      if (!rawImeis.includes(chunk)) {
        rawImeis.push(chunk);
      }
    }
  }

  if (rawImeis.length > 0) {
    result.imei1 = rawImeis[0];
    if (rawImeis.length > 1 && rawImeis[1] !== rawImeis[0]) {
      result.imei2 = rawImeis[1];
    }
  }

  // 2. Extract Color
  const colorPrefixMatch = normalizedText.match(/(?:Color|Colour|Hue)\s*[:\-\=]\s*([A-Za-z0-9\s]+?)(?=\s*(?:IMEI|RAM|ROM|S\/N|Date|Model|Checker|Storage|GB|TB|$))/i);
  if (colorPrefixMatch) {
    result.color = colorPrefixMatch[1].trim();
  } else {
    // Search common color keywords
    const commonColors = [
      'Sea Blue', 'Midnight Black', 'Natural Titanium', 'Blue Titanium', 'Black Titanium',
      'White Titanium', 'Titanium Gray', 'Titanium Black', 'Emerald Green', 'Mint Green',
      'Space Gray', 'Starlight', 'Pearl White', 'Navy Blue', 'Deep Purple', 'Cosmic Black',
      'Sunset Orange', 'Forest Green', 'Ice Blue', 'Silver', 'Gold', 'Black', 'Blue',
      'White', 'Green', 'Purple', 'Yellow', 'Red', 'Gray', 'Grey'
    ];
    for (const c of commonColors) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(normalizedText)) {
        result.color = c;
        break;
      }
    }
  }

  // 3. Extract RAM & Storage
  const ramRomMatch = normalizedText.match(/(?:RAM|Memory)\s*[:\-\=]?\s*(\d+\s*GB)\s*(?:ROM|Storage)?\s*[:\-\=]?\s*(\d+\s*GB|\d+\s*TB)/i);
  if (ramRomMatch) {
    result.ram = ramRomMatch[1].trim();
    result.storage = ramRomMatch[2].trim();
  } else {
    const slashMem = normalizedText.match(/(\d+\s*GB)\s*[\/\+\\]\s*(\d+\s*GB|\d+\s*TB)/i);
    if (slashMem) {
      result.ram = slashMem[1].trim();
      result.storage = slashMem[2].trim();
    } else {
      const storageMatch = normalizedText.match(/(\d+\s*GB|\d+\s*TB)/i);
      if (storageMatch) {
        result.storage = storageMatch[1].trim();
      }
    }
  }

  // 4. Extract Brand & Model Name
  const brandRegex = /\b(realme|Xiaomi|Redmi|Samsung|Vivo|Oppo|OnePlus|Apple|iPhone|Motorola|Poco|Tecno|Infinix|iQOO|Nothing|Google|Honor|Lava|Nokia|Sony|Asus)\b/i;
  const brandMatch = normalizedText.match(brandRegex);
  if (brandMatch) {
    result.brand = brandMatch[1];
  }

  const modelPrefixMatch = normalizedText.match(/(?:Model|Device|Product|Item)\s*[:\-\=]\s*([A-Za-z0-9\s\+\-]+?)(?=\s*(?:Color|RAM|IMEI|S\/N|Date|GB|$))/i);
  if (modelPrefixMatch) {
    result.modelName = modelPrefixMatch[1].trim();
  } else if (result.brand) {
    const brandModelRegex = new RegExp(`(?:${result.brand})\\s+([A-Za-z0-9\\s\\+\\-]{2,30}?)(?=\\s*(?:Mobile|Color|RAM|IMEI|S\\/N|GB|$))`, 'i');
    const bmMatch = normalizedText.match(brandModelRegex);
    if (bmMatch) {
      result.modelName = `${result.brand} ${bmMatch[1].trim()}`;
    }
  }

  // Fallback Model Name from top non-empty line
  if (!result.modelName && lines.length > 0) {
    const candidateLine = lines.find(l => !l.toLowerCase().includes('imei') && !l.toLowerCase().includes('s/n') && l.length > 3);
    if (candidateLine) {
      result.modelName = candidateLine;
    }
  }

  // 5. Extract Serial Number S/N
  const snMatch = normalizedText.match(/(?:S\/N|Serial|SN)\s*[:\-\=]\s*([A-Za-z0-9]+)/i);
  if (snMatch) {
    result.serialNumber = snMatch[1].trim();
  }

  return result;
}
