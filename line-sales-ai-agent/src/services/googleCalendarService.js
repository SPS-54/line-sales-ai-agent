/**
 * Google Calendar Integration Service
 * ช่วยสร้างลิงก์สำหรับกด 1-Tap เพิ่มนัดหมายเข้า Google Calendar อัตโนมัติ
 * (https://calendar.google.com/)
 */

// Helper: แปลงข้อความวันที่ไทย/ISO เป็น YYYYMMDD สำหรับ Google Calendar
export function formatGoogleCalendarDate(dateInput) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();

  if (dateInput) {
    const str = String(dateInput).trim();

    // 1. ISO format: YYYY-MM-DD
    const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1]);
      month = parseInt(isoMatch[2]);
      day = parseInt(isoMatch[3]);
    } else {
      // 2. Thai date format: e.g. 25 สิงหาคม 2569 or 15 กันยายน 2026
      const dayMatch = str.match(/(\d{1,2})/);
      if (dayMatch) day = parseInt(dayMatch[1]);

      const buddhistYearMatch = str.match(/25(\d{2})/);
      if (buddhistYearMatch) {
        year = 2000 + parseInt(buddhistYearMatch[1]);
      } else {
        const yearMatch = str.match(/20(\d{2})/);
        if (yearMatch) year = 2000 + parseInt(yearMatch[1]);
      }

      const monthMap = {
        'ม.ค.': 1, 'มกรา': 1, 'มกราคม': 1,
        'ก.พ.': 2, 'กุมภา': 2, 'กุมภาพันธ์': 2,
        'มี.ค.': 3, 'มีนา': 3, 'มีนาคม': 3,
        'เม.ย.': 4, 'เมษา': 4, 'เมษายน': 4,
        'พ.ค.': 5, 'พฤษภา': 5, 'พฤษภาคม': 5,
        'มิ.ย.': 6, 'มิถุนา': 6, 'มิถุนายน': 6,
        'ก.ค.': 7, 'กรกฎา': 7, 'กรกฎาคม': 7,
        'ส.ค.': 8, 'สิงหา': 8, 'สิงหาคม': 8,
        'ก.ย.': 9, 'กันยา': 9, 'กันยายน': 9,
        'ต.ค.': 10, 'ตุลา': 10, 'ตุลาคม': 10,
        'พ.ย.': 11, 'พฤศจิกา': 11, 'พฤศจิกายน': 11,
        'ธ.ค.': 12, 'ธันวา': 12, 'ธันวาคม': 12
      };

      for (const [key, mNum] of Object.entries(monthMap)) {
        if (str.includes(key)) {
          month = mNum;
          break;
        }
      }
    }
  }

  const pad = (n) => String(n).padStart(2, '0');
  const startDateStr = `${year}${pad(month)}${pad(day)}`;

  // วันถัดไปสำหรับ All-day event ใน Google Calendar
  const endDate = new Date(year, month - 1, day + 1);
  const endDateStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;

  return `${startDateStr}/${endDateStr}`;
}

/**
 * สร้างลิงก์สำหรับกดเพิ่มลง Google Calendar (Google Calendar Event URL)
 * ป้องกันข้อผิดพลาด LINE URI length limit (ต้องไม่เกิน 1,000 ตัวอักษร)
 */
export function generateGoogleCalendarUrl(storeName, opportunityData, generalInfoData = {}) {
  const targetDate = opportunityData?.target_pitch_date || '';
  const dateParam = formatGoogleCalendarDate(targetDate);

  const cleanName = (storeName || 'ร้านค้า').trim();
  const title = `🎯 เสนอขาย: ร้าน${cleanName}`;

  const recommendedStr = Array.isArray(opportunityData?.recommended_products) 
    ? opportunityData.recommended_products.join(', ') 
    : (opportunityData?.recommended_products || '-');

  let details = `🏬 ร้าน: ${cleanName}\n📌 สถานะ: ${opportunityData?.opportunity_status || 'ทั่วไป'}\n🛍️ สินค้าแนะนำ: ${recommendedStr}\n📞 เบอร์: ${generalInfoData?.phone || '-'}`;
  let location = (generalInfoData?.address || cleanName || '').trim();

  // จำกัดความยาวของที่อยู่ให้ไม่เกิน 60 ตัวอักษร
  if (location.length > 60) location = location.substring(0, 57) + '...';

  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${dateParam}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(location)}`;

  // หากความยาว URL เกิน 950 ตัวอักษร (ข้อจำกัดของ LINE คือไม่เกิน 1000) ให้ตัดย่อ details ลง
  if (url.length > 950) {
    const simpleDetails = `🏬 ร้าน: ${cleanName}\n📌 สถานะ: ${opportunityData?.opportunity_status || '-'}\n📞 เบอร์: ${generalInfoData?.phone || '-'}`;
    url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${dateParam}` +
      `&details=${encodeURIComponent(simpleDetails)}` +
      `&location=${encodeURIComponent(location)}`;
  }

  // หากยังเกิน 950 ตัวอักษร ให้ตัดรายละเอียดออกเหลือเฉพาะชื่ออีเวนต์และวันที่
  if (url.length > 950) {
    url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`🎯 เสนอขาย: ${cleanName}`)}` +
      `&dates=${dateParam}`;
  }

  return url;
}
