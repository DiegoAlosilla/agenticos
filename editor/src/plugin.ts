import {install} from './drawio-adapter/editor';
declare const Draw: {loadPlugin: (callback: (ui: unknown) => void) => void};
Draw.loadPlugin(install);
