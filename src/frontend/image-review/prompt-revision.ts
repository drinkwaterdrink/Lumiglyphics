type Wording = {prompt:string;negative:string};

/** Raw editor lengths, not token counts or a semantic fidelity assessment. */
export function promptRevisionSummary(previous:Wording,current:Wording){
  const positive={before:previous.prompt.length,after:current.prompt.length,changed:previous.prompt!==current.prompt};
  const negative={before:previous.negative.length,after:current.negative.length,changed:previous.negative!==current.negative};
  const before=positive.before+negative.before,after=positive.after+negative.after;
  return {before,after,delta:after-before,positive,negative};
}
