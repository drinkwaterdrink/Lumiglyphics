import { splitTopLevelCsv, parseWeightedGroup, validateAndRepairDelimiters } from "../inlay-prompt/index.js";

const CLOTHING_TAG_REGEX = /\b(?:clothes|clothing|attire|outfit|uniform|dress(?:es)?|sundress(?:es)?|skirt(?:s)?|shirt(?:s)?|t-?shirt(?:s)?|tee-?shirt(?:s)?|sweatshirt(?:s)?|blouse(?:s)?|sweater(?:s)?|cardigan(?:s)?|jacket(?:s)?|coat(?:s)?|hoodie(?:s)?|vest(?:s)?|suit(?:s)?|robe(?:s)?|kimono(?:s)?|yukata|hanfu|gi|pants|trousers|jeans|shorts|leggings|tights|pantyhose|socks?|stockings?|shoes?|boots?|sneakers?|heels?|sandals?|gloves?|hat(?:s)?|cap(?:s)?|hood(?:s)?|scarf|scarves|tie(?:s)?|necktie(?:s)?|ribbon(?:s)?|(?:hair\s*)?bows?(?!\s*[-]?\s*(?:shaped|lips|mouth))|collar(?:s)?|apron(?:s)?|swimsuit(?:s)?|bikini(?:s)?|pajamas?|leotard(?:s)?|bodysuit(?:s)?|armor|armour|breastplate(?:s)?|cloak(?:s)?|cape(?:s)?)\b/i;

export function isClothingTag(tag: string): boolean {
  if (/\b(?:bow[- ]shaped|cupid(?:'s)?\s+bow|lips?|mouth)\b/i.test(tag)) {
    return false;
  }
  const normalized = tag.toLowerCase().replace(/_/g, " ");
  return CLOTHING_TAG_REGEX.test(normalized);
}

export function cleanClothingFromPhrase(phrase: string): string {
  const match = phrase.match(/^(.*?)\s+\b(?:wearing|dressed in|clad in|sporting)\s+(.+)$/i);
  if (match && match[1] && match[2]) {
    const clothingPart = match[2];
    if (isClothingTag(clothingPart)) {
      return match[1].trim();
    }
  }
  return phrase;
}

export function applyAttireOverride(baseIdentity: string, newAttire: string): string {
  const trimmedAttire = newAttire.trim();
  if (!trimmedAttire && !baseIdentity.trim()) return "";
  if (!baseIdentity.trim()) return trimmedAttire;

  const tags = splitTopLevelCsv(baseIdentity);
  const physicalTags: string[] = [];

  for (const tag of tags) {
    const parsed = parseWeightedGroup(tag);
    if (parsed) {
      const surviving: string[] = [];
      for (const item of parsed.items) {
        const cleaned = cleanClothingFromPhrase(item);
        if (cleaned && !isClothingTag(cleaned)) {
          surviving.push(cleaned);
        }
      }
      if (surviving.length > 0) {
        if (parsed.type === "comfy") {
          physicalTags.push(`(${surviving.join(", ")}:${parsed.weight})`);
        } else {
          physicalTags.push(`${parsed.prefix}${surviving.join(", ")}${parsed.suffix}`);
        }
      }
      continue;
    }

    const cleanedTag = cleanClothingFromPhrase(tag);
    if (cleanedTag && !isClothingTag(cleanedTag)) {
      physicalTags.push(cleanedTag);
    }
  }

  const combined = trimmedAttire ? [...physicalTags, trimmedAttire].join(", ") : physicalTags.join(", ");
  return validateAndRepairDelimiters(combined);
}

