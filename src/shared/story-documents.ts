import {z} from 'zod';

export const STORY_DOCUMENT_KINDS = [
  'flyer',
  'letter',
  'note',
  'journal',
  'map',
  'poster',
  'receipt',
  'notice',
  'newspaper',
  'pamphlet',
  'phone',
  'terminal',
] as const;
export type StoryDocumentKind = (typeof STORY_DOCUMENT_KINDS)[number];

const DocumentIdentitySchema=z.object({
  name:z.string().trim().min(1).max(256),
  kind:z.enum(STORY_DOCUMENT_KINDS),
  paragraphIndex:z.number().int().nonnegative(),
  aliases:z.array(z.string().trim().min(2).max(160)).max(8).optional(),
  visualDetails:z.string().trim().min(1).max(400).optional(),
}).strict();

const PassageProposalSchema=z.object({
  paragraphIndex:z.number().int().nonnegative(),
  text:z.string().min(1).max(6000),
  evidence:z.string().min(1).max(10000),
}).strict();

export const DocumentObservationSchema=z.object({
  paragraphIndex:z.number().int().nonnegative(),
  summary:z.string().trim().min(1).max(500).optional(),
  visualDetails:z.array(z.string().trim().min(1).max(160)).max(8).optional(),
  material:z.string().trim().min(1).max(120).optional(),
  condition:z.string().trim().min(1).max(120).optional(),
  evidence:z.string().min(1).max(1200),
}).strict();
export type DocumentObservation=z.infer<typeof DocumentObservationSchema>;

export const StoryDocumentSectionSchema=z.object({paragraphIndex:z.number().int().nonnegative(),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().min(1).max(6000)}).strict();
export const StoryDocumentSchema=DocumentIdentitySchema.extend({
  id:z.string().min(1).max(256),
  sections:z.array(StoryDocumentSectionSchema).max(16),
  observations:z.array(DocumentObservationSchema).max(16).optional(),
}).strict();
export type StoryDocument=z.infer<typeof StoryDocumentSchema>;

const IDIOMATIC_SURFACE_RE = /\b(?:on\s+paper|paper\s+trail|paper\s+tiger|paper\s+over|pushing\s+paper|(?:mak(?:e|es|ing)|made|tak(?:e|es|ing)|took)\s+(?:a\s+)?(?:mental\s+)?note\b|mental\s+note|side\s+note|note\s+to\s+self|note\s+of\s+(?:panic|fear|alarm|warning|sadness|hope|doubt|surprise)|letter\s+of\s+the\s+law|to\s+the\s+letter|red[- ]letter\s+day|map\s+out|on\s+the\s+map|playing\s+card|trump\s+card|short\s+notice|until\s+further\s+notice|at\s+a\s+moment'?s\s+notice|terminal\s+(?:illness|velocity|stage|station))\b/i;

export function isIdiomaticDocumentMention(paragraphText: string, start: number, end: number): boolean {
  const winStart = Math.max(0, start - 28);
  const winEnd = Math.min(paragraphText.length, end + 28);
  const snippet = paragraphText.slice(winStart, winEnd);
  return IDIOMATIC_SURFACE_RE.test(snippet);
}

/** Optional planner enrichment only identifies literal visible prose & grounded scene observations. */
export function normalizeStoryDocuments(value:unknown,paragraphs:readonly {text:string}[]):StoryDocument[]{
 if(!Array.isArray(value))return [];
 const result:StoryDocument[]=[];const seen=new Set<string>();let characters=0;
 for(const raw of value.slice(0,48)){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const {sections,observations,...identity}=raw as Record<string,unknown>;
  const parsed=DocumentIdentitySchema.safeParse(identity);
  if(!parsed.success)continue;
  const doc=parsed.data;
  const introText=paragraphs[doc.paragraphIndex]?.text;
  if(!introText||!introText.toLocaleLowerCase().includes(doc.name.toLocaleLowerCase())||seen.has(doc.name.toLocaleLowerCase()))continue;
  const passages:StoryDocument['sections']=[];
  if(Array.isArray(sections)){
   for(const item of sections.slice(0,32)){
    const p=PassageProposalSchema.safeParse(item);if(!p.success)continue;
    const s=p.data,text=paragraphs[s.paragraphIndex]?.text;
    if(!text||s.paragraphIndex<doc.paragraphIndex||!s.evidence.includes(s.text)||!s.text.trim())continue;
    const aliases=[doc.name,...(doc.aliases??[])].map(a=>a.toLocaleLowerCase());
    if(!aliases.some(a=>s.evidence.toLocaleLowerCase().includes(a)))continue;
    const evidenceStart=text.indexOf(s.evidence),inside=s.evidence.indexOf(s.text);
    if(evidenceStart<0||text.indexOf(s.evidence,evidenceStart+1)>=0||s.evidence.indexOf(s.text,inside+1)>=0)continue;
    const start=evidenceStart+inside,end=start+s.text.length;
    if(passages.some(p=>p.paragraphIndex===s.paragraphIndex&&start<p.end&&end>p.start)||characters+s.text.length>24000)continue;
    passages.push({paragraphIndex:s.paragraphIndex,start,end,text:s.text});characters+=s.text.length;
    if(passages.length===16)break;
   }
  }
  const obsList:DocumentObservation[]=[];
  if(Array.isArray(observations)){
   for(const item of observations.slice(0,16)){
    const o=DocumentObservationSchema.safeParse(item);if(!o.success)continue;
    const text=paragraphs[o.data.paragraphIndex]?.text;
    if(!text||o.data.paragraphIndex<doc.paragraphIndex||!text.includes(o.data.evidence))continue;
    obsList.push(o.data);
   }
  }
  passages.sort((a,b)=>a.paragraphIndex-b.paragraphIndex||a.start-b.start);
  seen.add(doc.name.toLocaleLowerCase());
  result.push({
   ...doc,
   id:`document-${result.length+1}`,
   sections:passages,
   ...(obsList.length?{observations:obsList}:{}),
  });
  if(result.length===12)break;
 }
 return result;
}
/** Saved records remain tied to their source offsets. Removing/editing the source
 * never resurrects an old passage; callers separately validate the owning TurnKey. */
export function validateStoryDocuments(value:unknown,paragraphs:readonly {text:string}[]):StoryDocument[]{
 if(!Array.isArray(value))return [];
 const result:StoryDocument[]=[];const ids=new Set<string>(),names=new Set<string>();let characters=0;
 for(const raw of value.slice(0,12)){
  const parsed=StoryDocumentSchema.safeParse(raw);if(!parsed.success)continue;
  const d=parsed.data;
  const introText=paragraphs[d.paragraphIndex]?.text;
  if(ids.has(d.id)||names.has(d.name.toLocaleLowerCase())||!introText||!introText.toLocaleLowerCase().includes(d.name.toLocaleLowerCase()))continue;
  const sections=d.sections.filter(s=>{
   if(s.paragraphIndex<d.paragraphIndex||s.end!==s.start+s.text.length||paragraphs[s.paragraphIndex]?.text.slice(s.start,s.end)!==s.text||characters+s.text.length>24000)return false;
   characters+=s.text.length;return true;
  });
  const observations=(d.observations??[]).filter(o=>o.paragraphIndex>=d.paragraphIndex&&Boolean(paragraphs[o.paragraphIndex]?.text.includes(o.evidence)));
  ids.add(d.id);names.add(d.name.toLocaleLowerCase());
  result.push({...d,sections,...(observations.length?{observations}:{})});
 }
 return result;
}
export function visibleStoryDocuments(documents:readonly StoryDocument[],paragraphIndex:number):StoryDocument[]{
 return documents.filter(d=>d.paragraphIndex<=paragraphIndex).map(d=>({
  ...d,
  sections:d.sections.filter(s=>s.paragraphIndex<=paragraphIndex).map(s=>({...s})),
  ...(d.observations?{observations:d.observations.filter(o=>o.paragraphIndex<=paragraphIndex).map(o=>({...o}))}:{}),
 }));
}

const DOC_MEDIA_NOUN_RE = /\b((?:crumpled|folded|damp|wet|soaked|torn|ripped|yellowed|faded|stained|sealed|handwritten|printed|laminated|weathered|tattered|creased|glowing|cracked)\s+)*(flyer|leaflet|pamphlet|brochure|handbill|poster|notice|letter|envelope|missive|note|journal|diary|ledger|logbook|manifest|receipt|ticket|voucher|parchment|scroll|map|blueprint|schematic|newspaper|gazette|datapad|terminal(?:\s+(?:screen|readout))?)\b/gi;
const DOC_MATERIAL_CUE_RE = /\b(purple\s+ink|red\s+ink|blue\s+ink|black\s+ink|faded\s+ink|smear(?:ed|ing)\s+[^.!?;,\n]+|bleed(?:s|ing)\s+across[^.!?;,\n]+|hand-drawn\s+[^.!?;,\n]+|handwritten\s+[^.!?;,\n]+|wax\s+seal|stamped|crest|sketch(?:ed)?\s+[^.!?;,\n]+|list\s+of\s+[^.!?;,\n]+|map\s+(?:of|to)\s+[^.!?;,\n]+|price\s+list)\b/gi;
const SECONDARY_PAPER_ALIAS_RE = /\b(?:the|damp|wet|crumpled|folded|torn|yellowed|faded|stained)\s+(paper|sheet|page|parchment|cardstock|slip)\b/gi;

function mapNounToDocumentKind(noun: string): StoryDocumentKind {
  const n = noun.toLowerCase();
  if (/flyer|leaflet|handbill/.test(n)) return 'flyer';
  if (/pamphlet|brochure/.test(n)) return 'pamphlet';
  if (/poster/.test(n)) return 'poster';
  if (/notice|missive/.test(n)) return 'notice';
  if (/letter|envelope/.test(n)) return 'letter';
  if (/journal|diary|ledger|logbook/.test(n)) return 'journal';
  if (/map|blueprint|schematic/.test(n)) return 'map';
  if (/receipt|ticket|voucher|manifest/.test(n)) return 'receipt';
  if (/newspaper|gazette/.test(n)) return 'newspaper';
  if (/terminal|datapad/.test(n)) return 'terminal';
  return 'note';
}

/** Deterministic fallback that detects physical story documents and visual descriptions across adjacent beats. */
export function senseDocumentsDeterministically(paragraphs: readonly { text: string }[]): StoryDocument[] {
  const detected: StoryDocument[] = [];
  const byKind = new Map<StoryDocumentKind, StoryDocument>();
  let lastDocIndex = -1;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i]?.text ?? '';
    if (!text.trim()) continue;
    DOC_MEDIA_NOUN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DOC_MEDIA_NOUN_RE.exec(text)) !== null) {
      const phrase = m[0].trim();
      const baseNoun = (m[2] ?? phrase).trim();
      const start = m.index;
      const end = start + m[0].length;
      if (isIdiomaticDocumentMention(text, start, end)) continue;
      // Avoid bare "note" unless preceded by a physical adjective or written-content context.
      if (baseNoun.toLowerCase() === 'note' && phrase.toLowerCase() === 'note' && !/\b(?:written|folded|crumpled|pinned|tucked|slipped|hand|read|scribbled)\b/i.test(text.slice(Math.max(0, start - 32), Math.min(text.length, end + 32)))) {
        continue;
      }
      // If "map" appears as a drawing/diagram smeared or printed on an active paper prop within 2 paragraphs, attach as observation rather than spawning a second doc.
      if (baseNoun.toLowerCase() === 'map' && lastDocIndex >= 0 && detected[lastDocIndex] && i - detected[lastDocIndex]!.paragraphIndex <= 2) {
        SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
        const hasSurfaceBridge = SECONDARY_PAPER_ALIAS_RE.test(text);
        SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
        if (hasSurfaceBridge || /\b(?:hand[- ]drawn|smear(?:ed|ing)|sketch(?:ed)?|printed|faded|margin|corner)\b/i.test(text.slice(Math.max(0, start - 36), Math.min(text.length, end + 24)))) {
          continue;
        }
      }
      const kind = mapNounToDocumentKind(baseNoun);
      const existing = byKind.get(kind);
      const visualMatches = [...text.matchAll(DOC_MATERIAL_CUE_RE)].map(x => x[0].trim());
      if (existing) {
        if (!existing.aliases?.some(a => a.toLowerCase() === phrase.toLowerCase()) && existing.name.toLowerCase() !== phrase.toLowerCase()) {
          existing.aliases = [...(existing.aliases ?? []), phrase].slice(0, 8);
        }
        if (visualMatches.length) {
          existing.observations = existing.observations ?? [];
          if (!existing.observations.some(o => o.paragraphIndex === i)) {
            existing.observations.push({
              paragraphIndex: i,
              summary: visualMatches.join('; ').slice(0, 480),
              visualDetails: visualMatches.slice(0, 6).map(v => v.slice(0, 150)),
              evidence: text.slice(0, 1100),
            });
          }
        }
        lastDocIndex = detected.indexOf(existing);
        continue;
      }

      const conditionMatch = phrase.match(/\b(crumpled|folded|damp|wet|soaked|torn|ripped|yellowed|faded|stained|sealed|handwritten|printed|tattered|creased|glowing|cracked)\b/i);
      const doc: StoryDocument = {
        id: `document-${detected.length + 1}`,
        name: phrase,
        kind,
        paragraphIndex: i,
        aliases: [...new Set([baseNoun, phrase].filter(s => s.length >= 3))],
        ...(visualMatches.length || conditionMatch ? {
          visualDetails: [...new Set([conditionMatch?.[0], ...visualMatches])].filter(Boolean).join(', ').slice(0, 380),
        } : {}),
        sections: [],
        observations: [{
          paragraphIndex: i,
          ...(visualMatches.length ? { summary: visualMatches.join('; ').slice(0, 480), visualDetails: visualMatches.slice(0, 6).map(v => v.slice(0, 150)) } : {}),
          ...(conditionMatch ? { condition: conditionMatch[0].toLowerCase() } : {}),
          evidence: text.slice(0, 1100),
        }],
      };
      // Also capture inline quoted text in the same paragraph if directly reading it (`"..."`).
      const quoted = text.match(/["“]([^"”]{8,400})["”]/);
      if (quoted && /\b(?:reads?|says?|printed|written|lettering|headline|text)\b/i.test(text)) {
        const qText = quoted[1]!.trim();
        const qStart = text.indexOf(qText);
        if (qStart >= 0) {
          doc.sections.push({ paragraphIndex: i, start: qStart, end: qStart + qText.length, text: qText });
        }
      }
      detected.push(doc);
      byKind.set(kind, doc);
      lastDocIndex = detected.length - 1;
      if (detected.length >= 12) return detected;
    }

    // Anaphoric bridge: "the damp paper, smearing a hand-drawn map and a list of prices" within 2 paragraphs of a document.
    if (lastDocIndex >= 0 && detected[lastDocIndex] && i - detected[lastDocIndex]!.paragraphIndex <= 2) {
      const target = detected[lastDocIndex]!;
      SECONDARY_PAPER_ALIAS_RE.lastIndex = 0;
      const paperMatch = SECONDARY_PAPER_ALIAS_RE.exec(text);
      const visualMatches = [...text.matchAll(DOC_MATERIAL_CUE_RE)].map(x => x[0].trim());
      if (paperMatch || visualMatches.length) {
        if (paperMatch) {
          const surfaceAlias = paperMatch[0].trim();
          if (surfaceAlias.length >= 4 && !target.aliases?.some(a => a.toLowerCase() === surfaceAlias.toLowerCase())) {
            target.aliases = [...(target.aliases ?? []), surfaceAlias].slice(0, 8);
          }
        }
        if (visualMatches.length) {
          target.visualDetails = [target.visualDetails, ...visualMatches].filter(Boolean).join(', ').slice(0, 380);
          target.observations = target.observations ?? [];
          if (!target.observations.some(o => o.paragraphIndex === i)) {
            target.observations.push({
              paragraphIndex: i,
              summary: visualMatches.join('; ').slice(0, 480),
              visualDetails: visualMatches.slice(0, 6).map(v => v.slice(0, 150)),
              ...(paperMatch ? { material: paperMatch[0].replace(/^the\s+/i, '').trim() } : {}),
              evidence: text.slice(0, 1100),
            });
          }
        }
      }
    }
  }
  return detected;
}

/** Merge two validated StoryDocument arrays without duplicating identical or aliased physical props. */
export function mergeStoryDocuments(
  primary: readonly StoryDocument[],
  secondary: readonly StoryDocument[],
): StoryDocument[] {
  const merged: StoryDocument[] = primary.map((doc) => ({
    ...doc,
    sections: doc.sections.map((s) => ({ ...s })),
    ...(doc.aliases ? { aliases: [...doc.aliases] } : {}),
    ...(doc.observations ? { observations: doc.observations.map((o) => ({ ...o })) } : {}),
  }));

  const findMatch = (candidate: StoryDocument): StoryDocument | undefined => {
    const names = new Set([candidate.name, ...(candidate.aliases ?? [])].map((s) => s.toLowerCase()));
    for (const existing of merged) {
      const existingNames = [existing.name, ...(existing.aliases ?? [])].map((s) => s.toLowerCase());
      if (existingNames.some((n) => names.has(n))) return existing;
      if (existing.kind === candidate.kind && Math.abs(existing.paragraphIndex - candidate.paragraphIndex) <= 1) {
        return existing;
      }
    }
    return undefined;
  };

  for (const extra of secondary) {
    const match = findMatch(extra);
    if (!match) {
      if (merged.length < 12) {
        merged.push({
          ...extra,
          id: `document-${merged.length + 1}`,
          sections: extra.sections.map((s) => ({ ...s })),
          ...(extra.aliases ? { aliases: [...extra.aliases] } : {}),
          ...(extra.observations ? { observations: extra.observations.map((o) => ({ ...o })) } : {}),
        });
      }
      continue;
    }

    const aliasSet = new Set([match.name, ...(match.aliases ?? [])].map((a) => a.toLowerCase()));
    const newAliases = [extra.name, ...(extra.aliases ?? [])].filter((a) => {
      const lower = a.toLowerCase();
      if (aliasSet.has(lower)) return false;
      aliasSet.add(lower);
      return true;
    });
    if (newAliases.length) {
      match.aliases = [...(match.aliases ?? []), ...newAliases].slice(0, 8);
    }
    if (!match.visualDetails && extra.visualDetails) {
      match.visualDetails = extra.visualDetails;
    }
    if (extra.observations?.length) {
      match.observations = match.observations ?? [];
      for (const obs of extra.observations) {
        if (!match.observations.some((o) => o.paragraphIndex === obs.paragraphIndex)) {
          match.observations.push({ ...obs });
        }
      }
    }
    for (const sec of extra.sections) {
      if (!match.sections.some((s) => s.paragraphIndex === sec.paragraphIndex && s.text === sec.text)) {
        match.sections.push({ ...sec });
      }
    }
  }

  return merged;
}
