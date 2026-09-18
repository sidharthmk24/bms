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
  const colorPrimary: [number, number, number] = [35, 31, 32]; // #231F20
  const colorAccent: [number, number, number] = [0, 0, 0];      // #000000
  const colorBlack: [number, number, number] = [0, 0, 0];      // #000000
  const colorMuted: [number, number, number] = [107, 114, 128]; // #6b7280
  const colorLine: [number, number, number] = [229, 231, 235];  // #e5e7eb
  
  // ── 1. Top Section (Title & Logo) ────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(colorBlack[0], colorBlack[1], colorBlack[2]);
  doc.text(bill.paymentMode === 'CREDIT' ? 'Credit Copy' : 'Invoice', 14, 25);
  
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
    doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
    if (bill.paymentMode === 'CREDIT') {
      doc.text('Payment Status: CREDIT COPY (Non-Chargeable / Issued Copy)', 14, currentY);
    } else {
      doc.text(`Payment Status: PAID via ${bill.paymentMode || 'UPI'}`, 14, currentY);
    }
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
    const naturalWidth = img.naturalWidth || img.width || 1;
    const naturalHeight = img.naturalHeight || img.height || 1;
    const aspectRatio = naturalWidth / naturalHeight;

    let renderHeight = 9.5;
    let renderWidth = renderHeight * aspectRatio;
    if (renderWidth > 50) {
      renderWidth = 50;
      renderHeight = renderWidth / aspectRatio;
    }

    const xPos = pageWidth - 14 - renderWidth;
    const yPos = 16;
    doc.addImage(img, 'PNG', xPos, yPos, renderWidth, renderHeight);
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

export const generatePurchaseOrderPDF = (po: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Theme Colors (RGB)
  const colorPlum: [number, number, number] = [126, 37, 98];    // #7e2562
  const colorDark: [number, number, number] = [30, 41, 59];     // Slate 800
  const colorMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const colorLine: [number, number, number] = [226, 232, 240];  // Slate 200
  const colorLightBg: [number, number, number] = [250, 237, 245]; // Light Plum

  // ── 1. Top Section (Title & Meta) ──────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(colorPlum[0], colorPlum[1], colorPlum[2]);
  doc.text('PURCHASE ORDER', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('Kairali Books Central Procurement', 14, 30);

  // Status Badge
  const status = (po.status || 'DRAFT').toUpperCase();
  let statusBg: [number, number, number] = [241, 245, 249];
  let statusText: [number, number, number] = [71, 85, 105];
  if (status === 'PLACED') {
    statusBg = [250, 237, 245];
    statusText = [126, 37, 98];
  } else if (status === 'RECEIVED') {
    statusBg = [240, 251, 245];
    statusText = [60, 185, 118];
  } else if (status === 'PARTIALLY_RECEIVED') {
    statusBg = [254, 243, 199];
    statusText = [180, 83, 9];
  } else if (status === 'CANCELLED') {
    statusBg = [254, 242, 242];
    statusText = [228, 94, 52];
  }

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(14, 34, 34, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.text(status, 31, 38.2, { align: 'center' });

  // ── 2. Order Meta Details ──────────────────────────────────────────────────
  let metaY = 48;
  const drawMeta = (label: string, value: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text(value, 54, y);
  };

  const createdDate = po.createdAt 
    ? new Date(po.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const expectedDate = po.expectedDate 
    ? new Date(po.expectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Immediate / As agreed';

  drawMeta('PO Number:', po.orderNumber || 'N/A', metaY);
  drawMeta('Order Date:', createdDate, metaY + 5.5);
  drawMeta('Expected Delivery:', expectedDate, metaY + 11);
  if (po.placedBy?.name) {
    drawMeta('Authorized By:', po.placedBy.name, metaY + 16.5);
  }

  // ── 3. Buyer & Vendor Address Blocks ───────────────────────────────────────
  const addressY = metaY + 24;

  // Buyer (Ship To / Bill To) Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, addressY, 86, 36, 1.5, 1.5, 'F');
  doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, addressY, 86, 36, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colorPlum[0], colorPlum[1], colorPlum[2]);
  doc.text('SHIP & BILL TO (BUYER)', 18, addressY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
  doc.text('Kairali Books Central Warehouse', 18, addressY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('1st Floor, Mulliyaangana Complex', 18, addressY + 17);
  doc.text('Airport Road, Bondel, Mangaluru, KA - 575008', 18, addressY + 22);
  doc.text('GSTIN: 29AASCM4072F1Z2 | procurement@kairalibooks.com', 18, addressY + 27);

  // Vendor (Supplier) Box
  const vendorX = 110;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(vendorX, addressY, pageWidth - vendorX - 14, 36, 1.5, 1.5, 'F');
  doc.roundedRect(vendorX, addressY, pageWidth - vendorX - 14, 36, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colorPlum[0], colorPlum[1], colorPlum[2]);
  doc.text('VENDOR / SUPPLIER', vendorX + 4, addressY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
  doc.text(po.supplier?.name || 'Direct Supplier', vendorX + 4, addressY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  let vLineY = addressY + 17;
  if (po.supplier?.contactPerson) {
    doc.text(`Contact: ${po.supplier.contactPerson}`, vendorX + 4, vLineY);
    vLineY += 5;
  }
  if (po.supplier?.email || po.supplier?.phone) {
    doc.text(`${po.supplier.email || ''} ${po.supplier.phone ? '• ' + po.supplier.phone : ''}`.trim(), vendorX + 4, vLineY);
    vLineY += 5;
  }
  if (po.supplier?.address) {
    doc.text(po.supplier.address.substring(0, 45), vendorX + 4, vLineY);
  } else {
    doc.text('Authorized Publisher / Distributor', vendorX + 4, vLineY);
  }

  // ── 4. Order Items Table ───────────────────────────────────────────────────
  const items = po.items || [];
  const tableBody = items.map((item: any, idx: number) => {
    const title = item.book?.title || item.title || item.newBook?.title || 'Book Title';
    const isbn = item.book?.isbn || item.isbn || item.newBook?.isbn || item.book?.barcode || 'N/A';
    const author = item.book?.author?.name || item.newBook?.authorName || item.pmsTitle?.authorName || '';
    const desc = author ? `${title}\nAuthor: ${author}` : title;
    const qty = Number(item.quantityOrdered || 0);
    const unitCost = Number(item.unitCost || 0);
    const lineTotal = qty * unitCost;

    return [
      idx + 1,
      desc,
      isbn,
      qty,
      `Rs. ${unitCost.toFixed(2)}`,
      `Rs. ${lineTotal.toFixed(2)}`
    ];
  });

  const currencySymbol = 'Rs.';

  autoTable(doc, {
    startY: addressY + 42,
    head: [['#', 'Book / Item Description', 'ISBN / Code', 'Qty', 'Unit Cost', 'Amount']],
    body: tableBody,
    theme: 'plain',
    headStyles: { 
      fillColor: colorLightBg,
      textColor: colorPlum, 
      fontStyle: 'bold', 
      fontSize: 8.5,
      lineColor: colorLine,
      lineWidth: { bottom: 0.5, top: 0.5 }
    },
    bodyStyles: { 
      textColor: colorDark, 
      fontSize: 8,
      lineColor: colorLine,
      lineWidth: { bottom: 0.2 }
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'left', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      data.cell.styles.cellPadding = 3.5;
    }
  });

  // ── 5. Totals & Notes Section ──────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  
  const totalQtyOrdered = items.reduce((sum: number, it: any) => sum + (Number(it.quantityOrdered) || 0), 0);
  const totalAmount = Number(po.totalCost || items.reduce((sum: number, it: any) => sum + ((Number(it.quantityOrdered) || 0) * (Number(it.unitCost) || 0)), 0));

  const rightColX = pageWidth - 14;
  const labelColX = pageWidth - 82;

  let totalsY = finalY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  
  doc.text('Total Titles / Lines', labelColX, totalsY);
  doc.text(`${items.length}`, rightColX, totalsY, { align: 'right' });

  totalsY += 5;
  doc.text('Total Units Ordered', labelColX, totalsY);
  doc.text(`${totalQtyOrdered} copies`, rightColX, totalsY, { align: 'right' });

  totalsY += 4;
  doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
  doc.setLineWidth(0.3);
  doc.line(labelColX, totalsY, rightColX, totalsY);

  totalsY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colorPlum[0], colorPlum[1], colorPlum[2]);
  doc.text('Total Estimated Cost', labelColX, totalsY);
  doc.text(`${currencySymbol} ${totalAmount.toFixed(2)}`, rightColX, totalsY, { align: 'right' });

  // Terms and Notes on the Left
  let notesY = finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
  doc.text('Terms & Delivery Conditions:', 14, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('1. Please supply books in good condition matching exact ISBN specifications.', 14, notesY + 4.5);
  doc.text('2. Mention PO Number on all delivery challans and invoices.', 14, notesY + 9);
  doc.text('3. Central Warehouse stock receiving verification applies upon arrival.', 14, notesY + 13.5);

  // ── 6. Signatures ──────────────────────────────────────────────────────────
  const sigY = Math.max(totalsY + 18, notesY + 28);
  if (sigY < pageHeight - 25) {
    doc.setDrawColor(colorLine[0], colorLine[1], colorLine[2]);
    doc.setLineWidth(0.4);
    
    // Left signature
    doc.line(14, sigY + 12, 65, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
    doc.text('Authorized Signatory', 14, sigY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text('Kairali Books Procurement', 14, sigY + 20);

    // Right signature
    doc.line(pageWidth - 65, sigY + 12, pageWidth - 14, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
    doc.text('Vendor Acknowledgment', pageWidth - 65, sigY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text('Signature & Stamp', pageWidth - 65, sigY + 20);
  }

  // ── 7. Footer ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated on ${new Date().toLocaleString()} | Official Kairali Books Purchase Order`, 14, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - 14, pageHeight - 8, { align: 'right' });

  // Load and Add Logo Image on Top Right, then Save PDF
  const img = new Image();
  img.src = '/kairaliLogo.png';
  img.onload = () => {
    const naturalWidth = img.naturalWidth || img.width || 1;
    const naturalHeight = img.naturalHeight || img.height || 1;
    const aspectRatio = naturalWidth / naturalHeight;

    let renderHeight = 9.5;
    let renderWidth = renderHeight * aspectRatio;
    if (renderWidth > 50) {
      renderWidth = 50;
      renderHeight = renderWidth / aspectRatio;
    }

    const xPos = pageWidth - 14 - renderWidth;
    const yPos = 18;
    doc.addImage(img, 'PNG', xPos, yPos, renderWidth, renderHeight);
    doc.save(`PurchaseOrder_${po.orderNumber || 'PO'}.pdf`);
  };

  img.onerror = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(colorPlum[0], colorPlum[1], colorPlum[2]);
    doc.text('KAIRALI', pageWidth - 38, 20);
    doc.save(`PurchaseOrder_${po.orderNumber || 'PO'}.pdf`);
  };
};

