const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create log directory:', e.message);
  }
}

function getLogPath() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `yeyak-error-${year}-${month}-${day}.log`);
}

let lineCount = 0;

function initLineCount() {
  try {
    const file = getLogPath();
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      lineCount = content.split('\n').length - 1;
    } else {
      lineCount = 0;
    }
  } catch (e) {
    lineCount = 0;
  }
}

initLineCount();

function logErrorLine(line) {
  if (line === undefined || line === null) return;
  
  const file = getLogPath();
  try {
    fs.appendFileSync(file, line + '\n');
    lineCount++;
    
    if (lineCount > 1000) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      // Keep only the last 1000 lines (the array contains an empty trailing element from split('\n'))
      const keep = lines.slice(-1001);
      fs.writeFileSync(file, keep.join('\n'), 'utf8');
      lineCount = keep.length - 1;
    }
  } catch (e) {
    // Write warning to console if log directory is unwritable (e.g. host permission issue)
    process.stderr.write(`[Logger Error] Failed to write to yeyak-error log: ${e.message}\n`);
  }
}

console.log('Running database migrations...');
const migrate = spawnSync('node', ['migrate.js'], { stdio: ['inherit', 'inherit', 'pipe'] });
if (migrate.stderr && migrate.stderr.length > 0) {
  process.stderr.write(migrate.stderr);
  const lines = migrate.stderr.toString().split('\n');
  for (const line of lines) {
    logErrorLine(line);
  }
}

if (migrate.status !== 0) {
  console.error('Migration failed. Exiting.');
  process.exit(migrate.status || 1);
}

console.log('Starting Next.js application...');
const child = spawn('node', ['server.js'], { stdio: ['inherit', 'inherit', 'pipe'] });

let buffer = '';
child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    logErrorLine(line);
  }
});

child.on('exit', (code) => {
  if (buffer) {
    logErrorLine(buffer);
  }
  process.exit(code || 0);
});
