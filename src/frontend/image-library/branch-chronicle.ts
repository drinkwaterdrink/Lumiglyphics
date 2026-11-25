import {
  BranchChronicleResultSchema, type BranchChronicleRequest, type ChronicleBookmark, type ChronicleSide,
} from '../../shared/branch-chronicle.js';
import { samePresentationTurn } from '../../shared/presentation-entities.js';
import type { ReadingPosition } from '../../shared/reading-position.js';
import { createUiId } from '../request-id.js';
import { stripUnknownPresetTags } from '../stage/rich-text.js';

type Action = BranchChronicleRequest extends infer Request
  ? Request extends BranchChronicleRequest ? Omit<Request, 'type' | 'chatId' | 'requestId'> : never
  : never;

function bookmarkLabel(bookmark: ChronicleBookmark): string {
  const { key, paragraphIndex } = bookmark.position;
  return `Reply ${bookmark.replyNumber} · Version ${Number(key.swipeId ?? 0) + 1} · Passage ${paragraphIndex + 1}`;
}

export class BranchChronicle {
  readonly element = document.createElement('details');
  private chatId: string | null = null;
  private bookmarks: ChronicleBookmark[] = [];
  private pending: { id: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private readonly first: HTMLSelectElement;
  private readonly second: HTMLSelectElement;
  private readonly save: HTMLButtonElement;
  private readonly compare: HTMLButtonElement;
  private readonly remove: HTMLButtonElement;
  private readonly refresh: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly results: HTMLElement;

  constructor(
    private readonly send: (request: BranchChronicleRequest) => void,
    private readonly currentPosition: () => ReadingPosition | null,
    private readonly seek: (position: ReadingPosition) => boolean,
  ) {
    this.element.dataset.branchChronicle = '';
    this.element.hidden = true;
    this.element.innerHTML = `<summary>Branch Chronicle</summary>
      <p class="note">Bookmark the current passage to compare two saved replies.</p>
      <button type="button" data-chronicle-save>Bookmark current passage</button>
      <div data-chronicle-pair>
        <label>First bookmark<select data-chronicle-first></select></label>
        <label>Second bookmark<select data-chronicle-second></select></label>
      </div>
      <div data-chronicle-actions>
        <button type="button" data-chronicle-compare>Compare bookmarks</button>
        <button type="button" data-chronicle-remove>Remove first bookmark</button>
        <button type="button" data-chronicle-refresh hidden>Retry loading bookmarks</button>
      </div>
      <p role="status"></p>
      <div data-chronicle-pair data-chronicle-results></div>`;
    this.first = this.element.querySelector('[data-chronicle-first]')!;
    this.second = this.element.querySelector('[data-chronicle-second]')!;
    this.save = this.element.querySelector('[data-chronicle-save]')!;
    this.compare = this.element.querySelector('[data-chronicle-compare]')!;
    this.remove = this.element.querySelector('[data-chronicle-remove]')!;
    this.refresh = this.element.querySelector('[data-chronicle-refresh]')!;
    this.status = this.element.querySelector('[role=status]')!;
    this.results = this.element.querySelector('[data-chronicle-results]')!;

    this.element.ontoggle = () => {
      if (this.element.open && this.chatId) this.request({ action: 'list' }, 'Loading bookmarks…');
      else this.cancel();
    };
    this.save.onclick = () => {
      const position = this.currentPosition();
      if (position) this.request({ action: 'bookmark', position }, 'Saving bookmark…');
    };
    this.compare.onclick = () => this.request({
      action: 'compare', firstId: this.first.value, secondId: this.second.value,
    }, 'Comparing passages…');
    this.remove.onclick = () => this.request({ action: 'remove', bookmarkId: this.first.value }, 'Removing bookmark…');
    this.refresh.onclick = () => this.request({ action: 'list' }, 'Loading bookmarks…');
    this.first.onchange = this.second.onchange = () => {
      this.results.replaceChildren();
      this.status.textContent = '';
      this.syncControls();
    };
  }

  setScope(chatId: string | null): void {
    if (this.chatId === chatId) { this.syncControls(); return; }
    this.cancel();
    this.chatId = chatId;
    this.bookmarks = [];
    this.element.open = false;
    this.element.hidden = chatId === null;
    this.results.replaceChildren();
    this.status.textContent = '';
    this.updateOptions();
  }

  private cancel(): void {
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
  }

  private request(action: Action, status: string): void {
    const chatId = this.chatId;
    if (!chatId || !this.element.open || this.pending) return;
    const id = createUiId();
    this.status.textContent = status;
    this.results.replaceChildren();
    this.refresh.hidden = true;
    this.pending = { id, timer: setTimeout(() => this.error(chatId, id, 'The request timed out. Try again.'), 15000) };
    this.syncControls();
    try {
      this.send({ ...action, type: 'vn_branch_chronicle', chatId, requestId: id });
    } catch {
      this.error(chatId, id, 'The request could not be sent.');
    }
  }

  private owns(chatId: string, requestId?: string): boolean {
    return this.element.open && this.chatId === chatId && Boolean(this.pending && this.pending.id === requestId);
  }

  error(chatId: string, requestId: string | undefined, message: string): void {
    if (!this.owns(chatId, requestId)) return;
    this.cancel();
    this.status.textContent = message;
    this.refresh.hidden = false;
    this.syncControls();
  }

  receive(chatId: string, requestId: string, input: unknown): void {
    if (!this.owns(chatId, requestId)) return;
    const parsed = BranchChronicleResultSchema.safeParse(input);
    if (!parsed.success || parsed.data.bookmarks.some(bookmark => bookmark.position.key.chatId !== chatId)) {
      this.error(chatId, requestId, 'The bookmark response could not be read.');
      return;
    }
    this.cancel();
    this.bookmarks = parsed.data.bookmarks;
    this.updateOptions();
    const comparison = parsed.data.comparison;
    if (comparison) this.renderComparison(comparison);
    else this.status.textContent = this.bookmarks.length ? `${this.bookmarks.length} saved in this chat.` : 'No bookmarks in this chat yet.';
  }

  private updateOptions(): void {
    for (const [index, select] of [this.first, this.second].entries()) {
      const previous = select.value;
      select.replaceChildren(...this.bookmarks.map(bookmark => new Option(bookmarkLabel(bookmark), bookmark.id)));
      select.selectedIndex = Math.min(index, this.bookmarks.length - 1);
      if (this.bookmarks.some(bookmark => bookmark.id === previous)) select.value = previous;
    }
    if (this.bookmarks.length > 1 && this.first.value === this.second.value) {
      this.second.selectedIndex = this.first.selectedIndex === 0 ? 1 : 0;
    }
    this.syncControls();
  }

  private syncControls(): void {
    const current = this.currentPosition();
    this.save.disabled = Boolean(this.pending || !current || this.bookmarks.some(bookmark =>
      samePresentationTurn(bookmark.position.key, current.key) && bookmark.position.paragraphIndex === current.paragraphIndex));
    this.first.disabled = this.second.disabled = this.remove.disabled = Boolean(this.pending || !this.bookmarks.length);
    this.compare.disabled = Boolean(this.pending || !this.first.value || !this.second.value || this.first.value === this.second.value);
  }

  private renderComparison([first, second]: [ChronicleSide, ChronicleSide]): void {
    this.status.textContent = first.status === 'ready' && second.status === 'ready'
      ? 'Comparing through each bookmarked passage.'
      : 'A bookmarked source is unavailable.';
    for (const [index, side, other] of [[0, first, second], [1, second, first]] as const) {
      const bookmark = this.bookmarks.find(item => item.id === (index === 0 ? this.first.value : this.second.value));
      if (!bookmark) continue;
      const card = document.createElement('article');
      const heading = document.createElement('h4');
      heading.textContent = bookmarkLabel(bookmark);
      card.append(heading);
      const paragraph = (text: string) => {
        const element = document.createElement('p');
        element.textContent = text;
        card.append(element);
        return element;
      };
      if (side.status !== 'ready') {
        paragraph(side.status === 'missing' ? 'The saved reply or swipe was removed.' : 'The saved reply or its passage layout changed.');
      } else {
        paragraph(stripUnknownPresetTags(side.passage)).dataset.chronicleProse = '';
        const facts = other.status === 'ready' && other.completeFacts
          ? side.facts.filter(fact => !other.facts.includes(fact))
          : side.facts;
        if (facts.length) {
          const list = document.createElement('ul');
          for (const fact of facts) { const item = document.createElement('li'); item.textContent = fact; list.append(item); }
          card.append(list);
        } else if (side.completeFacts && other.status === 'ready' && other.completeFacts) {
          paragraph('No additional visible scene facts.');
        }
        if (!side.completeFacts) paragraph('Some scene facts are unavailable.');
        for (const choice of side.choices) paragraph(`Choice: ${choice.label}${choice.locked ? ' (locked)' : ''}`);
        for (const picture of side.pictures) paragraph(`Saved picture · Passage ${picture.passage} · ${picture.provider}`);
        if (side.morePictures) paragraph('Additional saved pictures are available in History.');
        const current = this.currentPosition();
        if (current && samePresentationTurn(bookmark.position.key, current.key)) {
          const jump = document.createElement('button');
          jump.type = 'button';
          jump.textContent = 'Open in reader';
          jump.onclick = () => {
            if (!this.seek(bookmark.position)) this.status.textContent = 'This passage is no longer available in the current reader.';
          };
          card.append(jump);
        }
      }
      this.results.append(card);
    }
  }
}
