import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBillPDF = (bill: any, items: any[], branchName: string) => {
  const doc = new jsPDF();
  
  // Custom Fonts & Colors
  doc.setFont('helvetica', 'bold');
  
  // Header section
  doc.setFontSize(24);
  doc.setTextColor(30, 58, 138); // Dark blue
  doc.text('BMS Enterprise', 14, 22);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Bookstore Management System', 14, 30);
  
  // Line separator
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('TAX INVOICE', 14, 48);
  
  // Bill Details (Left Side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  
  const dateStr = new Date(bill.createdAt).toLocaleDateString() + ' ' + new Date(bill.createdAt).toLocaleTimeString();
  
  doc.text(`Invoice No:`, 14, 60);
  doc.text(`Date:`, 14, 67);
  doc.text(`Branch:`, 14, 74);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bill.billNumber, 38, 60);
  doc.text(dateStr, 38, 67);
  doc.text(branchName || bill.branchId, 38, 74);
  
  // Customer Details (Right Side)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer:`, 120, 60);
  doc.text(`Phone:`, 120, 67);
  doc.text(`Payment:`, 120, 74);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bill.customerName || 'Walk-in Customer', 142, 60);
  doc.text(bill.customerPhone || 'N/A', 142, 67);
  const paymentText = `${bill.paymentStatus} ${bill.paymentMode ? '(' + bill.paymentMode + ')' : ''}`;
  doc.text(paymentText, 142, 74);

  // Table
  const tableBody = items.map((item: any, index: number) => [
    index + 1,
    item.title || item.book?.title || item.bookId,
    item.quantity,
    `₹${Number(item.unitPrice || item.price).toFixed(2)}`,
    `₹${Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
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

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  
  doc.setDrawColor(226, 232, 240);
  doc.line(120, finalY + 10, 196, finalY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 140, finalY + 18);
  doc.text('Discount:', 140, finalY + 25);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`₹${Number(bill.subTotal).toFixed(2)}`, 196, finalY + 18, { align: 'right' });
  doc.text(`₹${Number(bill.discount).toFixed(2)}`, 196, finalY + 25, { align: 'right' });
  
  doc.setFontSize(14);
  doc.text('Grand Total:', 140, finalY + 35);
  doc.setTextColor(37, 99, 235); // Blue color for grand total
  doc.text(`₹${Number(bill.totalAmount).toFixed(2)}`, 196, finalY + 35, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Thank you for your business!', 105, finalY + 60, { align: 'center' });
  doc.text('This is a computer generated invoice and does not require a signature.', 105, finalY + 66, { align: 'center' });

  doc.save(`Invoice_${bill.billNumber}.pdf`);
};
