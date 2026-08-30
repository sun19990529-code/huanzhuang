const fs = require('fs');
const path = require('path');

const avatarPath = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/avatar_mannequin_clean_1787735800085.jpg';
const dressPath = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/dress_cutout_clean_1787736018808.jpg';
const crownPath = 'C:/Users/sunqiming/.gemini/antigravity/brain/ce53a329-5182-4ee5-acae-9c6fefbd88cd/crown_accessory_cutout_1787736038544.jpg';

const avatarBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(avatarPath).toString('base64');
const dressBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(dressPath).toString('base64');
const crownBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(crownPath).toString('base64');

console.log('Avatar base64 length:', avatarBase64.length);
console.log('Dress base64 length:', dressBase64.length);
console.log('Crown base64 length:', crownBase64.length);

// 写入预置数据文件供 server 和前端直接使用
const assetExport = `export const GENERATED_ASSETS = {
  avatarUrl: "${avatarBase64}",
  dressCutoutUrl: "${dressBase64}",
  crownCutoutUrl: "${crownBase64}"
};
`;

fs.writeFileSync('server/src/generatedAssets.ts', assetExport);
console.log('Successfully written server/src/generatedAssets.ts');
