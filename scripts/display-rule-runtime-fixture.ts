import './reading-browser-fixture.js';
import {DisplayRuleExecutor} from '../src/frontend/stage/display-rule-executor.js';
Object.assign(window,{displayRuntime:{executor:new DisplayRuleExecutor()}});
