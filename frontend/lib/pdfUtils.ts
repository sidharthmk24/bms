import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBillPDF = (bill: any, items: any[], branch: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Resolve Dynamic Branch Details
  let branchName = 'Kirali Books';
  let branchAddress = '1st Floor, Mulliyaangana Complex, Airport Road, Bondel';
  let branchCity = 'Mangaluru';
  let branchState = 'Karnataka';
  let branchCountry = 'India';
  let branchPhone = '';

  if (branch && typeof branch === 'object') {
    branchName = branch.name || 'Kirali Books';
    branchAddress = branch.address || '';
    branchCity = branch.city || '';
    branchPhone = branch.phone || '';
  } else if (typeof branch === 'string') {
    branchName = branch;
  }
  
  // Define Theme Colors (RGB)
  const colorPrimary = [35, 31, 32]; // #231F20
  const colorAccent = [0, 0, 0];      // #000000
  const colorBlack = [0, 0, 0];      // #000000
  const colorMuted = [107, 114, 128]; // #6b7280
  const colorLine = [229, 231, 235];  // #e5e7eb
  
  // ── 1. Top Section (Title & Logo) ────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.text('Invoice', 14, 25);
  
  // Logo on the Right is loaded and drawn dynamically at the bottom of the script.
  
  // ── 2. Invoice Details (Meta Info) ──────────────────────────────────────
  let currentY = 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);

  const drawMetaLine = (label: string, value: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 46, y);
  };

  const formattedDate = new Date(bill.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  drawMetaLine('Invoice number', bill.billNumber, currentY);
  drawMetaLine('Date of issue', formattedDate, currentY + 6);
  drawMetaLine('Date due', formattedDate, currentY + 12);
  drawMetaLine('VAT Registration', 'India GST: 29AASCM4072F1Z2', currentY + 18);

  // ── 3. Billing Addresses (From & Bill To) ───────────────────────────────
  currentY = 74;
  
  // Sender (From) - Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text(branchName || 'Kirali Books Branch', 14, currentY);
  
  // Small pill badge for branding (e.g. "@kirali")
  const badgeText = '';
  const badgeWidth = doc.getTextWidth(badgeText) + 4;
  doc.setFillColor(243, 244, 246); // light grey background
  doc.roundedRect(doc.getTextWidth(branchName || 'Kirali Books Branch') + 18, currentY - 3.5, badgeWidth, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text(badgeText, doc.getTextWidth(branchName || 'Kirali Books Branch') + 20, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  // Dynamically format address lines
  const senderLines: string[] = [];
  if (branchAddress) {
    const parts = branchAddress.split(',').map(p => p.trim()).filter(Boolean);
    parts.forEach(part => senderLines.push(part));
  } else {
    senderLines.push('1st Floor, Mulliyaangana Complex');
    senderLines.push('Airport Road, Bondel');
  }

  if (branchCity) {
    const lastLine = senderLines[senderLines.length - 1] || '';
    if (!lastLine.toLowerCase().includes(branchCity.toLowerCase())) {
      senderLines.push(`${branchCity}, ${branchState}, ${branchCountry}`);
    } else {
      if (!lastLine.toLowerCase().includes('india')) {
        senderLines[senderLines.length - 1] = `${lastLine}, ${branchState}, ${branchCountry}`;
      }
    }
  } else {
    senderLines.push('Mangaluru, Karnataka, India');
  }

  if (branchPhone) {
    senderLines.push(`Phone: ${branchPhone}`);
  } else {
    senderLines.push('support@kiralibooks.com');
  }

  doc.text(senderLines, 14, currentY + 5);

  // Recipient (Bill To) - Right (Aligned horizontally with Sender)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('Bill to', 120, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text(bill.customerName || 'Walk-in Customer', 120, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  const recipientLines = [];
  if (bill.customerEmail) {
    recipientLines.push(bill.customerEmail);
  }
  if (bill.customerPhone) {
    recipientLines.push(`Phone: ${bill.customerPhone}`);
  }
  
  if (recipientLines.length > 0) {
    doc.text(recipientLines, 120, currentY + 10);
  }

  // ── 4. Large Callout Due Status ──────────────────────────────────────────
  currentY = 114;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  
  const currencySymbol = 'Rs.';
  const totalAmountStr = `${currencySymbol} ${Number(bill.totalAmount).toFixed(2)}`;
  doc.text(`${totalAmountStr} INR due ${formattedDate}`, 14, currentY);

  // Status Indicator
  currentY += 6;
  doc.setFontSize(9.5);
  if (bill.paymentStatus === 'PAID') {
    doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]); // Teal
    doc.text(`Payment Status: PAID via ${bill.paymentMode || 'UPI'}`, 14, currentY);
  } else {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('Payment Status: PENDING / DUE', 14, currentY);
  }

  // ── 5. Items Table (jspdf-autotable) ─────────────────────────────────────
  const tableBody = items.map((item: any) => [
    item.title || item.book?.title || item.bookId,
    item.quantity,
    `${currencySymbol} ${Number(item.unitPrice || item.price).toFixed(2)}`,
    '0%',
    `${currencySymbol} ${Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['Description', 'Qty', 'Unit price', 'Tax', 'Amount']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      textColor: colorPrimary, 
      fontStyle: 'bold', 
      fontSize: 8.5,
      lineColor: colorLine,
      lineWidth: { bottom: 0.5, top: 0.5 }
    },
    bodyStyles: { 
      textColor: colorPrimary, 
      fontSize: 8.5,
      lineColor: colorLine,
      lineWidth: { bottom: 0.2 } // soft line under each row
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right', cellWidth: 15 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 25 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Add extra padding for row styling
      data.cell.styles.cellPadding = 3.5;
    }
  });

  // ── 6. Totals & Tax Detail Section ───────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  
  // Right Column Totals
  const rightColumnX = pageWidth - 14;
  const labelColumnX = pageWidth - 60;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  let totalsY = finalY + 8;
  doc.text('Subtotal', labelColumnX, totalsY);
  doc.text(`${currencySymbol} ${Number(bill.subTotal).toFixed(2)}`, rightColumnX, totalsY, { align: 'right' });
  
  totalsY += 5;
  doc.text('Discount', labelColumnX, totalsY);
  doc.text(`- ${currencySymbol} ${Number(bill.discount || 0).toFixed(2)}`, rightColumnX, totalsY, { align: 'right' });
  
  // Divider
  totalsY += 3;
  doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
  doc.setLineWidth(0.3);
  doc.line(labelColumnX, totalsY, rightColumnX, totalsY);
  
  totalsY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.text('Total', labelColumnX, totalsY);
  doc.text(`${currencySymbol} ${Number(bill.totalAmount).toFixed(2)}`, rightColumnX, totalsY, { align: 'right' });
  
  totalsY += 5;
  doc.setFontSize(9.5);
  doc.text('Amount due', labelColumnX, totalsY);
  doc.text(`${currencySymbol} ${Number(bill.totalAmount).toFixed(2)} INR`, rightColumnX, totalsY, { align: 'right' });

  // Bottom Left Notes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  let notesY = finalY + 8;
  doc.text('HSN Code: 4901 (Printed Books - GST Exempt)', 14, notesY);
  doc.text('Tax Invoice', 14, notesY + 4.5);
  doc.text('[1] Tax to be paid on reverse charge basis: No', 14, notesY + 9);

  // ── 7. Clean Footer ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Slate 400
  doc.text('Page 1 of 1', pageWidth - 14, pageHeight - 10, { align: 'right' });

  // Load and Add Logo Image on Top Right, then Save PDF
  const img = new Image();
  img.src = '/kairaliLogo.png';
  img.onload = () => {
    // Width and height should preserve aspect ratio: 873 / 353 = 2.47
    // Height: 12, Width: 12 * 2.47 = 29.64 -> 30
    doc.addImage(img, 'PNG', pageWidth - 44, 12, 30, 12);
    doc.save(`Invoice_${bill.billNumber}.pdf`);
  };
  
  img.onerror = () => {
    // Fallback: draw modern text logo if image fails to load
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.text('BMS', pageWidth - 26, 24);
    doc.setFillColor(colorAccent[0], colorAccent[1], colorAccent[2]);
    doc.circle(pageWidth - 14, 17, 2, 'F');
    doc.save(`Invoice_${bill.billNumber}.pdf`);
  };
};
