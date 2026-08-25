import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { BillingService } from '@/lib/services/billing.service';
import { withAuth } from '@/lib/middleware/withAuth';

const billingService = new BillingService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const p = await params;
    const body = await req.json().catch(() => ({}));
    const phone = body.phone as string | undefined;

    // Fetch the bill
    const bill = await billingService.findOne(p.id, user);

    // Resolve phone: body override > bill's stored phone
    const toPhone = (phone || (bill as any).customerPhone || '').replace(/\D/g, '');
    if (!toPhone || toPhone.length < 10) {
      return apiError(new HttpError(400, 'A valid phone number is required to send the SMS'));
    }

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_FAST2SMS_API_KEY_HERE' || apiKey.length < 10) {
      return apiError(new HttpError(500, 'SMS is not configured yet. Please add your FAST2SMS_API_KEY to .env.local and restart the server.'));
    }

    // Build a compact SMS message
    const b = bill as any;
    const itemLines = (b.items || [])
      .map((i: any) => `${i.book?.title || 'Book'} x${i.quantity} @${Number(i.unitPrice || i.sellingPrice || 0).toFixed(0)}`)
      .join(', ');
    const total = Number(b.totalAmount || 0).toFixed(2);
    const message =
      `Kirali Books - Bill No: ${b.billNumber}\n` +
      `Date: ${new Date(b.createdAt).toLocaleDateString('en-IN')}\n` +
      (b.customerName ? `Customer: ${b.customerName}\n` : '') +
      `Items: ${itemLines}\n` +
      `Total: Rs.${total}\n` +
      (b.discount ? `Discount: Rs.${Number(b.discount).toFixed(2)}\n` : '') +
      `Payment: ${b.paymentMode || 'CASH'}\n` +
      `Thank you for your purchase!`;

    // Call Fast2SMS API
    const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',          // Transactional/quick route
        message,
        language: 'english',
        flash: 0,
        numbers: toPhone.slice(-10), // Always use last 10 digits
      }),
    });

    const smsJson = await smsRes.json();

    // Log for server-side debugging
    console.error('[SMS] Fast2SMS response:', JSON.stringify(smsJson));

    if (!smsRes.ok || smsJson.return === false) {
      // message can be a string or an array — handle both
      const errMsg = Array.isArray(smsJson?.message)
        ? smsJson.message.join(' ')
        : (typeof smsJson?.message === 'string' ? smsJson.message : 'SMS sending failed');
      return apiError(new HttpError(502, `Fast2SMS: ${errMsg}`));
    }

    return apiSuccess({ sent: true, phone: toPhone.slice(-10), requestId: smsJson.request_id });
  } catch (e: any) {
    return apiError(new HttpError(e.statusCode || 500, e.message || 'Internal Server Error'));
  }
});
