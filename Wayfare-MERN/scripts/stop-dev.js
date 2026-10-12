import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {devPorts} from './dev-ports.js';
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
const ports=devPorts();
if(process.argv.includes('--dry-run')) {
 console.log(`Wayfare development ports: ${ports.join(', ')}`);
} else if(process.platform==='win32') {
 // Values interpolated below are validated integers, never raw environment text.
 const command = `$ErrorActionPreference = 'Stop'; $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(${ports.join(',')}) }; $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { $process = Get-Process -Id $processId -ErrorAction SilentlyContinue; if ($process -and $process.ProcessName -eq 'node') { & taskkill.exe /PID $processId /T /F | Out-Null } }`;
 try {
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{stdio:'inherit'});
  console.log('Stopped leftover Wayfare development processes. You can start the app now.');
 } catch {
  console.error('Unable to stop a development process. Close its terminal or run this command in an administrator terminal.');
  process.exitCode=1;
 }
} else {
 console.log('Close the terminals running Wayfare with Ctrl+C, then start one copy of each service.');
}
