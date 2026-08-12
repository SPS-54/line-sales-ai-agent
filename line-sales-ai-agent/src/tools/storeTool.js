import { db } from '../database/db.js';

// 1. รูปสินค้า (Product Images Declaration)
export const productToolDeclaration = {
  name: 'search_product_images',
  description: 'ดึงและค้นหารูปภาพสินค้าพร้อมรายละเอียดจากแคตตาล็อกสินค้า',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'คำค้นหาสินค้า เช่น "เสื้อเชิ้ต", "กระเป๋า", "สีดำ"' }
    },
    required: ['query']
  }
};

// 2. ข้อมูลร้านค้า (Store General Info)
export const getGeneralInfoDeclaration = {
  name: 'get_store_general_info',
  description: 'ดึงข้อมูลพื้นฐานของร้านค้า (ผู้ติดต่อ เบอร์โทร ที่อยู่ วันส่งของ เครดิตเทอม)',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' }
    },
    required: ['store_name']
  }
};

export const saveGeneralInfoDeclaration = {
  name: 'save_store_general_info',
  description: 'บันทึกหรืออัปเดตข้อมูลพื้นฐานของร้านค้า (รองรับ 7 หัวข้อหลัก)',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' },
      contact_person: { type: 'STRING', description: 'ชื่อผู้ติดต่อหลัก' },
      contact_persons: { type: 'ARRAY', items: { type: 'STRING' }, description: 'รายชื่อผู้ติดต่อทั้งหมดหลายคน' },
      phone: { type: 'STRING', description: 'เบอร์โทรศัพท์หลัก' },
      address: { type: 'STRING', description: 'ที่อยู่ร้าน' },
      map_url: { type: 'STRING', description: 'แผนที่ร้าน (ลิงก์ Google Maps/พิกัด)' },
      delivery_by: { type: 'STRING', description: 'จัดส่งโดย (ช่องทาง/รอบการจัดส่ง)' },
      credit_days: { type: 'NUMBER', description: 'เครดิตเทอม (วัน)' },
      notes: { type: 'STRING', description: 'โน้ตเพิ่มเติม' }
    },
    required: ['store_name']
  }
};

// 3. ข้อมูลการขายของร้านค้า (Store Sales Details)
export const getSalesDetailsDeclaration = {
  name: 'get_store_sales_details',
  description: 'ดึงข้อมูลการขายของร้านค้า (ยอดยอดขายสะสม YTD ประวัติการสั่ง รอบการสั่ง สินค้าขายดีประจำร้าน)',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' }
    },
    required: ['store_name']
  }
};

export const saveSalesDetailsDeclaration = {
  name: 'save_store_sales_details',
  description: 'บันทึกหรืออัปเดตข้อมูลการขายและยอดขายของร้านค้า',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' },
      total_sales_ytd: { type: 'NUMBER', description: 'ยอดขายสะสม YTD' },
      last_order_date: { type: 'STRING', description: 'วันที่สั่งซื้อล่าสุด' },
      order_frequency: { type: 'STRING', description: 'ความถี่ในการสั่งซื้อ' }
    },
    required: ['store_name']
  }
};

// 4. โอกาสเสนอขายของร้านค้า (Store Sales Opportunities)
export const getSalesOpportunitiesDeclaration = {
  name: 'get_store_sales_opportunities',
  description: 'ดึงข้อมูลโอกาสในการเสนอขายของร้านค้า (สินค้าแนะนำเพื่อ Upsell/Cross-sell เหตุผล และวันที่ควรเสนอขาย)',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' }
    },
    required: ['store_name']
  }
};

export const saveSalesOpportunitiesDeclaration = {
  name: 'save_store_sales_opportunities',
  description: 'บันทึกหรืออัปเดตโอกาสในการเสนอขายสำหรับร้านค้า',
  parameters: {
    type: 'OBJECT',
    properties: {
      store_name: { type: 'STRING', description: 'ชื่อร้านค้า' },
      opportunity_status: { type: 'STRING', description: 'ระดับโอกาส เช่น "สูง", "ปานกลาง"' },
      recommended_products: { type: 'ARRAY', items: { type: 'STRING' }, description: 'สินค้าที่แนะนำเสนอขาย' },
      reason: { type: 'STRING', description: 'เหตุผล/โอกาสเสนอขาย' },
      target_pitch_date: { type: 'STRING', description: 'เป้าหมายวันที่เสนอขาย' }
    },
    required: ['store_name', 'reason']
  }
};
