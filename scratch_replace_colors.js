const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\bhimr\\Downloads\\QuickHireAI (1)\\QuickHireAI\\Frontend\\src';

const replacements = {
  '#3b82f6': 'var(--primary-color)',
  '#2563eb': 'var(--primary-color)', 
  '#1d4ed8': 'var(--primary-color)', // hover states
  '#10b981': 'var(--secondary-color)',
  '#059669': 'var(--secondary-color)',
  '#6366f1': 'var(--accent-color)'
};

function walk(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [hex, variable] of Object.entries(replacements)) {
        const regex = new RegExp(hex, 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, variable);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

walk(dir);
console.log('Done.');
