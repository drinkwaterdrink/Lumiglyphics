/** Paid automatic image starts require all three explicit conditions. No network heuristics. */
export function automaticGenerationAllowed(input:{viewOpen:boolean;generateImages:boolean;dataSaverMode:boolean}):boolean {
 return input.viewOpen&&input.generateImages&&!input.dataSaverMode;
}
