import readline from 'readline';
import { processUserMessage } from './src/services/geminiAgent.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`\n======================================================`);
console.log(`🤖 LINE Sales AI Agent Tester (Terminal Interactive CLI)`);
console.log(`======================================================`);
console.log(`ลองพิมพ์คำสั่งทดสอบระบบ เช่น:`);
console.log(`  1. "ขอดูรูปเสื้อเชิ้ตสีดำ"` );
console.log(`  2. "มีกระเป๋าไหม"` );
console.log(`  3. "บันทึกร้านสมศักดิ์การค้า: สั่งซื้อประจำวันจันทร์ ให้เครดิต 45 วัน"` );
console.log(`  4. "ขอข้อมูลร้านสมศักดิ์การค้า"` );
console.log(`(พิมพ์ "exit" เพื่อออกจากโปรแกรม)\n`);

function askQuestion() {
  rl.question('\n👤 พนักงานขาย > ', async (input) => {
    if (input.trim().toLowerCase() === 'exit') {
      console.log('👋 ออกจากโปรแกรมทดสอบ');
      rl.close();
      return;
    }

    if (!input.trim()) {
      askQuestion();
      return;
    }

    console.log('⏳ AI กำลังประมวลผล...');
    const result = await processUserMessage(input);

    console.log(`\n🤖 AI Agent ตอบกลับ:\n${result.text}`);

    if (result.flexMessage) {
      console.log(`\n📱 [LINE Flex Message Generated]:`);
      if (result.flexMessage.contents.type === 'carousel') {
        const bubbles = result.flexMessage.contents.contents;
        console.log(`📦 แสดงผล Carousel สินค้าทั้งหมด ${bubbles.length} รายการ:`);
        bubbles.forEach((b, idx) => {
          const title = b.body.contents[1].text;
          const price = b.body.contents[2].contents[0].text;
          const img = b.hero.url;
          const shareLink = b.footer.contents[0].action.uri;
          console.log(`  [${idx + 1}] ${title} | ${price}`);
          console.log(`      🖼️ รูปสินค้า: ${img}`);
          console.log(`      📤 ปุ่มแชร์ให้ลูกค้า (Share Link): ${shareLink}`);
        });
      } else if (result.flexMessage.contents.type === 'bubble') {
        const storeName = result.flexMessage.contents.header.contents[1].text;
        console.log(`🏬 การ์ดข้อมูลร้านค้า: ${storeName}`);
      }
    }

    askQuestion();
  });
}

askQuestion();
