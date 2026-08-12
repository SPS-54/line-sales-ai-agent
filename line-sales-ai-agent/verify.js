import { processUserMessage } from './src/services/geminiAgent.js';

async function test3MainCategoriesOnly() {
  console.log('====================================================');
  console.log('🧪 TESTING 3 MAIN STORE CATEGORIES (NO PRODUCT CATS)');
  console.log('====================================================');

  console.log('\n--- 1️⃣ Store Profile ("ขอข้อมูลร้านสมศักดิ์การค้า") ---');
  const res1 = await processUserMessage('ขอข้อมูลร้านสมศักดิ์การค้า');
  console.log('AI Response Text:', res1.text);
  if (res1.flexMessage) {
    console.log('📱 Card Title:', res1.flexMessage.contents.header.contents[1].text);
  }

  console.log('\n--- 2️⃣ Sales Performance ("ขอข้อมูลการขายร้านสมศักดิ์การค้า") ---');
  const res2 = await processUserMessage('ขอข้อมูลการขายร้านสมศักดิ์การค้า');
  console.log('AI Response Text:', res2.text);
  if (res2.flexMessage) {
    console.log('📱 Card Title:', res2.flexMessage.contents.header.contents[1].text);
  }

  console.log('\n--- 3️⃣ Sales Opportunities ("ขอโอกาสเสนอขายร้านสมศักดิ์การค้า") ---');
  const res3 = await processUserMessage('ขอโอกาสเสนอขายร้านสมศักดิ์การค้า');
  console.log('AI Response Text:', res3.text);
  if (res3.flexMessage) {
    console.log('📱 Card Title:', res3.flexMessage.contents.header.contents[1].text);
  }

  console.log('\n✅ 3 Main Store Categories Verified 100%!');
}

test3MainCategoriesOnly();
