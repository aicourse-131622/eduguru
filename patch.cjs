const fs = require('fs');
const fileName = 'server.js';
console.log('Reading ' + fileName);
let data = fs.readFileSync(fileName, 'utf8');

// Ganti logika error handler
const oldCode = "console.error('❌ Error:', err);";
const newCode = "console.error('❌ Error:', err); const fsLog = require('fs'); try { fsLog.appendFileSync('ERROR_LOG.txt', '\\n[' + new Date().toISOString() + '] ' + (err.stack || err) + '\\n'); } catch(e) {}";

if (data.indexOf(newCode) === -1) {
    data = data.replace(oldCode, newCode);
    fs.writeFileSync(fileName, data);
    console.log('✅ SUKSES: Server dipasangi Log CCTV.');
} else {
    console.log('⚠️ CCTV sudah terpasang sebelumnya.');
}
