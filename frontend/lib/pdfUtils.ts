import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBillPDF = (bill: any, items: any[], branchName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  const formattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const dateOfIssue = formattedDate(bill.createdAt);
  const dueDate = formattedDate(bill.dueDate || bill.createdAt);
  const gstin = bill.branch?.gstin || bill.gstin;
  
  // ── 1. Header ─────────────────────────────────────────────────────────────
  // Title (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39); // Dark Slate / Gray 900
  doc.text('Invoice', 14, 22);

  // Logo / Brand (Right)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('BMS', pageWidth - 14, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Bookstore Management System', pageWidth - 14, 27, { align: 'right' });

  // ── 2. Invoice Meta (Left side) ───────────────────────────────────────────
  let currY = 36;
  doc.setFontSize(9);

  const metaRows: { label: string; val: string }[] = [
    { label: 'Invoice number', val: bill.billNumber || 'N/A' },
    { label: 'Date of issue', val: dateOfIssue || 'N/A' },
    { label: 'Date due', val: dueDate || 'N/A' },
  ];

  if (gstin) {
    metaRows.push({ label: 'VAT Registration', val: `India GST: ${gstin}` });
  }

  metaRows.forEach(row => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(row.label, 14, currY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(row.val, 52, currY);
    currY += 5.5;
  });

  // ── 3. Addresses Section (2-Column Grid) ──────────────────────────────────
  currY += 4;
  const sellerX = 14;
  const buyerX = 110;

  // Seller Details (Branch)
  const branchDisplayName = branchName || bill.branch?.name || 'Main Branch';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(branchDisplayName, sellerX, currY);

  let sellerY = currY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);

  const sellerAddrLines = [
    bill.branch?.address,
    bill.branch?.city ? `${bill.branch.city}${bill.branch?.state ? `, ${bill.branch.state}` : ''}` : bill.branch?.state,
    bill.branch?.phone ? `Ph: ${bill.branch.phone}` : null,
    bill.branch?.email
  ].filter(Boolean);

  if (sellerAddrLines.length === 0) {
    sellerAddrLines.push('Bookstore Management System');
  }

  sellerAddrLines.forEach(line => {
    doc.text(line, sellerX, sellerY);
    sellerY += 4.5;
  });

  // Buyer Details ("Bill to")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Bill to', buyerX, currY);

  let buyerY = currY + 5;
  const customerName = bill.customerName || 'Walk-in Customer';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(customerName, buyerX, buyerY);
  buyerY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);

  const buyerLines = [
    bill.customerPhone ? `Ph: ${bill.customerPhone}` : null,
    bill.customerEmail || null,
    bill.customerGstin ? `IN GST ${bill.customerGstin}` : null,
    bill.createdBy?.name ? `Issued by: ${bill.createdBy.name}` : null
  ].filter(Boolean);

  buyerLines.forEach((line: any) => {
    doc.text(line, buyerX, buyerY);
    buyerY += 4.5;
  });

  currY = Math.max(sellerY, buyerY) + 6;

  // ── 4. Prominent Amount / Status Banner ──────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  
  const totalVal = Number(bill.totalAmount || 0).toFixed(2);
  const isPaid = bill.status === 'COMPLETED' || bill.paymentStatus === 'PAID';
  const bannerText = `Rs. ${totalVal} INR ${isPaid ? 'paid' : (dueDate ? `due ${dueDate}` : 'due')}`;
  doc.text(bannerText, 14, currY);

  currY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(37, 99, 235);
  doc.text(isPaid ? `Paid via ${bill.paymentMode || 'CASH'}` : 'Payment Pending', 14, currY);

  currY += 8;

  // ── 5. Items Table ────────────────────────────────────────────────────────
  const tableHead = [['Description', 'Qty', 'Unit price', 'Tax', 'Amount']];
  const itemList = items && items.length > 0 ? items : (bill.items || []);
  
  const tableBody = itemList.map((item: any) => {
    const bookTitle = item.title || item.book?.title || item.bookId || 'Book';
    const isbn = item.book?.isbn ? ` (ISBN: ${item.book.isbn})` : '';
    const author = item.book?.author?.name ? ` by ${item.book.author.name}` : '';
    const fullDescription = `${bookTitle}${author}${isbn}`;

    const qty = item.quantity || 1;
    const unitPrice = Number(item.unitPrice || item.price || 0).toFixed(2);
    const lineTotal = Number(item.lineTotal || (qty * parseFloat(unitPrice))).toFixed(2);
    const taxRate = item.taxRate !== undefined ? `${item.taxRate}%` : '0%';

    return [
      fullDescription,
      String(qty),
      `Rs. ${unitPrice}`,
      taxRate,
      `Rs. ${lineTotal}`
    ];
  });

  autoTable(doc, {
    startY: currY,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    headStyles: {
      textColor: [107, 114, 128],
      fontSize: 8.5,
      fontStyle: 'normal',
      cellPadding: { top: 5, bottom: 5, left: 0, right: 0 }
    },
    bodyStyles: {
      textColor: [17, 24, 39],
      fontSize: 8.5,
      cellPadding: { top: 5, bottom: 5, left: 0, right: 0 }
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' }
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      // Draw top rule for head row
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.5);
        doc.line(14, data.cell.y, pageWidth - 14, data.cell.y);
      }
      // Draw bottom rule for head row
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.5);
        doc.line(14, data.cell.y + data.cell.height, pageWidth - 14, data.cell.y + data.cell.height);
      }
    }
  });

  // ── 6. Totals Section ─────────────────────────────────────────────────────
  let finalY = (doc as any).lastAutoTable?.finalY || (currY + 30);
  
  // Page overflow check
  if (finalY + 45 > pageHeight - 15) {
    doc.addPage();
    finalY = 20;
  }

  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.5);
  doc.line(100, finalY + 4, pageWidth - 14, finalY + 4);

  let totalsY = finalY + 10;
  const labelX = 120;
  const valueX = pageWidth - 14;

  const subTotalVal = Number(bill.subTotal || bill.totalAmount || 0).toFixed(2);
  const discountVal = Number(bill.discount || 0).toFixed(2);
  const grandTotalVal = Number(bill.totalAmount || 0).toFixed(2);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Subtotal', labelX, totalsY);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs. ${subTotalVal}`, valueX, totalsY, { align: 'right' });
  totalsY += 5.5;

  // Discount
  if (parseFloat(discountVal) > 0) {
    doc.setTextColor(107, 114, 128);
    doc.text('Discount', labelX, totalsY);
    doc.setTextColor(220, 38, 38);
    doc.text(`-Rs. ${discountVal}`, valueX, totalsY, { align: 'right' });
    totalsY += 5.5;
  }

  // Total
  doc.setTextColor(107, 114, 128);
  doc.text('Total', labelX, totalsY);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs. ${grandTotalVal}`, valueX, totalsY, { align: 'right' });
  totalsY += 6;

  // Amount due
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Amount due', labelX, totalsY);
  doc.text(`Rs. ${isPaid ? '0.00' : grandTotalVal} INR`, valueX, totalsY, { align: 'right' });

  // ── 7. Footer Notes ───────────────────────────────────────────────────────
  let footerY = finalY + 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Tax Invoice', 14, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Page 1 of 1', pageWidth - 14, pageHeight - 12, { align: 'right' });

  doc.save(`Invoice_${bill.billNumber || 'BMS'}.pdf`);
};



