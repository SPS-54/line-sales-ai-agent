import { config } from '../config.js';
import { generateGoogleCalendarUrl } from './googleCalendarService.js';
import { sessionStore } from './sessionStore.js';
import { cleanStoreName } from '../database/db.js';

/**
 * 1. รูปสินค้า (Product Carousel Flex Message)
 * @param {Array} products - รายการสินค้า
 * @param {Object} options - ตัวเลือกการแสดงผล { isEditing: false }
 */
export function buildProductCarouselFlex(products, options = { isEditing: false }) {
  if (!products || products.length === 0) return null;

  const isEditing = options && options.isEditing === true;
  const items = products.slice(0, 10);

  const bubbles = items.map(product => {
    const shareText = `📌 แนะนำสินค้า:\n📦 ชื่อสินค้า: ${product.name}\n🏷️ รหัสสินค้า: ${product.product_code || '-'}\n👤 ยี่ห้อ: ${product.brand || '-'}\n📁 หมวดสินค้า: ${product.category || '-'}\n💰 ราคา: ฿${product.price.toLocaleString()}\n🏷️ แท็ก: ${Array.isArray(product.tags) ? product.tags.map(t => `#${t}`).join(' ') : '-'}\n🖼️ ลิ้งค์รูปภาพ: ${product.image_url}`;
    
    const shareUrl = config.line.liffId 
      ? `https://liff.line.me/${config.line.liffId}?shareText=${encodeURIComponent(shareText)}`
      : `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

    const tagsStr = Array.isArray(product.tags) && product.tags.length > 0
      ? product.tags.map(t => `#${t}`).join(' ')
      : '-';

    // ปุ่มมาตรฐานสำหรับการดูรูปและส่งให้ลูกค้า
    const standardFooterContents = [
      {
        type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
          {
            type: 'button', style: 'primary', height: 'sm', color: '#06C755', flex: 1,
            action: { type: 'uri', label: '📤 แชร์ให้ลูกค้า', uri: shareUrl }
          },
          {
            type: 'button', style: 'secondary', height: 'sm', flex: 1,
            action: { type: 'uri', label: '🔎 ดูรูปเต็ม', uri: product.image_url }
          }
        ]
      }
    ];

    // หากอยู่ในโหมดแก้ไข (isEditing === true) จึงจะแสดงปุ่ม 1-Tap เพิ่มเติม
    if (isEditing) {
      standardFooterContents.push(
        {
          type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
            {
              type: 'button', style: 'primary', height: 'sm', color: '#3B82F6', flex: 1,
              action: { type: 'message', label: '📦 เปลี่ยนชื่อสินค้า', text: `ขอเปลี่ยนชื่อสินค้า ${product.name}` }
            },
            {
              type: 'button', style: 'primary', height: 'sm', color: '#10B981', flex: 1,
              action: { type: 'message', label: '🏷️ เปลี่ยนรหัสสินค้า', text: `ขอเปลี่ยนรหัสสินค้า ${product.name}` }
            }
          ]
        },
        {
          type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
            {
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: '👤 เปลี่ยนยี่ห้อ', text: `ขอเปลี่ยนยี่ห้อสินค้า ${product.name}` }
            },
            {
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: '📁 เปลี่ยนหมวดสินค้า', text: `ขอเปลี่ยนหมวดสินค้า ${product.name}` }
            }
          ]
        },
        {
          type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
            {
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: '💰 เปลี่ยนราคา', text: `ขอเปลี่ยนราคาสินค้า ${product.name}` }
            },
            {
              type: 'button', style: 'secondary', height: 'sm', flex: 1,
              action: { type: 'message', label: '🏷️ +เพิ่มแท็กสินค้า', text: `ขอเพิ่มแท็กสินค้า ${product.name}` }
            }
          ]
        },
        {
          type: 'button', style: 'primary', height: 'sm', color: '#F59E0B',
          action: { type: 'message', label: '🖼️ เปลี่ยนลิ้งค์รูปภาพ', text: `ขอเปลี่ยนรูปสินค้า ${product.name}` }
        }
      );
    }

    return {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: product.image_url,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        action: { type: 'uri', label: 'ดูรูปขนาดใหญ่', uri: product.image_url }
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'text', text: product.name, weight: 'bold', size: 'md', wrap: true, maxLines: 2, color: '#111111' },
          { type: 'text', text: `🏷️ รหัส: ${product.product_code || '-'} | 👤 ยี่ห้อ: ${product.brand || '-'}`, size: 'xs', color: '#3B82F6', weight: 'bold' },
          { type: 'text', text: `📁 หมวดสินค้า: ${product.category || '-'}`, size: 'xs', color: '#6B7280' },
          {
            type: 'box', layout: 'baseline', margin: 'xs', contents: [
              { type: 'text', text: `฿${product.price.toLocaleString()}`, weight: 'bold', size: 'lg', color: '#00B900' },
              { type: 'text', text: ` (${product.stock || 10} ชิ้น)`, size: 'xs', color: '#666666', margin: 'sm' }
            ]
          },
          { type: 'text', text: `🏷️ แท็ก: ${tagsStr}`, size: 'xs', color: '#D97706', wrap: true, margin: 'xs' }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: standardFooterContents
      }
    };
  });

  return {
    type: 'flex',
    altText: `พบสินค้า ${products.length} รายการ`,
    contents: { type: 'carousel', contents: bubbles }
  };
}

/**
 * 11. การ์ดหมวดแก้ไขสินค้า (Edit Product Flex Card - 7 หัวข้อหลัก อ้างอิงจากรหัสสินค้า SKU เท่านั้น)
 */
export function buildEditProductFlex(product) {
  if (!product) return null;

  const code = product.product_code || product.name;

  const tagsStr = Array.isArray(product.tags) && product.tags.length > 0
    ? product.tags.map(t => `#${t}`).join(' ')
    : '-';

  return {
    type: 'flex',
    altText: `แก้ไขสินค้า รหัส: ${product.product_code}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#4F46E5', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '✏️ หมวดแก้ไขสินค้า (แก้ไขจากรหัสสินค้า)', color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: `🏷️ รหัสสินค้า (SKU): ${product.product_code} | 📦 ${product.name}`, color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: `🏷️ 1. รหัสสินค้า (SKU): ${product.product_code || '-'}`, size: 'sm', color: '#1E40AF', weight: 'bold' },
              { type: 'text', text: `📦 2. ชื่อสินค้า: ${product.name}`, size: 'sm', color: '#111111' },
              { type: 'text', text: `👤 3. ยี่ห้อ (แบรนด์): ${product.brand || '-'}`, size: 'sm', color: '#374151' },
              { type: 'text', text: `📁 4. หมวดสินค้า: ${product.category || '-'}`, size: 'sm', color: '#6B7280' },
              { type: 'text', text: `💰 5. ราคา: ฿${product.price.toLocaleString()} (${product.stock || 10} ชิ้น)`, size: 'sm', color: '#059669', weight: 'bold' },
              { type: 'text', text: `🏷️ 6. แท็ก: ${tagsStr}`, size: 'sm', color: '#D97706', wrap: true },
              { type: 'text', text: `🖼️ 7. ลิ้งค์รูปภาพ: ${product.image_url}`, size: 'xs', color: '#2563EB', wrap: true }
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'text',
            text: `👇 กดปุ่ม 1-Tap ด้านล่างเพื่อเลือกแก้ไขหัวข้อของรหัส "${code}" ได้เลยค่ะ:`,
            size: 'xs',
            color: '#666666',
            weight: 'bold'
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'primary', height: 'sm', color: '#3B82F6', flex: 1,
                action: { type: 'message', label: '📦 1. แก้ไขชื่อสินค้า', text: `ขอเปลี่ยนชื่อสินค้า ${code}` }
              },
              {
                type: 'button', style: 'primary', height: 'sm', color: '#10B981', flex: 1,
                action: { type: 'message', label: '🏷️ 2. แก้ไขรหัสสินค้า', text: `ขอเปลี่ยนรหัสสินค้า ${code}` }
              }
            ]
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '👤 3. แก้ไขยี่ห้อ', text: `ขอเปลี่ยนยี่ห้อสินค้า ${code}` }
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '📁 4. แก้ไขหมวดสินค้า', text: `ขอเปลี่ยนหมวดสินค้า ${code}` }
              }
            ]
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '💰 5. แก้ไขราคา', text: `ขอเปลี่ยนราคาสินค้า ${code}` }
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '🏷️ 6. แก้ไขแท็ก', text: `ขอเพิ่มแท็กสินค้า ${code}` }
              }
            ]
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#F59E0B',
            action: { type: 'message', label: '🖼️ 7. แก้ไขลิ้งค์รูปภาพ', text: `ขอเปลี่ยนรูปสินค้า ${code}` }
          }
        ]
      }
    }
  };
}

/**
 * 10. การ์ดเพิ่มสินค้าใหม่พร้อมปุ่ม 1-Tap แยกตาม 7 หัวข้อหลัก (Add Product Form Guide Card with 7 1-Tap Buttons)
 */
export function buildAddProductGuideFlex() {
  const exampleText = 'เพิ่มสินค้า: ชื่อสินค้า เสื้อเชิ้ตคอตตอน, รหัสสินค้า SKU-SHIRT-01, ยี่ห้อ Arrow, หมวดสินค้า เสื้อผ้า, ราคา 890 บาท, แท็ก #เสื้อเชิ้ต #คอตตอน #Arrow, ลิ้งค์รูปภาพ https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500';

  return {
    type: 'flex',
    altText: 'แบบฟอร์มเพิ่มสินค้าใหม่ 7 หัวข้อหลัก',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#06C755', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🛍️ แบบฟอร์มเพิ่มสินค้าใหม่ (7 หัวข้อหลัก)', color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: 'กดปุ่ม 1-Tap หัวข้อด้านล่าง แล้วพิมพ์เฉพาะค่านั้นส่งมาได้เลยค่ะ!', color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'text',
            text: '👇 กดปุ่ม 1-Tap ด้านล่างเพื่อพิมพ์ป้อนข้อมูลทีละหัวข้อได้ทันที:',
            size: 'sm',
            color: '#111111',
            weight: 'bold'
          },
          { type: 'separator', margin: 'xs' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '1️⃣ 📦 [ 📦 1. เพิ่มชื่อสินค้า ] ➡️ พิมพ์ชื่อส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '2️⃣ 🏷️ [ 🏷️ 2. เพิ่มรหัสสินค้า ] ➡️ พิมพ์รหัสส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '3️⃣ 👤 [ 👤 3. เพิ่มยี่ห้อ ] ➡️ พิมพ์ยี่ห้อส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '4️⃣ 📁 [ 📁 4. เพิ่มหมวดสินค้า ] ➡️ พิมพ์หมวดส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '5️⃣ 💰 [ 💰 5. เพิ่มราคา ] ➡️ พิมพ์ราคาส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '6️⃣ 🏷️ [ 🏷️ 6. เพิ่มแท็ก ] ➡️ พิมพ์แท็กส่งไป', size: 'xs', color: '#333333' },
              { type: 'text', text: '7️⃣ 🖼️ [ 🖼️ 7. เพิ่มลิ้งค์รูปภาพ ] ➡️ แปะลิงก์ส่งไป', size: 'xs', color: '#333333' }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'primary', height: 'sm', color: '#3B82F6', flex: 1,
                action: { type: 'message', label: '📦 1. เพิ่มชื่อสินค้า', text: 'ขอเปลี่ยนชื่อสินค้า สินค้าใหม่' }
              },
              {
                type: 'button', style: 'primary', height: 'sm', color: '#10B981', flex: 1,
                action: { type: 'message', label: '🏷️ 2. เพิ่มรหัสสินค้า', text: 'ขอเปลี่ยนรหัสสินค้า สินค้าใหม่' }
              }
            ]
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '👤 3. เพิ่มยี่ห้อ', text: 'ขอเปลี่ยนยี่ห้อสินค้า สินค้าใหม่' }
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '📁 4. เพิ่มหมวดสินค้า', text: 'ขอเปลี่ยนหมวดสินค้า สินค้าใหม่' }
              }
            ]
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '💰 5. เพิ่มราคา', text: 'ขอเปลี่ยนราคาสินค้า สินค้าใหม่' }
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'message', label: '🏷️ 6. เพิ่มแท็ก', text: 'ขอเพิ่มแท็กสินค้า สินค้าใหม่' }
              }
            ]
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#F59E0B',
            action: { type: 'message', label: '🖼️ 7. เพิ่มลิ้งค์รูปภาพ', text: 'ขอเปลี่ยนรูปสินค้า สินค้าใหม่' }
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#06C755',
            action: { type: 'message', label: '✍️ พิมพ์รวดเดียวครบ 7 หัวข้อ', text: exampleText }
          }
        ]
      }
    }
  };
}

/**
 * 2. ข้อมูลพื้นฐานร้านค้า (Store Profile Flex Card - 7 หัวข้อหลัก)
 */
export function buildStoreGeneralInfoFlex(store, isRecordingSession = false, contextId = 'default') {
  if (!store) return null;
  const ctx = store.context_id || contextId || 'default';
  const info = store.general_info || store;
  const activeSession = sessionStore.getActiveStoreSession(ctx);
  const activeStoreName = activeSession ? activeSession.storeName : null;
  const lastStoreName = sessionStore.getLastStore(ctx);

  const isSessionActive = isRecordingSession || (activeSession && activeSession.isRecording === true);

  const displayName = store.store_name || 
                      (store.general_info && store.general_info.store_name) || 
                      store.name || 
                      activeStoreName || 
                      lastStoreName || 
                      'ร้านค้า';

  const contactBoxContents = [];

  // 1. รายชื่อผู้ติดต่อ
  if (Array.isArray(info.contact_persons) && info.contact_persons.length > 0) {
    const label = info.contact_persons.length > 1
      ? `👥 รายชื่อผู้ติดต่อ (${info.contact_persons.length} คน):`
      : `👥 รายชื่อผู้ติดต่อ:`;

    contactBoxContents.push({ type: 'text', text: label, size: 'sm', color: '#06C755', weight: 'bold' });

    info.contact_persons.forEach((person, idx) => {
      contactBoxContents.push({
        type: 'text',
        text: `${idx + 1}. 👤 ${person}`,
        size: 'sm',
        color: '#111111',
        wrap: true,
        margin: 'xs'
      });
    });
  } else {
    contactBoxContents.push({
      type: 'text',
      text: `👥 รายชื่อผู้ติดต่อ: ${info.contact_person || 'ยังไม่มีข้อมูล'}`,
      size: 'sm',
      color: '#333333'
    });
  }

  // 2. เบอร์โทรศัพท์หลัก
  contactBoxContents.push({ type: 'text', text: `📞 เบอร์โทรศัพท์หลัก: ${info.phone || 'ยังไม่มีข้อมูล'}`, size: 'sm', color: '#333333', margin: 'md' });

  // 3. ที่อยู่ร้าน
  contactBoxContents.push({ type: 'text', text: `📍 ที่อยู่ร้าน: ${info.address || 'ยังไม่มีข้อมูล'}`, size: 'sm', color: '#333333', wrap: true });

  // 4. แผนที่ร้าน
  contactBoxContents.push({ type: 'text', text: `🗺️ แผนที่ร้าน: ${info.map_url || 'ยังไม่มีข้อมูล'}`, size: 'sm', color: info.map_url ? '#3B82F6' : '#333333', wrap: true });

  // 5. จัดส่งโดย
  const deliveryVal = info.delivery_by || info.delivery_schedule || 'ยังไม่มีข้อมูล';
  contactBoxContents.push({ type: 'text', text: `🚚 จัดส่งโดย: ${deliveryVal}`, size: 'sm', color: '#333333' });

  // 6. เครดิตเทอม
  contactBoxContents.push({ type: 'text', text: `💳 เครดิตเทอม: ${info.credit_days || 0} วัน`, size: 'sm', color: '#06C755', weight: 'bold' });

  const footerButtons = [
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'primary', height: 'sm', color: '#06C755', flex: 1,
          action: { type: 'message', label: '👥 +เพิ่มผู้ติดต่อ', text: `ขอเพิ่มผู้ติดต่อร้าน${displayName}` }
        },
        {
          type: 'button', style: 'primary', height: 'sm', color: '#3B82F6', flex: 1,
          action: { type: 'message', label: '📞 เปลี่ยนเบอร์', text: `ขอเปลี่ยนเบอร์ร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '📍 เปลี่ยนที่อยู่', text: `ขอเปลี่ยนที่อยู่ร้าน${displayName}` }
        },
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '🗺️ ใส่แผนที่', text: `ขอใส่แผนที่ร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '🚚 เปลี่ยนจัดส่ง', text: `ขอเปลี่ยนจัดส่งร้าน${displayName}` }
        },
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '💳 เปลี่ยนเครดิต', text: `ขอเปลี่ยนเครดิตร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'button', style: 'primary', height: 'sm', color: '#F59E0B',
      action: { type: 'message', label: '📌 +เพิ่มโน้ตใหม่', text: `ขอเพิ่มโน้ตร้าน${displayName}` }
    }
  ];

  if (isSessionActive) {
    footerButtons.push({
      type: 'button', style: 'primary', height: 'sm', color: '#10B981', margin: 'md',
      action: { type: 'message', label: '✅ จบการบันทึกข้อมูลพื้นฐานร้านค้า', text: `จบการบันทึกข้อมูลร้าน ${displayName}` }
    });
  }

  return {
    type: 'flex',
    altText: `ข้อมูลร้านค้า: ${displayName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: isSessionActive ? '#10B981' : '#06C755', paddingAll: 'lg',
        contents: [
          { type: 'text', text: isSessionActive ? '🔄 กำลังบันทึกข้อมูลพื้นฐานร้านค้า (โหมดบันทึกต่อเนื่อง)' : '🏬 ข้อมูลพื้นฐานร้านค้า (Store Profile)', color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: displayName, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: contactBoxContents
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', margin: 'xs', contents: [
              { type: 'text', text: '📌 โน้ตเพิ่มเติม:', size: 'xs', color: '#888888', weight: 'bold' },
              { type: 'text', text: info.notes || 'ไม่มีโน้ตเพิ่มเติม', size: 'sm', color: '#222222', wrap: true, margin: 'xs' }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: footerButtons
      }
    }
  };
}

/**
 * 3. ข้อมูลการขายของร้านค้า (Store Sales Details Flex Card)
 */
export function buildStoreSalesDetailsFlex(store, isRecordingSession = false, contextId = 'default') {
  if (!store) return null;
  const ctx = store.context_id || contextId || 'default';
  const details = store.sales_details || {};
  const activeSession = sessionStore.getActiveStoreSession(ctx);
  const activeStoreName = activeSession ? activeSession.storeName : null;
  const lastStoreName = sessionStore.getLastStore(ctx);

  const isSessionActive = isRecordingSession || (activeSession && activeSession.isRecording === true);
  const displayName = store.store_name || (store.general_info && store.general_info.store_name) || store.name || activeStoreName || lastStoreName || 'ร้านค้า';

  const brandsStr = Array.isArray(details.brands_sold) && details.brands_sold.length > 0 
    ? details.brands_sold.join(', ') 
    : (details.brands_sold || 'ไม่ระบุ');
  const orderedItemsStr = Array.isArray(details.ordered_items) && details.ordered_items.length > 0 
    ? details.ordered_items.join('\n• ') 
    : 'ไม่มีรายการสั่งซื้อย้อนหลัง';
  const topSellingStr = Array.isArray(details.top_selling_products) && details.top_selling_products.length > 0
    ? details.top_selling_products.join('\n• ')
    : (Array.isArray(details.top_purchased_products) ? details.top_purchased_products.join('\n• ') : 'ไม่มีข้อมูล');

  const year = details.calendar_year || new Date().getFullYear();
  const buddhistYear = year + 543;
  const monthlyVal = (details.monthly_sales || details.last_order_amount || 0).toLocaleString();
  const yearlyVal = (details.yearly_sales_ytd || details.total_sales_ytd || 0).toLocaleString();

  const yearlyBreakdownContents = [];
  if (Array.isArray(details.yearly_breakdown) && details.yearly_breakdown.length > 0) {
    details.yearly_breakdown.forEach(yb => {
      yearlyBreakdownContents.push({
        type: 'text',
        text: `  • ปี ${yb.year} (พ.ศ. ${yb.buddhistYear}): ฿${yb.total.toLocaleString()}`,
        size: 'sm',
        color: '#1E3A8A',
        weight: 'bold'
      });
    });
  } else {
    yearlyBreakdownContents.push({
      type: 'text',
      text: `  • ปี ${year} (พ.ศ. ${buddhistYear}): ฿${yearlyVal}`,
      size: 'sm',
      color: '#1E3A8A',
      weight: 'bold'
    });
  }

  const footerButtons = [
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'primary', height: 'sm', color: '#3B82F6', flex: 1,
          action: { type: 'message', label: '💳 ประเภทการชำระ', text: `ขอเปลี่ยนประเภทชำระร้าน${displayName}` }
        },
        {
          type: 'button', style: 'primary', height: 'sm', color: '#10B981', flex: 1,
          action: { type: 'message', label: '🏷️ +เพิ่มแบรนด์ที่ขาย', text: `ขอเปลี่ยนแบรนด์ร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '📅 สั่งซื้อล่าสุด', text: `ขอเปลี่ยนวันสั่งล่าสุดร้าน${displayName}` }
        },
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '💵 ยอดขายล่าสุด', text: `ขอเพิ่มยอดขายล่าสุดร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'primary', height: 'sm', color: '#059669', flex: 1,
          action: { type: 'message', label: '📦 +เพิ่มสินค้าที่สั่ง', text: `ขอเพิ่มสินค้าที่สั่งร้าน${displayName}` }
        },
        {
          type: 'button', style: 'primary', height: 'sm', color: '#F59E0B', flex: 1,
          action: { type: 'message', label: '⭐ +เพิ่มสินค้าขายดี', text: `ขอเพิ่มสินค้าขายดีร้าน${displayName}` }
        }
      ]
    }
  ];

  if (isSessionActive) {
    footerButtons.push({
      type: 'button', style: 'primary', height: 'sm', color: '#10B981', margin: 'md',
      action: { type: 'message', label: '✅ จบการบันทึกข้อมูลร้านค้า', text: `จบการบันทึกข้อมูลร้าน ${displayName}` }
    });
  }

  return {
    type: 'flex',
    altText: `ข้อมูลการขาย: ${displayName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: isSessionActive ? '#10B981' : '#3B82F6', paddingAll: 'lg',
        contents: [
          { type: 'text', text: isSessionActive ? '🔄 กำลังบันทึกข้อมูลการขาย (โหมดบันทึกต่อเนื่อง)' : '📊 ข้อมูลการขาย (Sales Performance)', color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: displayName, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: `💳 ประเภทการชำระ: ${details.payment_type || details.payment_status || 'ไม่ระบุ'}`, size: 'sm', color: '#1E40AF', weight: 'bold' },
              { type: 'text', text: `🏷️ แบรนด์ที่ขาย (ต่อท้ายสะสม): ${brandsStr}`, size: 'sm', color: '#4B5563', wrap: true },
              { type: 'text', text: `📅 สั่งซื้อล่าสุด: ${details.last_order_date || '-'}`, size: 'sm', color: '#4B5563' },
              { type: 'text', text: `💵 ยอดขายล่าสุด: ฿${(details.last_order_amount || 0).toLocaleString()}`, size: 'sm', color: '#10B981', weight: 'bold' },
              { type: 'text', text: `📊 ยอดขายสะสมปีปฏิทิน ${year} (พ.ศ. ${buddhistYear}):`, size: 'xs', color: '#2563EB', weight: 'bold', margin: 'xs' },
              { type: 'text', text: `  • ยอดรวมปีนี้ (YTD): ฿${yearlyVal}`, size: 'sm', color: '#1E3A8A', weight: 'bold' },
              { type: 'text', text: `  • ยอดรวมเดือนนี้: ฿${monthlyVal}`, size: 'sm', color: '#2563EB' }
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '🗓️ ยอดขายรายปี (ผลรวมยอดขายที่เกิดขึ้นแต่ละปีในระบบ):', size: 'xs', color: '#1E3A8A', weight: 'bold' },
              ...yearlyBreakdownContents
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '📦 สินค้าที่สั่ง (ต่อท้ายสะสมเพิ่มให้อัตโนมัติ):', size: 'xs', color: '#6B7280', weight: 'bold' },
              { type: 'text', text: orderedItemsStr, size: 'sm', color: '#1F2937', wrap: true, margin: 'xs' }
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '⭐ สินค้าขายดีประจำร้าน (ต่อท้ายสะสมเพิ่มให้อัตโนมัติ):', size: 'xs', color: '#6B7280', weight: 'bold' },
              { type: 'text', text: topSellingStr, size: 'sm', color: '#D97706', weight: 'bold', wrap: true, margin: 'xs' }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: footerButtons
      }
    }
  };
}

/**
 * 4. โอกาสเสนอขายของร้านค้า (Store Sales Opportunities Flex Card)
 */
export function buildStoreSalesOpportunitiesFlex(store, isRecordingSession = false, contextId = 'default') {
  if (!store) return null;
  const ctx = store.context_id || contextId || 'default';
  const opp = store.sales_opportunities || {};
  const info = store.general_info || {};
  const activeSession = sessionStore.getActiveStoreSession(ctx);
  const activeStoreName = activeSession ? activeSession.storeName : null;
  const lastStoreName = sessionStore.getLastStore(ctx);

  const isSessionActive = isRecordingSession || (activeSession && activeSession.isRecording === true);
  const displayName = store.store_name || (store.general_info && store.general_info.store_name) || store.name || activeStoreName || lastStoreName || 'ร้านค้า';

  const googleCalUrl = generateGoogleCalendarUrl(displayName, opp, info);

  const footerButtons = [
    {
      type: 'button', style: 'primary', height: 'sm', color: '#4285F4',
      action: { type: 'uri', label: '📅 ➕ เพิ่มนัดหมายลง Google Calendar', uri: googleCalUrl }
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'primary', height: 'sm', color: '#F59E0B', flex: 1,
          action: { type: 'message', label: '🎯 เปลี่ยนสถานะ', text: `ขอเปลี่ยนสถานะโอกาสร้าน${displayName}` }
        },
        {
          type: 'button', style: 'primary', height: 'sm', color: '#059669', flex: 1,
          action: { type: 'message', label: '🛍️ +เพิ่มสินค้าแนะนำ', text: `ขอเพิ่มสินค้าแนะนำร้าน${displayName}` }
        }
      ]
    },
    {
      type: 'button', style: 'primary', height: 'sm', color: '#D97706',
      action: { type: 'message', label: '💡 +เพิ่มเหตุผล/โอกาสทอง', text: `ขอเพิ่มเหตุผลโอกาสทองร้าน${displayName}` }
    },
    {
      type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '🗑️ เลือกลบสินค้าแนะนำ', text: `ขอเลือกลบสินค้าแนะนำร้าน${displayName}` }
        },
        {
          type: 'button', style: 'secondary', height: 'sm', flex: 1,
          action: { type: 'message', label: '🗓️ เปลี่ยนแผนงานเสนอขาย', text: `ขอเปลี่ยนแผนงานวันเข้าเสนอขายร้าน${displayName}` }
        }
      ]
    }
  ];

  if (isSessionActive) {
    footerButtons.push({
      type: 'button', style: 'primary', height: 'sm', color: '#10B981', margin: 'md',
      action: { type: 'message', label: '✅ จบการบันทึกข้อมูลร้านค้า', text: `จบการบันทึกข้อมูลร้าน ${displayName}` }
    });
  }

  return {
    type: 'flex',
    altText: `โอกาสเสนอขาย: ${displayName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: isSessionActive ? '#10B981' : '#F59E0B', paddingAll: 'lg',
        contents: [
          { type: 'text', text: isSessionActive ? '🔄 กำลังบันทึกโอกาสเสนอขาย (โหมดบันทึกต่อเนื่อง)' : '🎯 โอกาสเสนอขาย (Sales Opportunity & Pitch)', color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: displayName, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: `สถานะโอกาส: ${opp.opportunity_status || 'ทั่วไป'}`, size: 'md', color: '#D97706', weight: 'bold' },
              { type: 'text', text: `🗓️ แผนงานวันเข้าเสนอขาย: ${opp.target_pitch_date || 'ยังไม่ระบุ'}`, size: 'sm', color: '#1D4ED8', weight: 'bold' },
              { type: 'text', text: `📅 Google Calendar: พร้อมซิงก์นัดหมายลงปฏิทิน`, size: 'xs', color: '#059669', weight: 'bold', margin: 'xs' }
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', contents: [
              { type: 'text', text: '💡 เหตุผล / โอกาสทอง:', size: 'xs', color: '#92400E', weight: 'bold' },
              { type: 'text', text: opp.reason || 'ยังไม่มีโน้ตเหตุผล', size: 'sm', color: '#1F2937', wrap: true, margin: 'xs' }
            ]
          },
          {
            type: 'box', layout: 'vertical', margin: 'sm', contents: [
              { type: 'text', text: '🛍️ สินค้าแนะนำเสนอขาย (Upsell/Cross-sell):', size: 'xs', color: '#92400E', weight: 'bold' },
              { type: 'text', text: Array.isArray(opp.recommended_products) && opp.recommended_products.length > 0 ? opp.recommended_products.join('\n• ') : (opp.recommended_products || 'ไม่มี'), size: 'sm', color: '#059669', weight: 'bold', wrap: true, margin: 'xs' }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: footerButtons
      }
    }
  };
}

/**
 * 4.1 สร้างการ์ดครบทั้ง 3 หมวดหมู่พร้อมกันเสมอ (All 3 Category Flex Cards Helper)
 */
export function buildAll3CategoryFlexCards(store, isRecordingSession = false) {
  if (!store) return null;
  return [
    buildStoreGeneralInfoFlex(store, isRecordingSession),
    buildStoreSalesDetailsFlex(store, isRecordingSession),
    buildStoreSalesOpportunitiesFlex(store, isRecordingSession)
  ].filter(Boolean);
}

/**
 * 9. การ์ดดึงรายการสินค้าแนะนำให้เลือกลบ
 */
export function buildDeleteRecommendedProductsFlex(store) {
  if (!store || !store.sales_opportunities) return null;
  const recList = Array.isArray(store.sales_opportunities.recommended_products)
    ? store.sales_opportunities.recommended_products
    : [];

  if (recList.length === 0) return null;

  const itemButtons = recList.map((item, idx) => ({
    type: 'button',
    style: 'primary',
    height: 'sm',
    color: '#EF4444',
    action: {
      type: 'message',
      label: `🗑️ ลบ: ${item.length > 15 ? item.substring(0, 15) + '...' : item}`,
      text: `ลบสินค้าแนะนำ ${item} ร้าน${store.store_name}`
    }
  }));

  itemButtons.push({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    action: {
      type: 'message',
      label: '❌ ลบสินค้าแนะนำทั้งหมด',
      text: `ลบสินค้าแนะนำทั้งหมด ร้าน${store.store_name}`
    }
  });

  return {
    type: 'flex',
    altText: `เลือกลบสินค้าแนะนำร้าน ${store.store_name}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#EF4444', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🗑️ เลือกลบสินค้าแนะนำเสนอขาย', color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: `ร้าน: ${store.store_name}`, color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'text',
            text: `ปัจจุบันร้าน "${store.store_name}" มีสินค้าแนะนำ ${recList.length} รายการ ดังนี้:`,
            size: 'sm',
            color: '#111111',
            weight: 'bold'
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: recList.map((item, idx) => ({
              type: 'text',
              text: `${idx + 1}. 🛍️ ${item}`,
              size: 'sm',
              color: '#333333',
              wrap: true
            }))
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'text',
            text: 'กรุณากดปุ่มสินค้าที่ต้องการลบออก หรือกดลบทั้งหมดด้านล่างได้เลยค่ะ:',
            size: 'xs',
            color: '#666666',
            weight: 'bold'
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: itemButtons
      }
    }
  };
}

/**
 * 5. การ์ดสอบถามการอัปเดตข้อมูล (Confirmation Card - Replace vs Append)
 */
export function buildConfirmationFlex(storeName, categoryTitle, oldSummary, newSummary) {
  return {
    type: 'flex',
    altText: `สอบถามการบันทึกข้อมูลร้าน ${storeName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#F59E0B', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '⚠️ พบข้อมูลเดิมในระบบ', color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: `ร้าน: ${storeName}`, color: '#FFFFFF', size: 'lg', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'text',
            text: `ต้องการอัปเดต [${categoryTitle}] อย่างไรคะ?`,
            size: 'sm',
            color: '#111111',
            weight: 'bold'
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '📌 ข้อมูลเดิมในระบบ:', size: 'xs', color: '#888888', weight: 'bold' },
              { type: 'text', text: oldSummary || 'มีข้อมูลเดิมอยู่แล้ว', size: 'sm', color: '#666666', wrap: true }
            ]
          },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', margin: 'sm', contents: [
              { type: 'text', text: '✨ ข้อมูลใหม่ที่ได้รับ:', size: 'xs', color: '#06C755', weight: 'bold' },
              { type: 'text', text: newSummary || 'ข้อมูลใหม่ที่เพิ่งพิมพ์เข้ามา', size: 'sm', color: '#111111', wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', contents: [
          {
            type: 'button', style: 'primary', height: 'sm', color: '#EF4444',
            action: { type: 'message', label: '🔄 เปลี่ยนแปลง (แทนที่เดิม)', text: 'เปลี่ยนแปลง' }
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#06C755',
            action: { type: 'message', label: '➕ เพิ่มเติม (ต่อท้ายข้อมูลเดิม)', text: 'เพิ่มเติม' }
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'message', label: '❌ ยกเลิก', text: 'ยกเลิก' }
          }
        ]
      }
    }
  };
}

/**
 * 6. การ์ดเมนูเลือกหมวดหมู่สำหรับบันทึกข้อมูล (Guided Input Menu)
 */
export function buildCategoryMenuFlex() {
  return {
    type: 'flex',
    altText: 'คู่มือและแบบฟอร์มป้อนข้อมูล',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#06C755', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '📝 คู่มือ & แบบฟอร์มป้อนข้อมูล', color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: 'เลือกหมวดหมู่ที่ต้องการบันทึกด้านล่างได้เลยค่ะ', color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', contents: [
          { type: 'text', text: 'กรุณาเลือกหมวดหมู่ที่ต้องการแนะนำวิธีป้อนข้อมูล:', size: 'sm', color: '#333333', weight: 'bold' }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', contents: [
          {
            type: 'button', style: 'primary', height: 'sm', color: '#06C755',
            action: { type: 'message', label: '🏬 1. ฟอร์มข้อมูลพื้นฐานร้านค้า (7 หัวข้อ)', text: 'ขอฟอร์มข้อมูลร้านค้า' }
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#3B82F6',
            action: { type: 'message', label: '📊 2. ฟอร์มข้อมูลการขาย (7 หัวข้อ)', text: 'ขอฟอร์มข้อมูลการขาย' }
          },
          {
            type: 'button', style: 'primary', height: 'sm', color: '#F59E0B',
            action: { type: 'message', label: '🎯 3. ฟอร์มโอกาสเสนอขาย', text: 'ขอฟอร์มโอกาสเสนอขาย' }
          }
        ]
      }
    }
  };
}

/**
 * 7. การ์ดตัวอย่างแบบฟอร์มตามหมวดหมู่ (Form Template Guide Card)
 */
export function buildFormGuideFlex(categoryKey) {
  let title = '';
  let color = '#06C755';
  let templateText = '';
  let exampleText = '';

  if (categoryKey === 'general_info') {
    title = '🏬 แบบฟอร์ม [ข้อมูลพื้นฐานร้านค้า 7 หัวข้อ]';
    color = '#06C755';
    templateText = 'บันทึกร้าน [ชื่อร้าน]: ผู้ติดต่อ [ชื่อ], เบอร์โทรหลัก [เบอร์], ที่อยู่ร้าน [ที่อยู่], แผนที่ร้าน [ลิงก์], จัดส่งโดย [ขนส่ง], เครดิตเทอม [วัน] วัน, โน้ตเพิ่มเติม [โน้ต]';
    exampleText = 'บันทึกร้านทรัพย์ไพศาล: ผู้ติดต่อคุณสมชาย (ผู้จัดการ 081-222-3333), เบอร์โทรหลัก 081-222-3333, ที่อยู่ร้าน 45/6 ชลบุรี, แผนที่ร้าน https://maps.google.com/?q=13.81,100.56, จัดส่งโดย รถบริษัท, เครดิตเทอม 30 วัน, โน้ตเพิ่มเติม ให้โทรแจ้งล่วงหน้า';
  } else if (categoryKey === 'sales_details') {
    title = '📊 แบบฟอร์ม [ข้อมูลการขาย 7 หัวข้อ]';
    color = '#3B82F6';
    templateText = 'บันทึกข้อมูลการขายร้าน [ชื่อร้าน]: ประเภทการชำระ [วิธี], แบรนด์ที่ขาย [แบรนด์], สั่งซื้อล่าสุด [วันที่], ยอดขายล่าสุด [ยอดเงิน] บาท, สินค้าที่สั่ง [รายการ], สินค้าขายดี [รายการ]';
    exampleText = 'บันทึกข้อมูลการขายร้านทรัพย์ไพศาล: ประเภทการชำระ เงินสด, แบรนด์ที่ขาย Arrow และ GQ, สั่งซื้อล่าสุด 10 สิงหาคม, ยอดขายล่าสุด 25000 บาท, สินค้าที่สั่ง เสื้อเชิ้ต 10 ตัว, สินค้าขายดี เสื้อเชิ้ตคอตตอน';
  } else if (categoryKey === 'sales_opportunities') {
    title = '🎯 แบบฟอร์ม [โอกาสเสนอขาย]';
    color = '#F59E0B';
    templateText = 'บันทึกโอกาสเสนอขายร้าน [ชื่อร้าน]: โอกาส [สูง/ปานกลาง/ต่ำ] เสนอขาย [สินค้า] เหตุผล [เหตุผล] แผนงานวันเข้าเสนอขาย [วัน]';
    exampleText = 'บันทึกโอกาสเสนอขายร้านทรัพย์ไพศาล: โอกาสสูง เสนอขายกระเป๋าเป้สะพายหลัง เหตุผลเพราะร้านเปิดโซนใหม่ แผนงานวันเข้าเสนอขาย 15 กันยายน';
  } else if (categoryKey === 'products') {
    return buildAddProductGuideFlex();
  }

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: color, paddingAll: 'lg',
        contents: [
          { type: 'text', text: title, color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: 'คัดลอกตัวอย่างและแก้ไขข้อมูลเพื่อส่งให้ AI บันทึกได้เลยค่ะ', color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '📋 รูปแบบการพิมพ์ (Template):', size: 'xs', color: '#888888', weight: 'bold' },
              { type: 'text', text: templateText, size: 'sm', color: '#111111', wrap: true }
            ]
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '💡 ตัวอย่างการพิมพ์จริง (กดปุ่มด้านล่างเพื่อทดลองพิมพ์ได้เลย):', size: 'xs', color: '#06C755', weight: 'bold' },
              { type: 'text', text: exampleText, size: 'sm', color: '#333333', wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', contents: [
          {
            type: 'button', style: 'primary', height: 'sm', color: color,
            action: { type: 'message', label: '✍️ ทดลองส่งตัวอย่างนี้', text: exampleText }
          }
        ]
      }
    }
  };
}

/**
 * 8. การ์ดตอบโต้ขอข้อมูลตามหัวข้อ (Step-by-Step Interactive Wizard Prompt Card)
 */
export function buildWizardPromptFlex(storeName, categoryKey, mode) {
  let categoryTitle = 'ข้อมูลพื้นฐานร้านค้า';
  let color = '#06C755';
  let modeTitle = mode === 'replace' ? '🔄 เปลี่ยนแปลง (แทนที่เดิม)' : '➕ เพิ่มเติม (ต่อท้ายเดิม)';
  let fieldsList = [];
  let sampleTemplate = '';

  if (categoryKey === 'general_info') {
    categoryTitle = 'ข้อมูลพื้นฐานร้านค้า';
    color = '#06C755';
    fieldsList = [
      '1️⃣ 👥 รายชื่อผู้ติดต่อ (เช่น คุณสมชาย 081-222-3333, คุณนภา)',
      '2️⃣ 📞 เบอร์โทรศัพท์หลัก',
      '3️⃣ 📍 ที่อยู่ร้าน',
      '4️⃣ 🗺️ แผนที่ร้าน (ลิงก์ Google Maps / พิกัด)',
      '5️⃣ 🚚 จัดส่งโดย (ช่องทาง/รอบการจัดส่ง)',
      '6️⃣ 💳 เครดิตเทอม (เช่น 30 วัน)',
      '7️⃣ 📌 โน้ตเพิ่มเติม'
    ];
    sampleTemplate = `บันทึกร้าน${storeName}: ผู้ติดต่อคุณสมชาย 081-222-3333, เบอร์โทรศัพท์หลัก 081-222-3333, ที่อยู่ร้าน 45/6 ชลบุรี, แผนที่ร้าน https://maps.google.com/?q=13.81,100.56, จัดส่งโดย รถบริษัท, เครดิตเทอม 30 วัน, โน้ตเพิ่มเติม ให้โทรแจ้งก่อนส่ง`;
  } else if (categoryKey === 'sales_details') {
    categoryTitle = 'ข้อมูลการขาย';
    color = '#3B82F6';
    fieldsList = [
      '1️⃣ 💳 ประเภทการชำระ (เช่น โอนเงินผ่านธนาคาร / เครดิต 30 วัน)',
      '2️⃣ 🏷️ แบรนด์ที่ขาย (ต่อท้ายสะสมเพิ่มให้อัตโนมัติ)',
      '3️⃣ 📅 สั่งซื้อล่าสุด (เช่น 10 สิงหาคม 2026)',
      '4️⃣ 💵 ยอดขายล่าสุด (บาท)',
      '5️⃣ 📊 ยอดขายสะสมตามปีปฏิทิน (ระบบรวมสรุปให้อัตโนมัติเป็น เดือน, ปี)',
      '6️⃣ 🗓️ ยอดขายรายปี (แสดงผลรวมยอดขายที่เกิดขึ้นแต่ละปีที่มีในระบบ)',
      '7️⃣ 📦 สินค้าที่สั่ง (ต่อท้ายสะสมเพิ่มให้อัตโนมัติ)',
      '8️⃣ ⭐ สินค้าขายดี (ต่อท้ายสะสมเพิ่มให้อัตโนมัติ)'
    ];
    sampleTemplate = `บันทึกข้อมูลการขายร้าน${storeName}: ประเภทการชำระ เงินสด, แบรนด์ที่ขาย Arrow, สั่งซื้อล่าสุด 10 สิงหาคม, ยอดขายล่าสุด 25000 บาท, สินค้าที่สั่ง เสื้อเชิ้ต 10 ตัว, สินค้าขายดี เสื้อเชิ้ตคอตตอน`;
  } else if (categoryKey === 'sales_opportunities') {
    categoryTitle = 'โอกาสเสนอขาย';
    color = '#F59E0B';
    fieldsList = [
      '1️⃣ 🎯 สถานะโอกาส (สูง / ปานกลาง / ต่ำ)',
      '2️⃣ 🛍️ สินค้าแนะนำเสนอขาย (Upsell/Cross-sell - มีปุ่มเลือกลบออกได้)',
      '3️⃣ 💡 เหตุผล/โอกาสทอง',
      '4️⃣ 🗓️ แผนงานวันเข้าเสนอขาย (พร้อมปุ่ม 1-Tap ซิงค์ Google Calendar)'
    ];
    sampleTemplate = `บันทึกโอกาสเสนอขายร้าน${storeName}: โอกาสสูง เสนอขายกระเป๋าเป้สะพายหลัง เหตุผลร้านเปิดโซนใหม่ แผนงานวันเข้าเสนอขาย 15 กันยายน`;
  }

  return {
    type: 'flex',
    altText: `ขอข้อมูล [${categoryTitle}] ร้าน ${storeName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: color, paddingAll: 'lg',
        contents: [
          { type: 'text', text: `📝 ตอบโต้ป้อนข้อมูล: ${storeName}`, color: '#FFFFFF', size: 'md', weight: 'bold' },
          { type: 'text', text: `หมวด: ${categoryTitle} (${modeTitle})`, color: '#FFFFFF', size: 'xs', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          {
            type: 'text',
            text: 'กรุณาพิมพ์ตอบกลับข้อมูลตามหัวข้อที่ต้องการให้อัปเดตค่ะ:',
            size: 'sm',
            color: '#111111',
            weight: 'bold'
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: fieldsList.map(f => ({
              type: 'text', text: f, size: 'sm', color: '#333333', wrap: true
            }))
          },
          { type: 'separator', margin: 'sm' },
          {
            type: 'box', layout: 'vertical', spacing: 'xs', contents: [
              { type: 'text', text: '💡 สามารถพิมพ์ตอบกลับอิสระ หรือกดปุ่มด้านล่างเพื่อเริ่มป้อนได้ทันทีค่ะ:', size: 'xs', color: '#666666', weight: 'bold' }
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', contents: [
          {
            type: 'button', style: 'primary', height: 'sm', color: color,
            action: { type: 'message', label: '✍️ กดเพื่อเริ่มป้อนข้อมูลร้านนี้', text: sampleTemplate }
          }
        ]
      }
    }
  };
}

/**
 * ฟังก์ชันช่วยสกัดแยก "จังหวัด" และ "อำเภอ/เขต" จากข้อความที่อยู่
 */
export function parseAddressLocation(addressStr) {
  if (!addressStr || typeof addressStr !== 'string') {
    return { province: 'ไม่ระบุจังหวัด', district: 'ไม่ระบุอำเภอ' };
  }

  const str = addressStr.trim();
  let province = 'ไม่ระบุจังหวัด';
  let district = 'ไม่ระบุอำเภอ';

  // สกัดจังหวัด
  if (str.includes('กทม') || str.includes('กรุงเทพ')) {
    province = 'กรุงเทพมหานคร';
  } else {
    const provMatch = str.match(/(?:จ\.|จังหวัด)\s*([^\s,;]+)/);
    if (provMatch && provMatch[1]) {
      province = provMatch[1].trim();
    }
  }

  // สกัดอำเภอ / เขต
  const distMatch = str.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s,;]+)/);
  if (distMatch && distMatch[1]) {
    const prefix = str.includes('เขต') ? 'เขต' : 'อ.';
    const cleanDist = distMatch[1].replace(/^(อ\.|อำเภอ|เขต)/, '').trim();
    district = `${prefix}${cleanDist}`;
  }

  return { province, district };
}

/**
 * 10.1 การ์ดจัดกลุ่มร้านค้าตามจังหวัด (Province Directory Flex Card)
 */
export function buildProvinceGroupFlex(stores = []) {
  const provMap = {};

  stores.forEach(s => {
    const info = s.general_info || s;
    const addr = info.address || s.address || '';
    const loc = parseAddressLocation(addr);
    const prov = loc.province;
    if (!provMap[prov]) provMap[prov] = [];
    provMap[prov].push(s);
  });

  const provList = Object.keys(provMap);

  const provButtons = provList.map(prov => {
    const count = provMap[prov].length;
    return {
      type: 'button',
      style: 'primary',
      height: 'sm',
      color: prov === 'ไม่ระบุจังหวัด' ? '#6B7280' : '#4F46E5',
      margin: 'xs',
      action: {
        type: 'message',
        label: `📍 จ.${prov} (${count} ร้าน)`,
        text: `แสดงรายชื่อ จ.${prov}`
      }
    };
  });

  provButtons.push({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    margin: 'md',
    action: {
      type: 'message',
      label: `🏪 แสดงร้านค้าทั้งหมด (${stores.length} ร้าน)`,
      text: 'แสดงรายชื่อทั้งหมด'
    }
  });

  return {
    type: 'flex',
    altText: `กรุ๊ปรายชื่อร้านค้าตามจังหวัด (${provList.length} จังหวัด)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#4F46E5', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '📍 สมุดรายชื่อร้านค้าตามจังหวัด (Province Directory)', color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: `เลือกจังหวัด (พบ ${provList.length} จังหวัด)`, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: [
          { type: 'text', text: 'กรุณาเลือกจังหวัดที่ต้องการดูรายชื่อร้านค้าค่ะ:', size: 'sm', color: '#111827', weight: 'bold' },
          { type: 'separator', margin: 'sm' },
          ...provButtons
        ]
      }
    }
  };
}

/**
 * 10.2 การ์ดจัดกลุ่มย่อยตามอำเภอ/เขต (District Directory Flex Card)
 */
export function buildDistrictGroupFlex(provinceName, storesInProvince = []) {
  const distMap = {};

  storesInProvince.forEach(s => {
    const info = s.general_info || s;
    const addr = info.address || s.address || '';
    const loc = parseAddressLocation(addr);
    const dist = loc.district;
    if (!distMap[dist]) distMap[dist] = [];
    distMap[dist].push(s);
  });

  const distList = Object.keys(distMap);

  const distButtons = distList.map(dist => {
    const count = distMap[dist].length;
    return {
      type: 'button',
      style: 'primary',
      height: 'sm',
      color: '#059669',
      margin: 'xs',
      action: {
        type: 'message',
        label: `🏘️ ${dist} (${count} ร้าน)`,
        text: `แสดงรายชื่อ ${dist} จ.${provinceName}`
      }
    };
  });

  distButtons.push({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    margin: 'md',
    action: {
      type: 'message',
      label: `🏬 แสดงร้านทั้งหมดใน จ.${provinceName} (${storesInProvince.length} ร้าน)`,
      text: `แสดงรายชื่อทั้งหมด จ.${provinceName}`
    }
  });

  distButtons.push({
    type: 'button',
    style: 'secondary',
    height: 'sm',
    color: '#6B7280',
    margin: 'xs',
    action: {
      type: 'message',
      label: '⬅️ ย้อนกลับไปเลือกจังหวัด',
      text: 'แสดงรายชื่อ'
    }
  });

  return {
    type: 'flex',
    altText: `กรุ๊ปอำเภอใน จ.${provinceName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#059669', paddingAll: 'lg',
        contents: [
          { type: 'text', text: `🏘️ เลือกอำเภอ/เขต ใน จ.${provinceName}`, color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: `จ.${provinceName} (${distList.length} อำเภอ/เขต)`, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: [
          { type: 'text', text: `กรุณาเลือกอำเภอ/เขต ใน จ.${provinceName} ค่ะ:`, size: 'sm', color: '#111827', weight: 'bold' },
          { type: 'separator', margin: 'sm' },
          ...distButtons
        ]
      }
    }
  };
}

/**
 * 10.3 การ์ดแสดงรายชื่อร้านค้าตามตัวกรองที่เลือก (Filtered Stores List Flex Card)
 */
export function buildFilteredStoresListFlex(titleLabel, stores = []) {
  if (!Array.isArray(stores) || stores.length === 0) {
    return {
      type: 'flex',
      altText: `รายชื่อร้านค้า: ${titleLabel}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#4F46E5', paddingAll: 'lg',
          contents: [
            { type: 'text', text: `🏪 รายชื่อร้านค้า: ${titleLabel}`, color: '#FFFFFF', size: 'xs', weight: 'bold' },
            { type: 'text', text: 'ไม่พบร้านค้า', color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
          ]
        },
        body: {
          type: 'box', layout: 'vertical', contents: [
            { type: 'text', text: `ยังไม่มีข้อมูลร้านค้าในกลุ่ม ${titleLabel} ค่ะ`, size: 'sm', color: '#666666', wrap: true }
          ]
        },
        footer: {
          type: 'box', layout: 'vertical', contents: [
            {
              type: 'button', style: 'secondary', height: 'sm',
              action: { type: 'message', label: '⬅️ ย้อนกลับไปเลือกจังหวัด', text: 'แสดงรายชื่อ' }
            }
          ]
        }
      }
    };
  }

  const storeBoxes = [];

  stores.forEach((s, idx) => {
    const info = s.general_info || s;
    const rawName = s.store_name || info.store_name || s.name || `ร้านค้า ${idx + 1}`;
    const storeName = cleanStoreName(rawName);
    const address = info.address || s.address || 'ยังไม่มีข้อมูลที่อยู่';
    const phone = info.phone || s.phone || '-';

    if (idx > 0) {
      storeBoxes.push({ type: 'separator', margin: 'md' });
    }

    storeBoxes.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'xs',
      contents: [
        {
          type: 'text',
          text: `${idx + 1}. 🏪 ร้าน ${storeName}`,
          size: 'md',
          color: '#1E1B4B',
          weight: 'bold',
          wrap: true
        },
        { type: 'text', text: `📍 ที่อยู่: ${address}`, size: 'sm', color: '#4B5563', wrap: true },
        { type: 'text', text: `📞 เบอร์โทรศัพท์: ${phone}`, size: 'xs', color: '#059669' },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          color: '#3B82F6',
          action: { type: 'message', label: `🏬 ขอข้อมูลร้าน ${storeName}`, text: `ขอข้อมูลร้าน${storeName}` }
        }
      ]
    });
  });

  return {
    type: 'flex',
    altText: `รายชื่อร้านค้า: ${titleLabel} (${stores.length} ร้าน)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#4F46E5', paddingAll: 'lg',
        contents: [
          { type: 'text', text: `🏪 รายชื่อร้านค้า: ${titleLabel}`, color: '#FFFFFF', size: 'xs', weight: 'bold' },
          { type: 'text', text: `รวม ${stores.length} ร้านค้า`, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', contents: storeBoxes
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'xs', contents: [
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'message', label: '⬅️ ย้อนกลับไปเลือกจังหวัด', text: 'แสดงรายชื่อ' }
          }
        ]
      }
    }
  };
}

export function buildAllStoresListFlex(stores = []) {
  return buildProvinceGroupFlex(stores);
}
