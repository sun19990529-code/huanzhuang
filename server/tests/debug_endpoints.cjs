async function debugEndpoints() {
  const urls = [
    'http://localhost:3001/v1/auth/current-user',
    'http://localhost:3001/v1/profiles',
    'http://localhost:3001/v1/profiles/c4d3b2a1-0000-0000-0000-123456789abc/avatar',
    'http://localhost:3001/v1/garments?profileId=c4d3b2a1-0000-0000-0000-123456789abc'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'x-user-id': '11111111-1111-1111-1111-111111111111' } });
      const text = await res.text();
      console.log(`URL: ${url} -> Status: ${res.status}, Body preview: ${text.slice(0, 100)}`);
    } catch (err) {
      console.error(`URL: ${url} -> Error:`, err.message);
    }
  }
}

debugEndpoints();
