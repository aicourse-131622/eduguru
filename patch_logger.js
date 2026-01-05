import fs from 'fs';
try {
  let content = fs.readFileSync('server.js', 'utf8');
  if (!content.includes('import fs from')) {
      content = "import fs from 'fs';\n" + content;
  }
  const search = "console.error('❌ Error:', err);";
  const replace = `console.error('❌ Error:', err);
  try {
    fs.appendFileSync('ERROR_LOG.txt', '\\n[' + new Date().toISOString() + '] ' + (err.stack || err) + '\\n');
  } catch(e) {}`;
  
  if (content.includes(search)) {
      content = content.replace(search, replace);
      fs.writeFileSync('server.js', content);
      console.log('✅ Server BERHASIL dipasangi CCTV Error!');
  } else {
      console.log('⚠️ Gagal menemukan baris kode error.');
  }
} catch (e) { console.log(e); }
