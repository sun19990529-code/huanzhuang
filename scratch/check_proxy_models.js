const fs = require('fs');

async function checkModels() {
  const res = await fetch('http://127.0.0.1:48045/v1/models', {
    headers: { Authorization: 'Bearer sk-62702cd208dc42b09fddaf43b3731d23' }
  });
  const data = await res.json();
  console.log('Available models:', JSON.stringify(data, null, 2));
}

checkModels().catch(console.error);
