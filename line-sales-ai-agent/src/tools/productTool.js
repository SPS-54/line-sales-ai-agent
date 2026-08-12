import { db } from '../database/db.js';

export const productToolDeclaration = {
  name: 'search_products',
  description: 'ค้นหาสินค้าจากฐานข้อมูลสินค้าตามคำค้นหา หมวดหมู่ สี หรือไซส์ และคืนค่ารายการสินค้าพร้อม URL รูปภาพ',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'คำค้นหาสินค้า เช่น "เสื้อเชิ้ต", "กระเป๋า", "สีดำ", "รองเท้า"'
      }
    },
    required: ['query']
  }
};

export async function executeSearchProducts(args) {
  const query = args.query || '';
  const results = db.searchProducts(query);
  return {
    count: results.length,
    query: query,
    products: results
  };
}
