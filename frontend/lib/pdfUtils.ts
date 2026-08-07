import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBillPDF = (bill: any, items: any[], branchName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Custom Fonts & Colors
  doc.setFont('helvetica', 'bold');
  
  // ── 1. Top Banner ────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Very dark slate/blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(24);
  doc.text('BMS', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Bookstore Management System', 14, 28);
  
  // "INVOICE" text on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - 14, 26, { align: 'right' });
  
  // ── 2. Information Section ───────────────────────────────────────────────
  const startY = 55;
  
  // Bill Details (Left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  
  const dateStr = new Date(bill.createdAt).toLocaleDateString() + ' ' + new Date(bill.createdAt).toLocaleTimeString();
  
  doc.text('Invoice No:', 14, startY);
  doc.text('Date:', 14, startY + 7);
  doc.text('Branch:', 14, startY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(bill.billNumber, 40, startY);
  doc.text(dateStr, 40, startY + 7);
  doc.text(branchName || bill.branchId, 40, startY + 14);
  
  // Customer Details (Right)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Customer:', 120, startY);
  doc.text('Phone:', 120, startY + 7);
  doc.text('Payment:', 120, startY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bill.customerName || 'Walk-in Customer', 145, startY);
  doc.text(bill.customerPhone || 'N/A', 145, startY + 7);
  const paymentText = `${bill.paymentStatus} ${bill.paymentMode ? '(' + bill.paymentMode + ')' : ''}`;
  doc.text(paymentText, 145, startY + 14);

  // ── 3. Table ─────────────────────────────────────────────────────────────
  const tableBody = items.map((item: any, index: number) => [
    index + 1,
    item.title || item.book?.title || item.bookId,
    item.quantity,
    `Rs. ${Number(item.unitPrice || item.price).toFixed(2)}`,
    `Rs. ${Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 51, fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 15 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  // ── 4. Totals ────────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  
  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(120, finalY + 8, pageWidth - 14, finalY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', 140, finalY + 16);
  doc.text('Discount:', 140, finalY + 23);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${Number(bill.subTotal).toFixed(2)}`, pageWidth - 14, finalY + 16, { align: 'right' });
  doc.text(`Rs. ${Number(bill.discount).toFixed(2)}`, pageWidth - 14, finalY + 23, { align: 'right' });
  
  // Grand Total Box
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(120, finalY + 28, pageWidth - 120 - 14, 12, 'F');
  
  doc.setFontSize(12);
  doc.text('Grand Total:', 125, finalY + 36);
  doc.setTextColor(15, 23, 42); 
  doc.setFontSize(14);
  doc.text(`Rs. ${Number(bill.totalAmount).toFixed(2)}`, pageWidth - 16, finalY + 36.5, { align: 'right' });

  // ── 5. Footer ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate-400
  
  const pageHeight = doc.internal.pageSize.height;
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text('This is a computer generated invoice and does not require a signature.', pageWidth / 2, pageHeight - 14, { align: 'center' });

  doc.save(`Invoice_${bill.billNumber}.pdf`);
};
