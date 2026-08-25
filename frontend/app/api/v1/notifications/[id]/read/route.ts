import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { NotificationsService } from '@/lib/services/notifications.service';
import { NotFoundException } from '@/lib/errors';

const notificationsService = new NotificationsService();

async function markReadHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const updated = await notificationsService.markAsRead(id, req.user.userId);
    if (!updated) {
      throw new NotFoundException('Notification not found or access denied');
    }
    return apiSuccess(updated);
  } catch (error: any) {
    console.error('Notification Read API Error:', error);
    return apiError(error);
  }
}

export const PATCH = withAuth(markReadHandler);
