const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(process.cwd(), 'src/ads/dto/category-dtos/property.dto.ts');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file ends with closing brace
  if (content.trim().endsWith('}')) {
    console.log('✅ property.dto.ts already has correct braces');
  } else {
    content = content.trim() + '\n}';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed property.dto.ts - added missing brace');
  }
  
  // Count braces to ensure they match
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
  
  if (openBraces !== closeBraces) {
    console.log('⚠️  Brace count mismatch! Adding missing braces...');
    // Add missing closing braces
    const missing = openBraces - closeBraces;
    for (let i = 0; i < missing; i++) {
      content += '\n}';
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Added ${missing} missing braces`);
  }
} else {
  console.log('❌ property.dto.ts not found');
}