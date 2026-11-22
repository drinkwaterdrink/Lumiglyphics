import {BUFFERED_TTS_TIMING} from './transport.js';
import type {SpeechCursor} from './controller.js';
export type SpeechTimingCapability='none'|'sentence'|'word';
export type SpeechPlaybackCursor=Pick<SpeechCursor,'chatId'|'messageId'|'sourceFingerprint'|'paragraphIndex'> & {swipeId:number;revision:number};
/** Buffered audio has a media clock, but no evidence mapping time to text offsets. */
export type SpeechPlaybackProgress={cursor:SpeechPlaybackCursor;elapsedSeconds:number;durationSeconds:number|null;timing:'none'};
export function speechPlaybackProgress(cursor:SpeechCursor,elapsed:number,duration?:number):SpeechPlaybackProgress{
 const knownDuration=typeof duration==='number'&&Number.isFinite(duration)&&duration>0?duration:null;
 const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
 return {cursor:{chatId:cursor.chatId,messageId:cursor.messageId,sourceFingerprint:cursor.sourceFingerprint,paragraphIndex:cursor.paragraphIndex,swipeId:cursor.swipeId??0,revision:cursor.revision??0},elapsedSeconds:knownDuration===null?time:Math.min(time,knownDuration),durationSeconds:knownDuration,timing:BUFFERED_TTS_TIMING};
}
export function progressForCursor(progress:SpeechPlaybackProgress|null,cursor:SpeechCursor|null):SpeechPlaybackProgress|null{
 if(!progress||!cursor)return null;const key=progress.cursor;
 return key.chatId===cursor.chatId&&key.messageId===cursor.messageId&&key.sourceFingerprint===cursor.sourceFingerprint&&key.paragraphIndex===cursor.paragraphIndex&&key.swipeId===(cursor.swipeId??0)&&key.revision===(cursor.revision??0)?progress:null;
}
export function audioProgressFraction(progress:SpeechPlaybackProgress):number|null{return progress.durationSeconds===null?null:Math.max(0,Math.min(1,progress.elapsedSeconds/progress.durationSeconds));}

type WordSpanRef = {
  node: Text;
  start: number;
  end: number;
  cumStart: number;
  cumEnd: number;
  index: number;
};

/**
 * Non-destructive word-by-word highlight & auto-scroll engine.
 * Never splits, wraps or replaces prose/anchors/selection inside `target`;
 * uses DOM Ranges, the CSS Custom Highlight API (`::highlight(vn-tts-word)`),
 * and a sibling floating word-aura overlay inside `.scroll-copy`.
 */
export class ParagraphReadAlong {
  private paragraphId = '';
  private index = -1;
  private cachedText = '';
  private words: WordSpanRef[] = [];
  private totalWeight = 0;
  private activeWordIndex = -1;
  private auraEl: HTMLElement | null = null;
  private rafId: number | null = null;
  private lastAnchorTime = 0;
  private lastElapsed = 0;
  private lastDuration = 0;

  constructor(private readonly target: HTMLElement) {}

  setParagraph(id: string, index: number): void {
    if (id !== this.paragraphId || index !== this.index) this.clear();
    this.paragraphId = id;
    this.index = index;
    this.cachedText = '';
    this.words = [];
    this.totalWeight = 0;
    this.activeWordIndex = -1;
  }

  update(progress: SpeechPlaybackProgress | null): boolean {
    const active = Boolean(
      progress &&
      progress.cursor.paragraphIndex === this.index &&
      this.paragraphId === `${progress.cursor.sourceFingerprint}:${this.index}`
    );
    if (!active || !progress) {
      this.clear();
      return false;
    }
    this.target.dataset.vnSpeechSpeaking = 'true';
    this.ensureWordsIndexed();
    const estimatedDuration = Math.max(2.0, (this.target.textContent?.length ?? 40) / 14.5);
    const duration = progress.durationSeconds && progress.durationSeconds > 0
      ? progress.durationSeconds
      : estimatedDuration;
    const fraction = Math.max(0, Math.min(1, progress.elapsedSeconds / duration));
    this.lastElapsed = progress.elapsedSeconds;
    this.lastDuration = duration;
    this.lastAnchorTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.applyWordFraction(fraction);
    this.startInterpolationLoop();
    return true;
  }

  /** Drives word-by-word read-along & auto-scroll during paced Auto-Read when TTS audio is not active. */
  setFraction(fraction: number | null): void {
    if (fraction === null || !Number.isFinite(fraction) || fraction < 0) {
      if (this.target.dataset.vnSpeechSpeaking !== 'true') {
        this.clearVisualHighlights();
      }
      return;
    }
    this.stopInterpolationLoop();
    this.target.dataset.vnAutoReading = 'true';
    this.ensureWordsIndexed();
    this.applyWordFraction(Math.max(0, Math.min(1, fraction)));
  }

  clear(): void {
    this.stopInterpolationLoop();
    delete this.target.dataset.vnSpeechSpeaking;
    delete this.target.dataset.vnAutoReading;
    delete this.target.dataset.vnSpeechWordIndex;
    this.activeWordIndex = -1;
    this.clearVisualHighlights();
  }

  private startInterpolationLoop(): void {
    if (this.rafId !== null || typeof requestAnimationFrame !== 'function') return;
    const tick = () => {
      this.rafId = null;
      if (this.target.dataset.vnSpeechSpeaking !== 'true' || this.lastDuration <= 0) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = Math.max(0, (now - this.lastAnchorTime) / 1000);
      const interpolated = Math.min(1, (this.lastElapsed + dt) / this.lastDuration);
      this.applyWordFraction(interpolated);
      if (interpolated < 1) {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopInterpolationLoop(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
  }

  private ensureWordsIndexed(): void {
    const raw = this.target.textContent ?? '';
    if (raw === this.cachedText && this.words.length > 0) return;
    this.cachedText = raw;
    this.words = [];
    this.totalWeight = 0;
    const doc = this.target.ownerDocument;
    if (!doc || typeof doc.createTreeWalker !== 'function') return;
    const NodeFilterShowText = 4; // NodeFilter.SHOW_TEXT
    const walker = doc.createTreeWalker(this.target, NodeFilterShowText);
    const rawTokens: Array<{ node: Text; start: number; end: number; weight: number }> = [];
    let current = walker.nextNode() as Text | null;
    while (current) {
      const value = current.nodeValue ?? '';
      const regex = /\S+/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value)) !== null) {
        const wordText = match[0];
        const start = match.index;
        const end = start + wordText.length;
        const pauseBonus = /[.!?…]["'”’)]*$/.test(wordText)
          ? 5.5
          : /[,;:—–]["'”’)]*$/.test(wordText)
            ? 2.8
            : 0;
        const weight = Math.max(1.5, wordText.length * 0.85 + pauseBonus);
        rawTokens.push({ node: current, start, end, weight });
        this.totalWeight += weight;
      }
      current = walker.nextNode() as Text | null;
    }
    if (this.totalWeight <= 0) return;
    let acc = 0;
    this.words = rawTokens.map((tok, index) => {
      const cumStart = acc / this.totalWeight;
      acc += tok.weight;
      const cumEnd = acc / this.totalWeight;
      return {
        node: tok.node,
        start: tok.start,
        end: tok.end,
        cumStart,
        cumEnd,
        index,
      };
    });
  }

  private applyWordFraction(fraction: number): void {
    if (typeof this.target.style?.setProperty === 'function') {
      this.target.style.setProperty('--vn-tts-progress', `${Math.round(fraction * 1000) / 10}%`);
    }
    if (this.words.length === 0 || fraction >= 0.992) {
      if (this.auraEl) this.auraEl.hidden = true;
      return;
    }
    let picked = this.words[this.words.length - 1]!;
    for (const w of this.words) {
      if (fraction <= w.cumEnd) {
        picked = w;
        break;
      }
    }
    if (picked.index === this.activeWordIndex) return;
    this.activeWordIndex = picked.index;
    this.target.dataset.vnSpeechWordIndex = String(picked.index);

    const doc = this.target.ownerDocument;
    if (!doc || typeof doc.createRange !== 'function') return;
    try {
      const activeRange = doc.createRange();
      activeRange.setStart(picked.node, picked.start);
      activeRange.setEnd(picked.node, picked.end);

      const first = this.words[0]!;
      const spokenRange = doc.createRange();
      spokenRange.setStart(first.node, first.start);
      spokenRange.setEnd(picked.node, picked.end);

      const cssAny = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> }; Highlight?: new (...ranges: Range[]) => unknown });
      if (cssAny.CSS?.highlights && typeof cssAny.Highlight === 'function') {
        cssAny.CSS.highlights.set('vn-tts-word', new cssAny.Highlight(activeRange));
        cssAny.CSS.highlights.set('vn-tts-spoken', new cssAny.Highlight(spokenRange));
      }

      this.updateWordAuraAndScroll(activeRange);
    } catch {
      // Ignore transient DOM range errors if paragraph re-rendered mid-frame
    }
  }

  private updateWordAuraAndScroll(activeRange: Range): void {
    const scrollCopy = this.target.parentElement;
    if (!scrollCopy || typeof activeRange.getBoundingClientRect !== 'function' || typeof scrollCopy.getBoundingClientRect !== 'function') {
      return;
    }
    const rects = typeof activeRange.getClientRects === 'function' ? activeRange.getClientRects() : null;
    const wordRect = (rects && rects.length > 0 ? rects[0] : activeRange.getBoundingClientRect());
    const containerRect = scrollCopy.getBoundingClientRect();
    if (!wordRect || !containerRect || wordRect.width <= 0 || wordRect.height <= 0 || containerRect.height <= 0) {
      return;
    }

    if (!this.auraEl || this.auraEl.parentElement !== scrollCopy) {
      this.auraEl?.remove();
      const el = this.target.ownerDocument.createElement('span');
      el.className = 'vn-tts-word-aura';
      el.setAttribute('data-vn-tts-aura', '');
      el.setAttribute('aria-hidden', 'true');
      scrollCopy.append(el);
      this.auraEl = el;
    }

    const relTop = wordRect.top - containerRect.top + scrollCopy.scrollTop;
    const relLeft = wordRect.left - containerRect.left + scrollCopy.scrollLeft;
    this.auraEl.hidden = false;
    this.auraEl.style.transform = `translate3d(${Math.round(relLeft - 3)}px, ${Math.round(relTop - 1)}px, 0)`;
    this.auraEl.style.width = `${Math.round(wordRect.width + 6)}px`;
    this.auraEl.style.height = `${Math.round(wordRect.height + 2)}px`;

    // Smooth auto-scroll inside .scroll-copy so the active spoken line stays comfortably in view
    const visibleTop = wordRect.top - containerRect.top;
    const visibleBottom = wordRect.bottom - containerRect.top;
    const viewHeight = containerRect.height;
    if (scrollCopy.scrollHeight > viewHeight + 4) {
      if (visibleBottom > viewHeight * 0.68 || visibleTop < viewHeight * 0.14) {
        const desiredTop = Math.max(0, relTop - viewHeight * 0.36);
        if (typeof scrollCopy.scrollTo === 'function') {
          scrollCopy.scrollTo({ top: desiredTop, behavior: 'smooth' });
        } else {
          scrollCopy.scrollTop = desiredTop;
        }
      }
    }
  }

  private clearVisualHighlights(): void {
    if (typeof this.target.style?.removeProperty === 'function') {
      this.target.style.removeProperty('--vn-tts-progress');
    }
    const cssAny = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } });
    if (cssAny.CSS?.highlights) {
      cssAny.CSS.highlights.delete('vn-tts-word');
      cssAny.CSS.highlights.delete('vn-tts-spoken');
    }
    if (this.auraEl) {
      this.auraEl.hidden = true;
    }
  }
}
