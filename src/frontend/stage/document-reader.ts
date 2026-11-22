import type { DocumentAssetView } from '../../protocol.js';
import type { StoryDocument } from '../../shared/story-documents.js';

const kinds: Record<StoryDocument['kind'], string> = {
  flyer: 'Flyer',
  letter: 'Letter',
  note: 'Note',
  journal: 'Journal',
  map: 'Map',
  poster: 'Poster',
  receipt: 'Receipt',
  notice: 'Notice',
  newspaper: 'Newspaper',
  pamphlet: 'Pamphlet',
  phone: 'Phone messages',
  terminal: 'Terminal',
};

export type DocumentReaderOptions = {
  asset?: DocumentAssetView | null;
  busy?: boolean;
  error?: string;
  customNote?: string;
  onGenerate?: (regenerate: boolean) => void;
  onLightbox?: (asset: DocumentAssetView) => void;
  onSaveNote?: (note: string) => void;
  onExamineCloser?: () => void;
};

const TITLE_SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export function formatDocumentDisplayTitle(rawName: string, kind: StoryDocument['kind']): string {
  const clean = rawName.trim();
  if (!clean) return kinds[kind];
  if (/[A-Z]/.test(clean)) return clean;
  return clean
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && TITLE_SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function populateDocumentArtStage(
  stage: HTMLElement,
  documentRecord: StoryDocument,
  options: DocumentReaderOptions = {},
): void {
  stage.replaceChildren();
  stage.dataset.busy = options.busy ? 'true' : 'false';
  const asset = options.asset;

  if (asset?.imageUrl) {
    const figure = document.createElement('div');
    figure.dataset.documentArtFrame = '';

    const imgBtn = document.createElement('button');
    imgBtn.type = 'button';
    imgBtn.dataset.documentArtZoom = '';
    imgBtn.setAttribute('aria-label', `Inspect full closeup of ${documentRecord.name}`);
    const img = document.createElement('img');
    img.src = asset.imageUrl;
    img.alt = `Closeup artwork of ${documentRecord.name}`;
    img.loading = 'eager';
    const zoomHint = document.createElement('span');
    zoomHint.dataset.documentZoomBadge = '';
    zoomHint.textContent = 'Expand';
    imgBtn.append(img, zoomHint);
    imgBtn.onclick = () => options.onLightbox?.(asset);
    figure.append(imgBtn);

    if (options.onGenerate) {
      const bar = document.createElement('div');
      bar.dataset.documentArtActions = '';
      const regen = document.createElement('button');
      regen.type = 'button';
      regen.dataset.documentArtGen = '';
      regen.disabled = Boolean(options.busy);
      regen.textContent = options.busy ? 'Rendering closeup…' : '↻ Regenerate';
      regen.onclick = () => options.onGenerate?.(true);
      bar.append(regen);
      figure.append(bar);
    }
    stage.append(figure);
  } else if (options.onGenerate) {
    const empty = document.createElement('div');
    empty.dataset.documentArtEmpty = '';
    const note = document.createElement('p');
    note.textContent = options.busy
      ? 'Rendering close-up inspection artwork from revealed details…'
      : 'Render a close-up inspection view grounded in the revealed scene.';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.documentArtGen = '';
    btn.disabled = Boolean(options.busy);
    btn.textContent = options.busy ? 'Generating View…' : '✨ Generate Document View';
    btn.onclick = () => options.onGenerate?.(false);
    empty.append(note, btn);
    stage.append(empty);
  }

  if (options.error) {
    const err = document.createElement('p');
    err.dataset.documentArtError = '';
    err.textContent = options.error;
    stage.append(err);
  }
}

/** Literal text & revealed observations only. No HTML, remote assets, or story mutations. */
export function createDocumentReader(
  documentRecord: StoryDocument,
  back: () => void,
  close: () => void,
  options: DocumentReaderOptions = {},
): HTMLElement {
  const displayTitle = formatDocumentDisplayTitle(documentRecord.name, documentRecord.kind);
  const panel = document.createElement('section');
  panel.dataset.vnDossierCard = '';
  panel.dataset.vnDocumentReader = '';
  panel.dataset.vnDocId = documentRecord.id;
  panel.dataset.documentKind = documentRecord.kind;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', `Read ${displayTitle}`);

  const header = document.createElement('header');
  const backButton = document.createElement('button');
  const title = document.createElement('h2');
  const closeButton = document.createElement('button');
  backButton.type = closeButton.type = 'button';
  backButton.textContent = '‹';
  backButton.title = 'Back to item';
  backButton.setAttribute('aria-label', 'Back to item');
  backButton.onclick = back;
  title.textContent = displayTitle;
  closeButton.textContent = '×';
  closeButton.title = 'Close document';
  closeButton.setAttribute('aria-label', 'Close document');
  closeButton.onclick = close;
  header.append(backButton, title, closeButton);

  const meta = document.createElement('p');
  meta.dataset.documentMeta = '';
  meta.textContent = `${kinds[documentRecord.kind]} · Revealed story view`;

  const scrollWrap = document.createElement('div');
  scrollWrap.dataset.documentBody = '';
  scrollWrap.tabIndex = 0;
  scrollWrap.setAttribute('aria-label', 'Document inspection and text');

  if (options.asset?.imageUrl || options.onGenerate) {
    const artStage = document.createElement('div');
    artStage.dataset.documentArtStage = '';
    populateDocumentArtStage(artStage, documentRecord, options);
    scrollWrap.append(artStage);
  }

  const obs = documentRecord.observations ?? [];
  const hasVisualSummary = Boolean(documentRecord.visualDetails) || obs.some(o => Boolean(o.summary || o.visualDetails?.length || o.condition || o.material));
  const collectedObservationLines: string[] = [];
  if (hasVisualSummary) {
    const obsBox = document.createElement('div');
    obsBox.dataset.documentObservations = '';
    const heading = document.createElement('h3');
    heading.textContent = 'Observed Physicality';
    obsBox.append(heading);

    const seenLines = new Set<string>();
    for (const item of obs) {
      const parts = [
        item.material,
        item.condition,
        item.summary,
        ...(item.visualDetails ?? []),
      ].filter((v): v is string => Boolean(v && v.trim()));
      const line = [...new Set(parts)].join(' · ');
      if (!line || seenLines.has(line.toLowerCase())) continue;
      seenLines.add(line.toLowerCase());
      collectedObservationLines.push(line);
      const p = document.createElement('p');
      p.textContent = line;
      const src = document.createElement('small');
      src.textContent = `Noticed · paragraph ${item.paragraphIndex + 1}`;
      obsBox.append(p, src);
    }
    if (!seenLines.size && documentRecord.visualDetails) {
      collectedObservationLines.push(documentRecord.visualDetails);
      const p = document.createElement('p');
      p.textContent = documentRecord.visualDetails;
      obsBox.append(p);
    }
    if (obsBox.children.length > 1) scrollWrap.append(obsBox);
  }

  const transcript = document.createElement('div');
  transcript.dataset.documentTranscript = '';
  if (documentRecord.sections.length) {
    if (hasVisualSummary) {
      const heading = document.createElement('h3');
      heading.textContent = 'Revealed Text';
      transcript.append(heading);
    }
    for (const section of documentRecord.sections) {
      const passage = document.createElement('section');
      const text = document.createElement('p');
      const source = document.createElement('small');
      text.textContent = section.text;
      source.textContent = `Story · paragraph ${section.paragraphIndex + 1}`;
      passage.append(text, source);
      transcript.append(passage);
    }
  } else {
    const emptyText = document.createElement('p');
    emptyText.dataset.documentEmptyText = '';
    emptyText.textContent = hasVisualSummary
      ? 'No verbatim text transcribed yet. Visual cues above reflect what has been seen so far.'
      : 'No verbatim text transcribed yet.';
    transcript.append(emptyText);
  }
  scrollWrap.append(transcript);

  let currentNote = options.customNote?.trim() ?? '';
  const customNoteWrap = document.createElement('div');
  customNoteWrap.dataset.documentCustomNote = '';
  customNoteWrap.hidden = !currentNote;
  const renderCustomNote = () => {
    customNoteWrap.replaceChildren();
    customNoteWrap.hidden = !currentNote;
    if (!currentNote) return;
    const h = document.createElement('h3');
    h.textContent = 'Your Transcript & Notes';
    const p = document.createElement('p');
    p.textContent = currentNote;
    customNoteWrap.append(h, p);
  };
  renderCustomNote();
  scrollWrap.append(customNoteWrap);

  const noteEditor = document.createElement('div');
  noteEditor.dataset.documentNoteBox = '';
  noteEditor.hidden = true;
  if (options.onSaveNote) {
    const textarea = document.createElement('textarea');
    textarea.maxLength = 4000;
    textarea.placeholder = 'Add missing transcript lines or investigation notes…';
    textarea.value = currentNote;
    const editorActions = document.createElement('div');
    editorActions.dataset.documentNoteActions = '';
    const saveNoteBtn = document.createElement('button');
    saveNoteBtn.type = 'button';
    saveNoteBtn.dataset.documentSaveNote = '';
    saveNoteBtn.textContent = 'Save Note';
    const cancelNoteBtn = document.createElement('button');
    cancelNoteBtn.type = 'button';
    cancelNoteBtn.textContent = 'Cancel';
    saveNoteBtn.onclick = () => {
      currentNote = textarea.value.trim();
      renderCustomNote();
      noteEditor.hidden = true;
      options.onSaveNote?.(currentNote);
      status.textContent = currentNote ? 'Saving transcript note…' : 'Clearing transcript note…';
    };
    cancelNoteBtn.onclick = () => {
      textarea.value = currentNote;
      noteEditor.hidden = true;
    };
    editorActions.append(cancelNoteBtn, saveNoteBtn);
    noteEditor.append(textarea, editorActions);
    scrollWrap.append(noteEditor);
  }

  const footer = document.createElement('footer');
  const copy = document.createElement('button');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  copy.type = 'button';
  const copyTextPayload = documentRecord.sections.length > 0
    ? documentRecord.sections.map(s => s.text).join('\n\n')
    : [...collectedObservationLines, ...(currentNote ? [currentNote] : [])].join('\n\n');
  copy.textContent = documentRecord.sections.length > 0 ? 'Copy text' : 'Copy observations';
  copy.title = documentRecord.sections.length > 0 ? 'Copy revealed text' : 'Copy revealed observations';
  copy.setAttribute('aria-label', copy.title);
  copy.disabled = !copyTextPayload.trim();
  copy.onclick = async () => {
    const payload = documentRecord.sections.length > 0
      ? documentRecord.sections.map(s => s.text).join('\n\n')
      : [...collectedObservationLines, ...(currentNote ? [currentNote] : [])].join('\n\n');
    if (!panel.isConnected || !payload.trim()) return;
    try {
      await navigator.clipboard.writeText(payload);
      if (panel.isConnected) status.textContent = 'Copied.';
    } catch {
      if (panel.isConnected) status.textContent = 'Copy unavailable. Select the text to copy it.';
    }
  };
  footer.append(copy);

  if (options.onSaveNote) {
    const editNoteBtn = document.createElement('button');
    editNoteBtn.type = 'button';
    editNoteBtn.dataset.documentEditNote = '';
    editNoteBtn.textContent = currentNote ? '✎ Edit note' : '✎ Transcribe / Add note';
    editNoteBtn.onclick = () => {
      noteEditor.hidden = !noteEditor.hidden;
      if (!noteEditor.hidden) {
        noteEditor.querySelector('textarea')?.focus();
      }
    };
    footer.append(editNoteBtn);
  }

  if (options.onExamineCloser) {
    const examineBtn = document.createElement('button');
    examineBtn.type = 'button';
    examineBtn.dataset.documentExamineCloser = '';
    examineBtn.textContent = 'Examine closer';
    examineBtn.title = 'Insert a reply draft to inspect or read this document closely';
    examineBtn.onclick = () => {
      options.onExamineCloser?.();
    };
    footer.append(examineBtn);
  }

  footer.append(status);

  panel.append(header, meta, scrollWrap, footer);
  return panel;
}

export const DOCUMENT_READER_CSS = `
[data-vn-document-reader]{display:flex;flex-direction:column;overflow:hidden;padding:16px;max-height:calc(100dvh - max(32px,env(safe-area-inset-top)) - max(32px,env(safe-area-inset-bottom)));transition:background .22s ease,border-color .22s ease}
[data-vn-document-reader] header{flex:none;gap:8px;border-bottom:1px solid var(--vn-panel-border,#666);padding-bottom:8px}
[data-vn-document-reader] header h2{flex:1;font-size:1.05em;line-height:1.3}
[data-vn-document-reader] header button{flex:none;min-width:44px;padding:8px;margin:0;font-size:1.3em}
[data-document-meta]{flex:none;font-size:.75em;opacity:.85;margin:10px 0;letter-spacing:.04em;text-transform:uppercase}
[data-document-body]{min-height:0;overflow:auto;overscroll-behavior:contain;user-select:text;-webkit-user-select:text;cursor:text;touch-action:pan-y;line-height:1.68;font-size:max(16px,1em);padding:12px 14px 16px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 4%,transparent);border-radius:10px;overflow-wrap:anywhere;border:1px solid color-mix(in srgb,var(--vn-panel-border,#666) 45%,transparent)}
[data-document-art-stage]{margin:0 0 14px;border-radius:10px;overflow:hidden;border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 24%,var(--vn-panel-border,#666));background:color-mix(in srgb,var(--vn-panel-solid,#111622) 82%,transparent)}
[data-document-art-stage][data-busy="true"]{opacity:.88}
[data-document-art-frame]{position:relative;display:flex;flex-direction:column}
[data-document-art-zoom]{position:relative;display:block;width:100%;padding:0;margin:0;border:0;background:transparent;cursor:zoom-in;overflow:hidden;border-radius:0}
[data-document-art-zoom] img{display:block;width:100%;max-height:240px;object-fit:contain;background:rgba(4,7,14,.55)}
[data-document-zoom-badge]{position:absolute;right:8px;bottom:8px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.03em;background:rgba(10,14,24,.78);color:#f3f7ff;border:1px solid rgba(255,255,255,.22);pointer-events:none}
[data-document-art-actions]{display:flex;justify-content:flex-end;padding:6px 8px;border-top:1px solid color-mix(in srgb,var(--vn-panel-border,#666) 40%,transparent);background:rgba(0,0,0,.18)}
[data-document-art-empty]{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px}
[data-document-art-empty] p{margin:0;font-size:.82em;opacity:.85;flex:1 1 180px;line-height:1.45}
[data-document-art-gen]{margin:0;min-height:36px;padding:6px 12px;border-radius:999px;font-size:.8em;font-weight:600;cursor:pointer;border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 48%,transparent);background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 16%,transparent);color:inherit}
[data-document-art-gen]:disabled{opacity:.58;cursor:wait}
[data-document-art-error]{margin:0;padding:6px 12px 10px;font-size:.78em;color:#fca5a5}
[data-document-observations]{margin:0 0 14px;padding:10px 12px;border-radius:8px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 8%,transparent);border:1px dashed color-mix(in srgb,var(--vn-accent,#9ec6f0) 32%,transparent)}
[data-document-observations] h3,[data-document-transcript] h3{margin:0 0 6px;font-size:.72em;letter-spacing:.07em;text-transform:uppercase;opacity:.78;font-family:inherit}
[data-document-observations] p{margin:4px 0 2px;font-size:.9em;line-height:1.5}
[data-document-empty-text]{font-size:.88em;opacity:.76;font-style:italic;margin:6px 0}
[data-document-body] p{white-space:pre-wrap;margin:8px 0}
[data-document-transcript] section+section{border-top:1px solid var(--vn-panel-border,#666);margin-top:18px;padding-top:10px}
[data-document-body] small{display:block;font:inherit;font-size:.7em;opacity:.78;margin-top:3px;margin-bottom:6px}
[data-vn-document-reader][data-document-kind="letter"] [data-document-body],
[data-vn-document-reader][data-document-kind="note"] [data-document-body]{font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;background:linear-gradient(180deg,color-mix(in srgb,#e8d5b5 12%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#c8a97e 8%,var(--vn-panel-solid,#171b26)));border-color:color-mix(in srgb,#d6b588 38%,var(--vn-panel-border,#666));box-shadow:inset 0 1px 0 rgba(255,244,224,.08)}
[data-vn-document-reader][data-document-kind="flyer"] [data-document-body],
[data-vn-document-reader][data-document-kind="pamphlet"] [data-document-body]{font-family:"Iowan Old Style",Georgia,serif;background:linear-gradient(170deg,color-mix(in srgb,#e9dfc8 11%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#b9a88e 7%,var(--vn-panel-solid,#171b26)));border:1px solid color-mix(in srgb,#d6b588 32%,var(--vn-panel-border,#666))}
[data-vn-document-reader][data-document-kind="poster"] [data-document-body]{border:2px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 42%,var(--vn-panel-border,#666));background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 6%,var(--vn-panel-solid,#171b26))}
[data-vn-document-reader][data-document-kind="newspaper"] [data-document-body]{font-family:Georgia,"Times New Roman",serif;background:linear-gradient(180deg,color-mix(in srgb,#d6d3cb 11%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#a8a49c 7%,var(--vn-panel-solid,#171b26)));border-color:color-mix(in srgb,#c4c0b6 34%,var(--vn-panel-border,#666))}
[data-vn-document-reader][data-document-kind="map"] [data-document-body]{font-family:"Iowan Old Style",Georgia,serif;background:linear-gradient(180deg,color-mix(in srgb,#dfc89e 13%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#9e835a 9%,var(--vn-panel-solid,#171b26)));border:1px dashed color-mix(in srgb,#d6b588 45%,var(--vn-panel-border,#666))}
[data-vn-document-reader][data-document-kind="receipt"] [data-document-body]{font-family:ui-monospace,"Cascadia Mono","Fira Code",monospace;font-size:.92em;background:linear-gradient(180deg,color-mix(in srgb,#e2e8f0 10%,var(--vn-panel-solid,#171b26)),color-mix(in srgb,#cbd5e1 6%,var(--vn-panel-solid,#171b26)));border-style:dotted}
[data-vn-document-reader][data-document-kind="journal"] [data-document-body]{font-family:"Iowan Old Style",Georgia,serif;background:repeating-linear-gradient(180deg,transparent 0,transparent 27px,color-mix(in srgb,var(--vn-accent,#9ec6f0) 8%,transparent) 28px),color-mix(in srgb,#d8c3a5 7%,var(--vn-panel-solid,#171b26));border-left:3px solid color-mix(in srgb,#d69e5c 55%,var(--vn-accent,#9ec6f0))}
[data-vn-document-reader][data-document-kind="notice"] [data-document-body]{border:2px double color-mix(in srgb,var(--vn-accent,#9ec6f0) 45%,var(--vn-panel-border,#666));padding:16px}
[data-vn-document-reader][data-document-kind="phone"] [data-document-body]{font-family:system-ui,-apple-system,sans-serif;background:color-mix(in srgb,#0b101b 75%,var(--vn-panel-solid,#171b26));border-radius:16px;padding:14px}
[data-vn-document-reader][data-document-kind="phone"] [data-document-body] section{background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 14%,rgba(255,255,255,.04));border:1px solid color-mix(in srgb,var(--vn-accent,#9ec6f0) 26%,transparent);border-radius:14px 14px 14px 4px;padding:10px 12px;margin-top:10px}
[data-vn-document-reader][data-document-kind="terminal"] [data-document-body]{font-family:ui-monospace,"Cascadia Mono","Fira Code",monospace;line-height:1.55;background:linear-gradient(180deg,rgba(8,20,16,.88),rgba(5,14,11,.94));color:#9ef5c2;border-color:rgba(82,214,145,.36);box-shadow:inset 0 0 24px rgba(16,185,129,.08)}
[data-document-custom-note]{margin:14px 0 6px;padding:10px 12px;border-radius:8px;background:color-mix(in srgb,var(--vn-accent,#9ec6f0) 10%,transparent);border-left:3px solid var(--vn-accent,#9ec6f0)}
[data-document-custom-note] h3{margin:0 0 6px;font-size:.72em;letter-spacing:.07em;text-transform:uppercase;opacity:.78;font-family:inherit}
[data-document-custom-note] p{margin:0;white-space:pre-wrap;font-size:.94em;line-height:1.55}
[data-document-note-box]{margin:12px 0 4px;padding:10px;border-radius:8px;border:1px solid var(--vn-panel-border,#666);background:rgba(0,0,0,.22)}
[data-document-note-box] textarea{box-sizing:border-box;width:100%;min-height:84px;margin:0 0 8px;padding:8px;border-radius:6px;border:1px solid var(--vn-panel-border,#666);background:rgba(0,0,0,.3);color:inherit;font:inherit;font-size:.9em}
[data-document-note-actions]{display:flex;justify-content:flex-end;gap:8px}
[data-vn-document-reader] footer{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--vn-panel-border,#666)}
[data-vn-document-reader] footer button{margin:0;min-width:44px;min-height:44px}[data-vn-document-reader] [role="status"]{font-size:.75em}
[data-document-body]:focus-visible{outline:2px solid var(--vn-accent,#9ec6f0);outline-offset:2px}
`;
