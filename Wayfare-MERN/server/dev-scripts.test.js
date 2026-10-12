import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {devPorts} from '../scripts/dev-ports.js';
test('root dev starts frontend and server dev starts backend independently',()=>{
 const root=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
 const server=JSON.parse(readFileSync(new URL('./package.json',import.meta.url)));
 assert.equal(root.scripts.dev,'vite --host 0.0.0.0');
 assert.equal(server.scripts.dev,'node --watch index.js');
 assert.match(root.scripts['dev:all'],/concurrently/);
});
test('cleanup only selects known and configured ports, and rejects malformed inputs',()=>{
 assert.deepEqual(devPorts({}),[5000,5173,5174]);
 assert.deepEqual(devPorts({PORT:'5001',CLIENT_ORIGIN:'http://localhost:5175'}),[5001,5173,5174,5175]);
 assert.throws(()=>devPorts({PORT:'5000;anything'}),/PORT must/);
});
