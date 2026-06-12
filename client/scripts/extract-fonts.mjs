import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('../AmigosdeMierda.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`Error: Could not find HTML file at ${htmlPath}`);
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Helper to extract JSON from script tags
function extractScriptJSON(type) {
  const regex = new RegExp(`<script type="${type}">([\\s\\S]*?)<\/script>`);
  const match = htmlContent.match(regex);
  if (!match) {
    console.error(`Error: Could not find script tag of type ${type}`);
    return null;
  }
  try {
    return JSON.parse(match[1].trim());
  } catch (err) {
    console.error(`Error parsing JSON for ${type}:`, err);
    return null;
  }
}

const manifest = extractScriptJSON('__bundler/manifest');
const template = extractScriptJSON('__bundler/template');

if (!manifest || !template) {
  console.error('Error: Could not parse manifest or template');
  process.exit(1);
}

// Ensure fonts directory exists
const fontsDir = path.resolve('public/fonts');
fs.mkdirSync(fontsDir, { recursive: true });

// Parse @font-face rules from the template
// Example:
// @font-face {
//   font-family: 'Anton';
//   font-style: normal;
//   font-weight: 400;
//   src: url("6b5ceb63-c8e7-47d3-9883-a1a34a8d05f7") format('woff2');
// }
const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
let match;
const fontMappings = [];

while ((match = fontFaceRegex.exec(template)) !== null) {
  const ruleContent = match[1];
  const familyMatch = ruleContent.match(/font-family:\s*['"]?([^'";]+)['"]?/i);
  const weightMatch = ruleContent.match(/font-weight:\s*([^;]+)/i);
  const urlMatch = ruleContent.match(/url\(['"]?([^'")]+)['"]?\)/i);

  if (familyMatch && urlMatch) {
    const family = familyMatch[1].trim();
    const weight = weightMatch ? weightMatch[1].trim() : '400';
    const uuid = urlMatch[1].trim();
    fontMappings.push({ family, weight, uuid });
  }
}

console.log(`Found ${fontMappings.length} font mappings in template CSS.`);

const logLines = [];

for (const { family, weight, uuid } of fontMappings) {
  const asset = manifest[uuid];
  if (!asset) {
    console.warn(`Warning: Asset ${uuid} not found in manifest for ${family} (${weight})`);
    continue;
  }

  // Base64 decode
  const buffer = Buffer.from(asset.data, 'base64');
  
  // Format filename: e.g. Anton-Regular.woff2 or Oswald-700.woff2
  let weightName = weight;
  if (weight === '400' || weight === 'regular') weightName = 'Regular';
  else if (weight === '500') weightName = 'Medium';
  else if (weight === '600') weightName = 'SemiBold';
  else if (weight === '700' || weight === 'bold') weightName = 'Bold';

  const sanitizedFamily = family.replace(/\s+/g, '');
  const fileName = `${sanitizedFamily}-${weightName}.woff2`;
  const destPath = path.join(fontsDir, fileName);

  fs.writeFileSync(destPath, buffer);
  console.log(`Extracted: ${fileName} (${buffer.length} bytes)`);
  logLines.push(`- **${family} (${weight})**: ${fileName} (Source UUID: \`${uuid}\`)`);
}

// Write EXTRACTION.md documentation file
const markdownContent = `# Font Extraction Details

The following fonts were extracted from the bundled HTML client file (\`AmigosdeMierda.html\`) on ${new Date().toISOString()}:

${logLines.join('\n')}

These files are loaded locally to allow the app to work correctly offline or in local area network (LAN) environments.
`;

fs.writeFileSync(path.join(fontsDir, 'EXTRACTION.md'), markdownContent);
console.log('Saved public/fonts/EXTRACTION.md documentation.');
