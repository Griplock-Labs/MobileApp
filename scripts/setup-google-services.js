const fs = require('fs');
const path = require('path');

if (process.env.GOOGLE_SERVICES_JSON_BASE64) {
  const content = Buffer.from(
    process.env.GOOGLE_SERVICES_JSON_BASE64,
    'base64'
  ).toString('utf-8');
  
  const outputPath = path.join(__dirname, '../google-services.json');
  fs.writeFileSync(outputPath, content);
  console.log('✅ google-services.json created');
} else {
  console.log('⚠️ GOOGLE_SERVICES_JSON_BASE64 not found, skipping');
}
