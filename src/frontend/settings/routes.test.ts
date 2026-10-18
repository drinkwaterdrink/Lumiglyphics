import {test,expect} from 'bun:test';
import {DEFAULT_CONFIG} from '../../config.js';
import {SETTINGS_FIELD_PAGES,settingsPage,SETTINGS_PAGES} from './routes.js';

test('every configuration field has a single settings destination',()=>{
 expect(Object.keys(SETTINGS_FIELD_PAGES).sort()).toEqual(Object.keys(DEFAULT_CONFIG).sort());
 for(const page of Object.values(SETTINGS_FIELD_PAGES)) expect(SETTINGS_PAGES.some(p=>p.id===page)).toBe(true);
});
test('legacy and friendly route names keep their destinations',()=>{
 expect(settingsPage('pictures').id).toBe('images');
 expect(settingsPage('look').id).toBe('appearance');
 expect(settingsPage('voice').id).toBe('speech');
 expect(settingsPage('sound').id).toBe('music');
 expect(settingsPage('cast').id).toBe('characters');
 expect(settingsPage('nonsense').id).toBe('home');
});
