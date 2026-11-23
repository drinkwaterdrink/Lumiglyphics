import type { SpindleAPI } from "lumiverse-spindle-types";
import {
  createItemId, createLocationId, findMatchingItem, findMatchingLocation,
  ItemDNASchema, LocationDNASchema, ITEM_AUTOFILL_FIELDS, LOCATION_AUTOFILL_FIELDS,
  type ItemDNA, type LocationDNA, type StoryAutofillField, type StoryAutofillProposal, type StoryDnaRequest,
} from "../../shared/story-dna.js";
import type { ReadingPosition } from "../../shared/reading-position.js";
import { sameLoreSource } from "./story-dna-projection.js";
import { targetDnaPassages } from "./character-dna-autofill.js";
import { autofillItemDNA, autofillLocationDNA } from "./story-dna-harvester.js";
import { loadStoryDNASet, mutateStoryDNASet } from "./story-dna-store.js";

type ReviewRequest = Extract<StoryDnaRequest, { action: "review_autofill" | "apply_autofill" }>;
export type ReadAutofillScope = (position: ReadingPosition) => Promise<readonly string[]>;

type Review = {
  position: ReadingPosition;
  expires: number;
  pending?: boolean;
  proposal?: StoryAutofillProposal;
  target?: { kind: "place" | "object"; id: string; base?: LocationDNA | ItemDNA | undefined };
};

const sessions = new WeakMap<SpindleAPI, Map<string, Review>>();
const REVIEW_MS = 5 * 60_000;

function changesFor<RecordType>(
  base: RecordType | undefined, proposed: RecordType, fields: readonly (keyof RecordType & StoryAutofillField)[],
): StoryAutofillProposal["changes"] {
  return fields.flatMap(field => {
    const before = (base?.[field] ?? null) as string | string[] | null;
    const after = proposed[field];
    if ((!Array.isArray(after) && typeof after !== "string") || JSON.stringify(before) === JSON.stringify(after)
      || after.length === 0) return [];
    return [{ field, before, after }];
  });
}

export async function reviewStoryAutofill(
  spindle: SpindleAPI, request: ReviewRequest, userId: string, readScope: ReadAutofillScope,
): Promise<StoryAutofillProposal | undefined> {
  const { readingPosition: position, chatId } = request;
  if (position.key.chatId !== chatId) throw new Error("This autofill request belongs to another chat.");
  let reviews = sessions.get(spindle);
  if (!reviews) {
    reviews = new Map();
    sessions.set(spindle, reviews);
  }
  const key = JSON.stringify([userId, chatId]);
  if (request.action === "review_autofill") {
    const now = Date.now();
    for (const [owner, review] of reviews) if (review.expires <= now) reviews.delete(owner);
    if (reviews.size >= 128 && !reviews.has(key)) {
      const oldest = reviews.keys().next().value;
      if (oldest !== undefined) reviews.delete(oldest);
    }
    const review: Review = { position, expires: now + REVIEW_MS };
    reviews.set(key, review);
    try {
      const paragraphs = await readScope(position);
      const set = await loadStoryDNASet(spindle, chatId, userId);
      const locations = request.kind === "place";
      const records = locations ? set.locations : set.items;
      const existing = request.targetId
        ? (Object.hasOwn(records, request.targetId) ? records[request.targetId] : undefined)
        : (locations ? findMatchingLocation(set.locations, request.name) : findMatchingItem(set.items, request.name));
      const candidateId = locations ? createLocationId(request.name) : createItemId(request.name);
      const id = existing?.id ?? request.targetId ?? candidateId;
      const deleted = locations ? set.deletedLocations : set.deletedItems;
      if ((!existing && request.targetId && id !== candidateId) || (deleted && Object.hasOwn(deleted, id))) {
        throw new Error("This entry changed or was deleted. Reopen it before running autofill.");
      }
      if (existing?.locked) throw new Error("Unlock this entry before running autofill.");
      const name = existing?.name ?? request.name;
      const evidence = [...new Set(paragraphs.flatMap(text => targetDnaPassages(text, [name, ...(existing?.aliases ?? [])])))].slice(-8);
      if (!evidence.length) throw new Error("No revealed passage mentions this entry yet.");
      const params = {
        chatId, userId, revealedEvidence: evidence,
        set: {
          revision: set.revision,
          locations: locations && existing ? { [id]: existing as LocationDNA } : {},
          items: !locations && existing ? { [id]: existing as ItemDNA } : {},
        },
      };
      const changes = locations
        ? changesFor(existing as LocationDNA | undefined,
          await autofillLocationDNA(spindle, { ...params, locationId: id, locationName: name }), LOCATION_AUTOFILL_FIELDS)
        : changesFor(existing as ItemDNA | undefined,
          await autofillItemDNA(spindle, { ...params, itemId: id, itemName: name }), ITEM_AUTOFILL_FIELDS);
      if (reviews.get(key) !== review) throw new Error("A newer autofill review replaced this request.");
      await readScope(position);
      if (reviews.get(key) !== review) throw new Error("A newer autofill review replaced this request.");
      const proposal = { id: request.requestId, name, paragraphIndex: position.paragraphIndex, evidence, changes };
      review.proposal = proposal;
      review.target = { kind: request.kind, id, base: existing };
      return proposal;
    } catch (error) {
      if (reviews.get(key) === review) reviews.delete(key);
      throw error;
    }
  }

  const review = reviews.get(key);
  if (!review?.target || !review.proposal || review.proposal.id !== request.proposalId || review.expires <= Date.now()) {
    throw new Error("This autofill review expired. Run autofill again.");
  }
  if (review.pending) throw new Error("The selected fields are already saving.");
  if (!sameLoreSource(position.key, review.position.key) || position.paragraphIndex !== review.position.paragraphIndex) {
    throw new Error("The reading position changed. Run autofill again from this passage.");
  }
  const selected = review.proposal.changes.filter(change => request.fields.includes(change.field));
  if (selected.length !== request.fields.length) throw new Error("Choose fields from this autofill review.");
  const { kind, id, base } = review.target;
  const name = review.proposal.name;
  review.pending = true;
  try {
    await mutateStoryDNASet(spindle, chatId, userId, undefined, async set => {
      await readScope(position);
      if (reviews.get(key) !== review) throw new Error("A newer autofill review replaced this request.");
      if (review.expires <= Date.now()) throw new Error("This autofill review expired. Run autofill again.");
      const places = kind === "place";
      const records = places ? set.locations : set.items;
      const deleted = places ? set.deletedLocations : set.deletedItems;
      const current = Object.hasOwn(records, id) ? records[id] : undefined;
      if ((!base && current) || (base && (!current || current.name !== base.name || current.locked))
        || (deleted && Object.hasOwn(deleted, id))) {
        throw new Error("This entry changed, was locked, or was removed. Your selections are still open.");
      }
      for (const change of selected) {
        const value = (current as Partial<Record<StoryAutofillField, unknown>> | undefined)?.[change.field] ?? null;
        if (JSON.stringify(value) !== JSON.stringify(change.before)) {
          throw new Error("A selected field changed since autofill ran. Your selections are still open.");
        }
      }
      const updates = Object.fromEntries(selected.map(change => [change.field, change.after]));
      const merged = { id, name, ...(places ? {} : { description: name }), ...current, ...updates,
        autoDiscovered: false, lastUpdated: Date.now() };
      if (places) set.locations[id] = LocationDNASchema.parse(merged);
      else set.items[id] = ItemDNASchema.parse(merged);
    });
    if (reviews.get(key) === review) reviews.delete(key);
  } finally {
    review.pending = false;
  }
  return undefined;
}
