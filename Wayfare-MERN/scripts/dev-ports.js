export function devPorts(env = process.env) {
  const ports = new Set([5173, 5174]);
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a number between 1 and 65535.');
  }
  ports.add(port);
  const frontend = Number(new URL(env.CLIENT_ORIGIN || 'http://localhost:5173').port) || 5173;
  if (!Number.isInteger(frontend) || frontend < 1 || frontend > 65535) throw new Error('Invalid frontend port.');
  ports.add(frontend);
  return [...ports].sort((a,b)=>a-b);
}
