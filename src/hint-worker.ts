import { solve } from './puzzle';
self.onmessage = (event) => { self.postMessage({id:event.data.id,path:solve(event.data.state)}); };
