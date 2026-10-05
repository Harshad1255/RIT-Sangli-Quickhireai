const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory() && !filePath.includes('node_modules')) {
      results = results.concat(searchFiles(filePath, pattern));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(pattern)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

const files = searchFiles('c:\\Users\\bhimr\\Downloads\\QuickHireAI (1)\\QuickHireAI\\frontend\\src', 'webkitSpeechRecognition');
console.log(files);
