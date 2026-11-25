import {
  WorldClockCommandSchema, WorldClockKindSchema, visibleClockProgress,
  type WorldClockCommand, type WorldClockLedger,
} from '../../shared/world-clocks.js';

type ClockKind = (typeof WorldClockKindSchema.options)[number];
const kindLabels: Record<ClockKind, string> = {
  objective: 'Objective', deadline: 'Deadline', relationship: 'Relationship', faction: 'Faction objective',
};

function labelled(label: string, control: HTMLElement): HTMLLabelElement {
  const element = document.createElement('label');
  control.setAttribute('aria-label', label);
  element.append(label, control);
  return element;
}

function button(label: string, type: 'button' | 'submit' = 'button'): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = type;
  element.className = 'chip';
  element.textContent = label;
  return element;
}

function addOption(select: HTMLSelectElement, label: string, value: string): void {
  const option = document.createElement('option');
  option.textContent = label;
  option.value = value;
  select.append(option);
}

export class WorldClockPanel {
  readonly element = document.createElement('details');
  private readonly status = document.createElement('p');
  private readonly list = document.createElement('div');
  private readonly form = document.createElement('form');
  private pending = false;
  private closed = false;
  private signature: string | undefined;

  constructor(private readonly send: (command: WorldClockCommand, finish: (error?: string) => void) => void) {
    this.element.className = 'world-threads-card';
    this.element.dataset.worldClocks = '';
    const title = document.createElement('summary');
    title.textContent = 'Living World clocks';
    const hint = document.createElement('p');
    hint.textContent = 'Track a goal one passage at a time. Record the story beat behind each step.';
    this.status.setAttribute('role', 'status');
    this.status.dataset.worldClockStatus = '';

    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = 100;
    name.required = true;
    name.placeholder = 'Catch the last ferry';
    const kind = document.createElement('select');
    for (const key of ['objective', 'deadline', 'relationship', 'faction'] as const) addOption(kind, kindLabels[key], key);
    const steps = document.createElement('input');
    steps.type = 'number';
    steps.min = '2';
    steps.max = '12';
    steps.value = '4';
    steps.required = true;
    this.form.append(labelled('Clock name', name), labelled('Type', kind), labelled('Steps', steps), button('Create clock', 'submit'));
    this.form.onsubmit = event => {
      event.preventDefault();
      this.submit({ kind: 'create', clock: { title: name.value, steps: steps.valueAsNumber, kind: kind.value } }, () => this.form.reset());
    };
    this.element.append(title, hint, this.status, this.list, this.form);
    this.setLedger(undefined);
  }

  setLedger(ledger: WorldClockLedger | undefined): void {
    const signature = JSON.stringify(ledger ?? null);
    if (this.signature === signature) return;
    this.signature = signature;
    const expanded = new Set([...this.list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(row => row.dataset.clockId));
    this.list.replaceChildren();
    if (!ledger?.clocks.length) {
      const empty = document.createElement('p');
      empty.className = 'world-scene-empty';
      empty.textContent = 'No clocks in this chat yet.';
      this.list.append(empty);
    } else {
      for (const clock of ledger.clocks) {
        const row = this.renderClock(ledger, clock);
        row.open = expanded.has(clock.id);
        this.list.append(row);
      }
    }
    this.form.hidden = (ledger?.clocks.length ?? 0) >= 24;
    this.updateControls();
  }

  close(): void { this.closed = true; }

  private renderClock(ledger: WorldClockLedger, clock: WorldClockLedger['clocks'][number]): HTMLDetailsElement {
    const current = visibleClockProgress(ledger, clock.id);
    const complete = current === clock.steps;
    const row = document.createElement('details');
    row.dataset.clockId = clock.id;
    const heading = document.createElement('summary');
    heading.textContent = `${clock.title} · ${current}/${clock.steps}${complete ? ' · Complete' : clock.paused ? ' · Paused' : ''}`;
    const progress = document.createElement('progress');
    progress.max = clock.steps;
    progress.value = current;
    progress.setAttribute('aria-label', `${clock.title} progress`);
    const kind = document.createElement('p');
    kind.textContent = kindLabels[clock.kind];
    const pause = button(clock.paused ? 'Resume clock' : 'Pause clock');
    pause.onclick = () => this.submit({ kind: 'pause', clockId: clock.id, paused: !clock.paused });
    row.append(heading, kind, progress, pause);

    const evidence = ledger.events.filter(event => event.clockId === clock.id).slice(-5).reverse();
    if (evidence.length) {
      const list = document.createElement('ul');
      list.setAttribute('aria-label', 'Recent progress evidence');
      for (const event of evidence) {
        const item = document.createElement('li');
        const change = event.kind === 'advance' ? '+1 step' : `Set to ${event.value}`;
        item.textContent = `${change} · Passage ${event.position.paragraphIndex + 1} · ${event.note}`;
        list.append(item);
      }
      row.append(list);
    }

    const edit = document.createElement('form');
    const action = document.createElement('select');
    if (!clock.paused && !complete) addOption(action, 'Record one step', 'advance');
    addOption(action, 'Correct progress', 'correct');
    const value = document.createElement('input');
    value.type = 'number';
    value.min = '0';
    value.max = String(clock.steps);
    value.value = String(current);
    value.required = true;
    const valueLabel = labelled('New progress', value);
    const updateFields = () => {
      valueLabel.hidden = action.value !== 'correct';
      value.disabled = valueLabel.hidden || this.pending;
    };
    action.onchange = updateFields;
    const note = document.createElement('textarea');
    note.rows = 2;
    note.maxLength = 280;
    note.required = true;
    edit.append(labelled('Progress action', action), valueLabel, labelled('What happened in this passage?', note), button('Save progress', 'submit'));
    edit.onsubmit = event => {
      event.preventDefault();
      this.submit(action.value === 'advance'
        ? { kind: 'advance', clockId: clock.id, note: note.value }
        : { kind: 'correct', clockId: clock.id, value: value.valueAsNumber, note: note.value }, () => { note.value = ''; });
    };
    row.append(edit);
    updateFields();
    return row;
  }

  private updateControls(): void {
    for (const control of this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement>('button,input,textarea,select')) {
      control.disabled = this.pending || Boolean(control.closest('label[hidden]'));
    }
  }

  private submit(command: unknown, saved?: () => void): void {
    if (this.pending || this.closed) return;
    const parsed = WorldClockCommandSchema.safeParse(command);
    if (!parsed.success) {
      this.status.textContent = 'Enter a clock name, or complete the progress fields before saving.';
      return;
    }
    this.pending = true;
    this.status.textContent = 'Saving clock…';
    this.updateControls();
    this.send(parsed.data, error => {
      if (this.closed) return;
      this.pending = false;
      this.status.textContent = error || 'Clock saved.';
      if (!error) saved?.();
      this.updateControls();
    });
  }
}
