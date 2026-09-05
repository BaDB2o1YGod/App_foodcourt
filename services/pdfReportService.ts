import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Helper: Generate SVG Donut Chart for HTML
 */
const generateDonutSVG = (slices: {color: string; value: number}[], centerLabel: string, centerSub: string) => {
  const size = 160;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePercent = 0;
  let circles = '';

  if (total === 0) {
    circles = `<circle cx="${cx}" cy="${cy}" r="${radius}" stroke="#E5E7EB" stroke-width="${strokeWidth}" fill="transparent" />`;
  } else {
    slices.forEach((slice) => {
      if (slice.value === 0) return;
      const percent = slice.value / total;
      const offset = circumference * (1 - percent);
      const rotation = -90 + cumulativePercent * 360;
      cumulativePercent += percent;

      circles += `
        <circle 
          cx="${cx}" cy="${cy}" r="${radius}" 
          stroke="${slice.color}" 
          stroke-width="${strokeWidth}" 
          fill="transparent" 
          stroke-dasharray="${circumference}" 
          stroke-dashoffset="${offset}" 
          transform="rotate(${rotation} ${cx} ${cy})" 
        />
      `;
    });
  }

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="#F3F4F6" stroke-width="${strokeWidth}" fill="transparent" />
        ${circles}
      </svg>
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <span style="font-size: 24px; font-weight: 800; color: #1F2937;">${centerLabel}</span>
        <span style="font-size: 11px; color: #6B7280; margin-top: 2px;">${centerSub}</span>
      </div>
    </div>
  `;
};

const generateAndSharePDF = async (htmlContent: string, fileName: string) => {
  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: fileName,
      }).catch((err) => console.log('Share dismissed or error:', err));
    } else {
      console.warn('Sharing is not available on this platform');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * สร้างรายงานสรุปการซ่อมบำรุง (Maintenance Report) เป็น PDF
 */
export const exportMaintenanceReportPDF = async (
  repairs: any[], 
  titleExtra: string = '',
  categoryList: any[] = [],
  slotList: any[] = [],
  maxSlotCount: number = 1
) => {
  const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const pendingCount = repairs.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = repairs.filter((r) => r.status === 'IN_PROGRESS').length;
  const completedCount = repairs.filter((r) => r.status === 'COMPLETED').length;

  let categoryBars = '';
  categoryList.forEach(item => {
    categoryBars += `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
          <span>${item.category} (${item.count} ครั้ง)</span>
          <span style="color: #6B7280; font-weight: bold;">${item.percent}%</span>
        </div>
        <div style="height: 8px; background-color: #E5E7EB; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${item.percent}%; background-color: ${item.color};"></div>
        </div>
      </div>
    `;
  });

  let slotBars = '';
  slotList.forEach((item, index) => {
    const percent = maxSlotCount > 0 ? (item.count / maxSlotCount) * 100 : 0;
    const badge = ['', '', '', '', ''][index] || `${index + 1}.`;
    slotBars += `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
          <span>${badge} ${item.slot_number}</span>
          <span style="color: #80639A; font-weight: bold;">${item.count} ครั้ง</span>
        </div>
        <div style="height: 8px; background-color: #E5E7EB; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${percent}%; background-color: #80639A;"></div>
        </div>
      </div>
    `;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Sarabun', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1F2937; }
          .header { text-align: center; border-bottom: 2px solid #7C3AED; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { color: #7C3AED; font-size: 22px; margin: 0 0 6px 0; }
          .header p { color: #6B7280; font-size: 13px; margin: 0; }
          .summary-box { display: flex; justify-content: space-between; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
          .summary-item { text-align: center; }
          .summary-item .num { font-size: 18px; font-weight: bold; color: #1F2937; }
          .summary-item .label { font-size: 11px; color: #6B7280; }
          .charts-container { display: flex; gap: 20px; margin-bottom: 20px; }
          .chart-col { flex: 1; background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB; }
          .chart-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; color: #374151; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; font-size: 11px; }
          th { background-color: #F3F4F6; color: #374151; font-weight: bold; }
          tr:nth-child(even) { background-color: #FAFAFA; }
          .badge { display: inline-block; padding: 3px 6px; border-radius: 12px; font-size: 9px; font-weight: bold; }
          .status-COMPLETED { background-color: #DCFCE7; color: #166534; }
          .status-IN_PROGRESS { background-color: #DBEAFE; color: #1E40AF; }
          .status-PENDING { background-color: #FEF3C7; color: #92400E; }
          .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานสรุปการแจ้งซ่อมบำรุง</h1>
          <p>ระบบจัดการศูนย์อาหาร Food Court System ${titleExtra ? `(${titleExtra})` : ''}</p>
        </div>

        <div class="summary-box">
          <div class="summary-item"><div class="num">${repairs.length}</div><div class="label">งานทั้งหมด</div></div>
          <div class="summary-item"><div class="num" style="color: #92400E;">${pendingCount}</div><div class="label">รอดำเนินการ</div></div>
          <div class="summary-item"><div class="num" style="color: #1E40AF;">${inProgressCount}</div><div class="label">กำลังดำเนินการ</div></div>
          <div class="summary-item"><div class="num" style="color: #166534;">${completedCount}</div><div class="label">เสร็จสิ้น</div></div>
        </div>

        ${categoryList.length > 0 || slotList.length > 0 ? `
          <div class="charts-container">
            ${categoryList.length > 0 ? `
              <div class="chart-col">
                <div class="chart-title">🏷️ ประเภทงานซ่อมบ่อย</div>
                ${categoryBars}
              </div>
            ` : ''}
            ${slotList.length > 0 ? `
              <div class="chart-col">
                <div class="chart-title">ล็อคแจ้งซ่อมบ่อยสุด</div>
                ${slotBars}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">วันที่แจ้ง</th>
              <th style="width: 15%;">ล็อค</th>
              <th style="width: 30%;">รายการแจ้งซ่อม</th>
              <th style="width: 20%;">ผู้รับผิดชอบ</th>
              <th style="width: 20%;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${
              repairs.length === 0
                ? `<tr><td colspan="5" style="text-align: center; color: #9CA3AF;">ไม่มีข้อมูลการแจ้งซ่อม</td></tr>`
                : repairs.map((item) => {
                    const dateStr = item.requested_at ? new Date(item.requested_at).toLocaleDateString('th-TH') : '-';
                    const slotNo = item.slot?.slot_number ? `${item.slot.slot_number}` : '-';
                    const assignee = item.assignments?.[0]?.assignee
                      ? `${item.assignments[0].assignee.first_name || ''} ${item.assignments[0].assignee.last_name || ''}`.trim() : '-';
                    const statusText = item.status === 'COMPLETED' ? 'เสร็จสิ้น' : item.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
                    return `
                      <tr>
                        <td>${dateStr}</td>
                        <td>${slotNo}</td>
                        <td><strong>${item.title || '-'}</strong>${item.category ? `<br><span style="color:#6B7280;font-size:9px;">${item.category}</span>` : ''}</td>
                        <td>${assignee}</td>
                        <td><span class="badge status-${item.status}">${statusText}</span></td>
                      </tr>
                    `;
                  }).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          วันที่ออกเอกสาร: ${todayStr} | ออกรายงานโดยระบบอัตโนมัติ
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(htmlContent, `รายงานซ่อมบำรุง_${Date.now()}.pdf`);
};

/**
 * สร้างรายงานสรุปบิลค้างชำระ / ชำระเงินล่าช้า (Overdue & Pending Bills Report) เป็น PDF
 */
export const exportOverdueBillsReportPDF = async (
  bills: any[], 
  titleExtra: string = '',
  paidBills: number = 0,
  waitingBills: number = 0,
  pendingBills: number = 0,
  unbilledBills: number = 0,
  targetBase: number = 0,
  paidRate: number = 0
) => {
  const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Filter bills to only show UNPAID in the table if they are overdue/pending
  const tableBills = bills.filter((b) => b.status === 'PENDING' || b.status === 'OVERDUE');
  const overdueCount = tableBills.filter((b) => b.status === 'OVERDUE').length;
  const totalAmount = tableBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  const donutSlices = [
    { color: '#10B981', value: paidBills },
    { color: '#F59E0B', value: waitingBills },
    { color: '#EF4444', value: pendingBills },
    { color: '#9CA3AF', value: unbilledBills },
  ];
  
  const donutHTML = generateDonutSVG(donutSlices, `${paidRate}%`, 'อัตราจัดเก็บ');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Sarabun', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1F2937; }
          .header { text-align: center; border-bottom: 2px solid #EF4444; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { color: #DC2626; font-size: 22px; margin: 0 0 6px 0; }
          .header p { color: #6B7280; font-size: 13px; margin: 0; }
          
          .top-section { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
          .chart-area { flex: 0 0 200px; text-align: center; }
          
          .stats-area { flex: 1; }
          .summary-box { display: flex; flex-wrap: wrap; gap: 10px; background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; }
          .summary-item { flex: 1 1 45%; }
          .summary-item .num { font-size: 18px; font-weight: bold; color: #991B1B; }
          .summary-item .label { font-size: 11px; color: #991B1B; }

          .legend-row { display: flex; align-items: center; margin-bottom: 6px; font-size: 12px; }
          .legend-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
          .legend-label { flex: 1; color: #374151; text-align: left; }
          .legend-val { font-weight: bold; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; font-size: 11px; }
          th { background-color: #F3F4F6; color: #374151; font-weight: bold; }
          tr:nth-child(even) { background-color: #FAFAFA; }
          .amount { font-weight: bold; color: #DC2626; text-align: right; }
          .badge { display: inline-block; padding: 3px 6px; border-radius: 12px; font-size: 9px; font-weight: bold; }
          .status-OVERDUE { background-color: #FEE2E2; color: #991B1B; }
          .status-PENDING { background-color: #FEF3C7; color: #92400E; }
          .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานบิลค่าเช่า</h1>
          <p>ระบบจัดการศูนย์อาหาร Food Court System ${titleExtra ? `(${titleExtra})` : ''}</p>
        </div>

        <div class="top-section">
          <div class="chart-area">
            ${donutHTML}
            <div style="margin-top: 12px;">
              <div class="legend-row"><div class="legend-dot" style="background:#10B981;"></div><div class="legend-label">ชำระแล้ว</div><div class="legend-val">${paidBills}</div></div>
              <div class="legend-row"><div class="legend-dot" style="background:#F59E0B;"></div><div class="legend-label">รอยืนยันสลิป</div><div class="legend-val">${waitingBills}</div></div>
              <div class="legend-row"><div class="legend-dot" style="background:#EF4444;"></div><div class="legend-label">รอชำระ/เกินกำหนด</div><div class="legend-val">${pendingBills}</div></div>
              <div class="legend-row"><div class="legend-dot" style="background:#9CA3AF;"></div><div class="legend-label">ยังไม่ออกบิล</div><div class="legend-val">${unbilledBills}</div></div>
            </div>
          </div>

          <div class="stats-area">
            <h3 style="font-size: 14px; margin-top: 0; margin-bottom: 10px; color: #374151;">สรุปยอดค้างชำระทั้งหมด</h3>
            <div class="summary-box">
              <div class="summary-item"><div class="num">${tableBills.length}</div><div class="label">บิลค้างชำระทั้งหมด</div></div>
              <div class="summary-item"><div class="num">${overdueCount}</div><div class="label">เกินกำหนด (Overdue)</div></div>
              <div class="summary-item" style="flex-basis: 100%; margin-top: 10px;"><div class="num" style="color: #DC2626; font-size: 22px;">฿${totalAmount.toLocaleString()}</div><div class="label">ยอดค้างชำระรวม (บาท)</div></div>
            </div>
          </div>
        </div>

        <h3 style="font-size: 14px; margin-top: 20px; margin-bottom: 5px; color: #374151;">รายการบิลที่ค้างชำระ (Pending / Overdue)</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">เลขที่บิล</th>
              <th style="width: 25%;">ผู้เช่า / ล็อค</th>
              <th style="width: 20%;">กำหนดชำระ</th>
              <th style="width: 20%;">สถานะ</th>
              <th style="width: 20%; text-align: right;">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableBills.length === 0
                ? `<tr><td colspan="5" style="text-align: center; color: #9CA3AF;">ไม่มีบิลค้างชำระ</td></tr>`
                : tableBills.map((item) => {
                    const dueDateStr = item.due_date ? new Date(item.due_date).toLocaleDateString('th-TH') : '-';
                    const tenantName = item.tenant ? `${item.tenant.first_name || ''} ${item.tenant.last_name || ''}`.trim() : '-';
                    const slotNo = item.slot?.slot_number ? `ล็อค ${item.slot.slot_number}` : '';
                    const statusText = item.status === 'OVERDUE' ? 'เกินกำหนด' : 'รอชำระ';
                    return `
                      <tr>
                        <td>#${item.bill_id || item.bill_number || '-'}</td>
                        <td><strong>${tenantName}</strong>${slotNo ? `<br><span style="color:#6B7280;font-size:9px;">${slotNo}</span>` : ''}</td>
                        <td>${dueDateStr}</td>
                        <td><span class="badge status-${item.status}">${statusText}</span></td>
                        <td class="amount">฿${Number(item.total_amount || 0).toLocaleString()}</td>
                      </tr>
                    `;
                  }).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          วันที่ออกเอกสาร: ${todayStr} | ออกรายงานโดยระบบอัตโนมัติ
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(htmlContent, `รายงานบิลค่าเช่า_${Date.now()}.pdf`);
};
