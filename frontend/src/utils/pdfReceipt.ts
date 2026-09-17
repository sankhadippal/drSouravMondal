import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatTime } from './index';

interface AppointmentData {
  appointment_number: string;
  patient_name: string;
  age?: number | string;
  sex?: string;
  mobile?: string;
  consultation_type: string;
  appointment_date: string;
  appointment_time: string;
  slot_end_time?: string;
  consultation_fee?: number | string;
  paid_amount?: number | string;
  payment_status?: string;
  razorpay_payment_id?: string;
  status?: string;
  chamber_name?: string;
  chamber_address?: string;
  chamber_city?: string;
  chamber_phone?: string;
  reason?: string;
}

const TEAL   = [15, 118, 110] as [number, number, number];
const TEAL_L = [240, 253, 250] as [number, number, number];
const GRAY   = [107, 114, 128] as [number, number, number];
const BLACK  = [31, 41, 55] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const GREEN  = [21, 128, 61] as [number, number, number];

export function generateAppointmentPDF(appt: AppointmentData, mode: 'download' | 'print' = 'download'): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 0;

  // ── Header banner ─────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 45, 'F');

  // Cross / medical icon (simple cross shape)
  doc.setFillColor(...WHITE);
  doc.rect(14, 8, 6, 18, 'F');
  doc.rect(10, 12, 14, 10, 'F');

  // Clinic name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Sourav Homoeopathic Clinic', 32, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)', 32, 22);
  doc.text('Call/WhatsApp: 7810880949  |  Kolkata (Dhakuria), West Bengal', 32, 27);

  // "APPOINTMENT RECEIPT" label on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('APPOINTMENT RECEIPT', pageW - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Printed: ${new Date().toLocaleString('en-IN')}`, pageW - 14, 22, { align: 'right' });

  y = 52;

  // ── Appointment ID box ────────────────────────────────────────────────────
  doc.setFillColor(...TEAL_L);
  doc.setDrawColor(...TEAL);
  doc.roundedRect(14, y, pageW - 28, 16, 3, 3, 'FD');
  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('APPOINTMENT ID', 20, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(appt.appointment_number, 20, y + 13);

  // Status badge (right side)
  const isPaid = appt.payment_status === 'paid';
  const statusText = isPaid ? 'CONFIRMED & PAID' : (appt.status?.toUpperCase() || 'PENDING');
  doc.setFillColor(...(isPaid ? GREEN : ([202, 138, 4] as [number, number, number])));
  doc.roundedRect(pageW - 65, y + 3, 51, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusText, pageW - 39, y + 9.5, { align: 'center' });

  y += 24;

  // ── Two-column layout: Patient Info  |  Appointment Info ─────────────────
  const colW = (pageW - 28 - 8) / 2;
  const leftX = 14;
  const rightX = 14 + colW + 8;

  // Patient Info box
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(leftX, y, colW, 52, 2, 2, 'FD');

  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PATIENT INFORMATION', leftX + 4, y + 7);
  doc.setDrawColor(...TEAL);
  doc.line(leftX + 4, y + 9, leftX + colW - 4, y + 9);

  const patientRows = [
    ['Name', appt.patient_name || '—'],
    ['Age / Sex', `${appt.age || '—'} yrs / ${(appt.sex || '').replace(/\b\w/g, c => c.toUpperCase()) || '—'}`],
    ['Mobile', appt.mobile ? appt.mobile.replace(/(\d{5})(\d{5})/, '$1*****') : '—'],
  ];

  let ry = y + 14;
  for (const [label, value] of patientRows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(label, leftX + 4, ry);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(value), leftX + 4, ry + 5);
    ry += 13;
  }

  // Appointment Info box
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(rightX, y, colW, 52, 2, 2, 'FD');

  doc.setTextColor(...TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('APPOINTMENT DETAILS', rightX + 4, y + 7);
  doc.setDrawColor(...TEAL);
  doc.line(rightX + 4, y + 9, rightX + colW - 4, y + 9);

  const dateClean = String(appt.appointment_date || '').split('T')[0];
  const apptRows = [
    ['Date',  formatDate(dateClean)],
    ['Time',  `${formatTime(appt.appointment_time || '')} – ${formatTime(appt.slot_end_time || '')}`],
    ['Type',  appt.consultation_type === 'online' ? 'Online Consultation' : 'Chamber Visit'],
  ];

  ry = y + 14;
  for (const [label, value] of apptRows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(label, rightX + 4, ry);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(value), rightX + 4, ry + 5);
    ry += 13;
  }

  y += 58;

  // ── Chamber Info (if not online) ──────────────────────────────────────────
  if (appt.consultation_type !== 'online' && appt.chamber_name) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(14, y, pageW - 28, 28, 2, 2, 'FD');

    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CHAMBER LOCATION', 18, y + 7);
    doc.setDrawColor(...TEAL);
    doc.line(18, y + 9, pageW - 18, y + 9);

    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(appt.chamber_name, 18, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    const addr = [appt.chamber_address, appt.chamber_city].filter(Boolean).join(', ');
    if (addr) doc.text(addr, 18, y + 22);
    if (appt.chamber_phone) doc.text(`📞 ${appt.chamber_phone}`, pageW - 18, y + 22, { align: 'right' });

    y += 34;
  }

  // ── Reason for consultation ───────────────────────────────────────────────
  if (appt.reason) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(14, y, pageW - 28, 22, 2, 2, 'FD');
    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('REASON FOR CONSULTATION', 18, y + 7);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const reasonLines = doc.splitTextToSize(appt.reason, pageW - 36);
    doc.text(reasonLines.slice(0, 2), 18, y + 13);
    y += 28;
  }

  // ── Payment Summary table ─────────────────────────────────────────────────
  const fee = parseFloat(String(appt.paid_amount || appt.consultation_fee || 0));

  autoTable(doc, {
    startY: y + 4,
    head: [['Payment Summary', '']],
    body: [
      ['Consultation Fee', `Rs. ${fee.toFixed(2)}`],
      ['GST / Tax', 'Nil'],
      ['Total Amount Paid', `Rs. ${fee.toFixed(2)}`],
      ['Payment Status', isPaid ? 'PAID' : (appt.payment_status?.toUpperCase() || 'PENDING')],
      ...(appt.razorpay_payment_id ? [['Payment Reference', appt.razorpay_payment_id]] : []),
    ],
    theme: 'plain',
    headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: BLACK },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold', textColor: GRAY as [number,number,number] },
      1: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] as [number, number, number] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Highlight total row
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = TEAL;
        data.cell.styles.fontSize = 10;
      }
      // Highlight PAID status
      if (data.row.index === 3 && data.column.index === 1 && isPaid) {
        data.cell.styles.textColor = GREEN;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Important instructions ────────────────────────────────────────────────
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(251, 191, 36);   // amber-400
  doc.roundedRect(14, y, pageW - 28, 22, 2, 2, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('IMPORTANT INSTRUCTIONS', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('• Please arrive 10 minutes before your scheduled appointment time.', 18, y + 12);
  doc.text('• Carry this receipt and any previous prescription/reports.', 18, y + 17);
  doc.text('• For cancellation/rescheduling call 7810880949 at least 24 hours before.', pageW / 2, y + 12);
  doc.text('• This receipt is valid only for the scheduled date and time.', pageW / 2, y + 17);

  y += 28;

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL);
  doc.rect(0, pageH - 18, pageW, 18, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sourav Homoeopathic Clinic  |  Dr. Sourav Kumar Mondal, B.H.M.S. (WBUHS)', pageW / 2, pageH - 11, { align: 'center' });
  doc.text('Call/WhatsApp: 7810880949  |  Trained under Dr. Prasanta Banerji, Elgin Road, Kolkata', pageW / 2, pageH - 6, { align: 'center' });

  // ── Output ────────────────────────────────────────────────────────────────
  const filename = `Appointment_${appt.appointment_number}_Receipt.pdf`;

  if (mode === 'print') {
    // Use autoPrint: opens a new window showing ONLY the PDF with the print dialog
    doc.autoPrint();
    // Create a blob URL and open it — browser shows PDF + print dialog, not the webpage
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        // Revoke blob URL after use
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      });
    } else {
      // Popup blocked — fallback to download
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
}
