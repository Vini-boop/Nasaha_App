const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'screens'),
  path.join(__dirname, 'navigation'),
];

const walk = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
};

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We want to find style objects that have shadow properties.
  // shadowColor: '...',
  // shadowOffset: { width: X, height: Y },
  // shadowOpacity: Z,
  // shadowRadius: R,
  // These can be in any order, and some might be missing.
  
  // We can just use a regex to replace each individual shadow property with nothing,
  // and collect them, but that's hard to do locally per style block.
  // Instead, let's look for `shadowColor` and replace the whole block of shadow props.
  // To do this, we can split the file by `shadowColor`, then for each chunk, extract the properties.
  
  // Alternatively, just do this for all known instances by hand? No, let's write a targeted replace.
  
  // Replace combinations like:
  // shadowColor: '#000',
  // shadowOffset: { width: 0, height: 4 },
  // shadowOpacity: 0.1,
  // shadowRadius: 8,
  
  // We can use a regex that matches them in any order, but usually they are sequential.
  // Let's just remove them and insert boxShadow! Wait, if they are removed, what if they were comma separated properly?
  
  // Let's simplify: on Web, we can just use `boxShadow`. On native, RN 0.74+ supports `boxShadow`.
  // So we just replace the shadow group with `boxShadow`.
  
  // Since we only have a few files, we can just do a very permissive replace:
  
  const extractAndReplace = (str) => {
      let color = '#000';
      let opacity = 0.2;
      let radius = 4;
      let width = 0;
      let height = 2;
      
      const cMatch = str.match(/shadowColor:\s*(['"][^'"]+['"]|[^,\n}]+)/);
      if (cMatch) color = cMatch[1].replace(/['"]/g, '');
      
      const oMatch = str.match(/shadowOpacity:\s*([\d.]+)/);
      if (oMatch) opacity = parseFloat(oMatch[1]);
      
      const rMatch = str.match(/shadowRadius:\s*([\d.]+)/);
      if (rMatch) radius = parseFloat(rMatch[1]);
      
      const osMatch = str.match(/shadowOffset:\s*\{\s*width:\s*([\d.-]+),\s*height:\s*([\d.-]+)\s*\}/);
      if (osMatch) {
          width = parseFloat(osMatch[1]);
          height = parseFloat(osMatch[2]);
      }
      
      let rgbaColor = `rgba(0, 0, 0, ${opacity})`;
      if (color !== '#000' && color !== '#000000') {
          // If it's a variable or other color, we might just put the opacity on the shadow?
          // For simplicity, just use the color directly if it's not black.
          rgbaColor = color;
      }
      if (color.match(/rgba/)) {
          rgbaColor = color;
      }
      
      // We return the boxShadow string
      if (rgbaColor.startsWith('PRIMARY')) {
         return `boxShadow: \`\${width}px \${height}px \${radius}px \${${rgbaColor}}\``;
      }
      return `boxShadow: '${width}px ${height}px ${radius}px ${rgbaColor}'`;
  };

  // We can split by `shadowColor:` and then find the end of the shadow properties.
  // But a simple generic regex for a block of shadow props:
  // Match `shadowColor: ...` and any following `shadowX: ...` (including newlines and commas)
  // Actually, we can just replace each individual property with empty string, but we need to put `boxShadow` somewhere.
  
  // Let's just fix it by replacing `shadowColor: ...` with `boxShadow: ...` and removing the others.
  
  let newContent = content;
  
  let match;
  const shadowBlockRegex = /shadowColor:[^}]*?(?=\w+:|\})/g; // this is tricky.
  
  // Let's do it manually using String manipulation
  const lines = newContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('shadowColor')) {
          // We found a block. Let's look ahead up to 5 lines to collect all shadow properties.
          let blockLines = [lines[i]];
          let j = i + 1;
          while (j < lines.length && j < i + 5 && lines[j].match(/shadow(?:Opacity|Radius|Offset)/)) {
              blockLines.push(lines[j]);
              j++;
          }
          
          let blockStr = blockLines.join('\n');
          let boxS = extractAndReplace(blockStr);
          
          // Replace the first line with boxShadow
          lines[i] = lines[i].replace(/shadowColor:\s*[^,]+,?/, boxS + ',');
          // Clear the other shadow lines
          for (let k = i + 1; k < j; k++) {
              lines[k] = lines[k].replace(/shadow(?:Opacity|Radius|Offset):\s*(?:\{[^}]+\}|[^,]+),?/g, '');
              // Clean up any remaining commas
              lines[k] = lines[k].replace(/^\s*,\s*$/, '');
          }
      }
  }
  
  newContent = lines.join('\n');
  
  // For single-line shadow props like in HomeScreen
  newContent = newContent.replace(/shadowOpacity:\s*[\d.]+,?\s*/g, '');
  newContent = newContent.replace(/shadowRadius:\s*[\d.]+,?\s*/g, '');
  newContent = newContent.replace(/shadowOffset:\s*\{\s*width:\s*[\d.-]+,\s*height:\s*[\d.-]+\s*\},?\s*/g, '');
  
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
};

dirs.forEach(dir => {
  const files = walk(dir);
  files.forEach(processFile);
});

console.log('Done');
