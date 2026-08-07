const fs = require('fs');
const axios = require('axios');
const API_URL = 'http://localhost:3000/api/v1';

async function run() {
  const loginRes = await axios.post(API_URL + '/auth/login', { email: 'counter.br01@bms.com', password: 'Password@123' });
  const token = loginRes.data.data.accessToken;
  const api = axios.create({ baseURL: API_URL, headers: { Authorization: 'Bearer ' + token } });
  
  const routeContent = [
    'import { NextResponse } from "next/server";',
    'import { getDataSource } from "../../../../lib/db/data-source";',
    'export async function GET() {',
    '  const ds = await getDataSource();',
    '  const names = ds.entityMetadatas.map(m => m.name);',
    '  const targetNames = ds.entityMetadatas.map(m => typeof m.target === "function" ? m.target.name : m.target);',
    '  return NextResponse.json({ names, targetNames });',
    '}'
  ].join('\n');
  fs.mkdirSync('frontend/app/api/v1/test-typeorm', { recursive: true });
  fs.writeFileSync('frontend/app/api/v1/test-typeorm/route.ts', routeContent);
  
  await new Promise(r => setTimeout(r, 4000));
  
  const res = await api.get('/test-typeorm');
  console.log('Metadatas:', JSON.stringify(res.data, null, 2));
  
  fs.unlinkSync('frontend/app/api/v1/test-typeorm/route.ts');
  fs.rmdirSync('frontend/app/api/v1/test-typeorm');
}
run().catch(e => {
  if(e.response) console.error('Error:', e.response.status, JSON.stringify(e.response.data, null, 2));
  else console.error(e.message);
  try {
    fs.unlinkSync('frontend/app/api/v1/test-typeorm/route.ts');
    fs.rmdirSync('frontend/app/api/v1/test-typeorm');
  } catch(err){}
});
