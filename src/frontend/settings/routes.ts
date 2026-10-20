import type {VisualNovelConfig} from '../../config.js';
import type {SettingsSectionId} from './model.js';

export const SETTINGS_PAGES = [
 {id:'home',section:'reading',title:'All settings',description:'Make the reader your own.',parent:null},
 {id:'reading',section:'reading',title:'Reading',description:'Pace, replies and story references.',parent:'home'},
 {id:'appearance',section:'look',title:'Appearance',description:'Theme, dialogue sheet and scene display.',parent:'home'},
 {id:'images',section:'pictures',title:'Images',description:'Choose how new illustrations are prepared.',parent:'home'},
 {id:'templates',section:'pictures',title:'Scene templates',description:'Choose what each kind of picture shows.',parent:'images'},
 {id:'style',section:'pictures',title:'Shared style',description:'Reusable style and exclusions for future pictures.',parent:'images'},
 {id:'rules',section:'pictures',title:'Presentation rules',description:'Optional template, background, effect and music preferences.',parent:'images'},
 {id:'consistency',section:'pictures',title:'Consistency & reuse',description:'Generation references and compatible saved pictures.',parent:'images'},
 {id:'generation',section:'pictures',title:'Advanced generation',description:'Model-specific controls and image overrides.',parent:'images'},
 {id:'characters',section:'characters',title:'Characters & places',description:'Saved presentation guidance for this story.',parent:'home'},
 {id:'audio',section:'sound',title:'Audio',description:'Speech, music and sound effects.',parent:'home'},
 {id:'music',section:'sound',title:'Music & sound',description:'Library and volume controls.',parent:'audio'},
 {id:'speech',section:'voice',title:'Speech',description:'Existing profiles and character voice overrides.',parent:'audio'},
 {id:'connections',section:'connections',title:'Connections',description:'Story-reader services and context.',parent:'home'},
 {id:'context',section:'connections',title:'Story context',description:'Choose which existing sources the reader can use.',parent:'connections'},
 {id:'system-one',section:'connections',title:'System One',description:'Optional bounded presentation decisions.',parent:'connections'},
 {id:'advanced',section:'advanced',title:'Advanced',description:'Technical editors and recovery.',parent:'home'},
 {id:'parameters',section:'advanced',title:'Story-reader parameters',description:'Raw JSON parameters for the story reader.',parent:'advanced'},
 {id:'filtering',section:'advanced',title:'Text filtering',description:'Display rules and ignored blocks.',parent:'advanced'},
 {id:'css',section:'advanced',title:'Custom CSS',description:'Your reader stylesheet.',parent:'advanced'},
 {id:'storage',section:'advanced',title:'Storage & logs',description:'Music folder and diagnostic logging.',parent:'advanced'},
 {id:'reset',section:'advanced',title:'Reset & setup',description:'Restore preferences or revisit setup.',parent:'advanced'},
] as const satisfies ReadonlyArray<{id:string;section:SettingsSectionId;title:string;description:string;parent:string|null}>;
export type SettingsPageId=typeof SETTINGS_PAGES[number]['id'];
const aliases:Record<string,SettingsPageId>={look:'appearance',pictures:'images',sound:'music',voice:'speech',cast:'characters',gallery:'characters',prompts:'style',models:'parameters',maintenance:'reset'};
export function settingsPage(value:unknown):typeof SETTINGS_PAGES[number]{
 const id=typeof value==='string'?(aliases[value]??value):'home';
 return SETTINGS_PAGES.find(page=>page.id===id)??SETTINGS_PAGES[0];
}
export const SETTINGS_FIELD_PAGES={
 autoEnter:'reading',mode:'reading',generateChoices:'reading',textSpeed:'reading',autoPlayDelay:'reading',skipMode:'reading',tooltips:'reading',collectEntityReferences:'reading',
 themePreset:'appearance',sceneImageFit:'appearance',castMode:'appearance',effectIntensity:'appearance',textEffects:'appearance',textScale:'appearance',readerPreferences:'appearance',
 automaticImagePromptSettings:'images',imagePromptBudgetOverride:'images',imagePromptBudget:'images',generateImages:'images',useNativeCardImages:'images',reviewImages:'images',imageConnectionId:'images',maxImagesPerTurn:'images',imageOutputAspectRatio:'images',
 dynamicImageTemplates:'templates',defaultImageTemplateId:'templates',imageTemplates:'templates',imagePromptFormat:'templates',promptPrefix:'style',promptSuffix:'style',negativePrompt:'style',promptPresets:'style',selectedSharedStyleId:'style',originalReference:'style',originalCreationName:'style',novelAiQualityTags:'style',novelAiUseDefaultNegative:'style',
 persistentLocationArt:'consistency',persistentCastArt:'consistency',referenceAnchoring:'consistency',referenceSource:'consistency',imageModel:'generation',imageParameters:'generation',imageConcurrency:'generation',
 bgmVolume:'music',sfxVolume:'music',speech:'speech',parserConnectionId:'connections',parserParameters:'parameters',systemOneMode:'system-one',systemOneApiUrl:'system-one',systemOneModel:'system-one',
 includeSimTrackerContext:'context',simTrackerMappings:'context',contextSources:'context',includeRecentMessages:'context',includeCharacterContext:'context',includePersonaContext:'context',includeLorebookContext:'context',customPlannerInstructions:'context',
 enabled:'home',debugLogging:'storage',customCss:'css',ignoredTags:'filtering',displayRegexRules:'filtering',audioDirectory:'storage'
} as const satisfies Record<keyof VisualNovelConfig,SettingsPageId>;
