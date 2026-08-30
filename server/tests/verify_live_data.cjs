async function testFetch() {
  const res = await fetch('http://localhost:3001/v1/auth/me', {
    headers: { 'x-user-id': '11111111-1111-1111-1111-111111111111' }
  });
  const data = await res.json();
  console.log('Current user from server:', data.data?.nickname);

  const pRes = await fetch('http://localhost:3001/v1/profiles', {
    headers: { 'x-user-id': '11111111-1111-1111-1111-111111111111' }
  });
  const pData = await pRes.json();
  console.log('Profiles count:', pData.data?.length);

  const avRes = await fetch('http://localhost:3001/v1/profiles/c4d3b2a1-0000-0000-0000-123456789abc/avatar');
  const avData = await avRes.json();
  console.log('Avatar normalizedImageUrl length:', avData.data?.normalizedImageUrl?.length);
  console.log('Avatar is base64:', avData.data?.normalizedImageUrl?.startsWith('data:image'));

  const gRes = await fetch('http://localhost:3001/v1/garments?profileId=c4d3b2a1-0000-0000-0000-123456789abc');
  const gData = await gRes.json();
  console.log('Garments list:', gData.data?.map(g => g.title));
}

testFetch();
