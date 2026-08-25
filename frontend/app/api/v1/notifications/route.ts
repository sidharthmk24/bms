import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { NotificationsService } from '@/lib/services/notifications.service';

const notificationsService = new NotificationsService();

async function getNotificationsHandler(req: AuthenticatedRequest) {
  try {
    const notifications = await notificationsService.getNotifications(req.user.userId);
    return apiSuccess(notifications);
  } catch (error: any) {
    console.error('Notifications GET API Error:', error);
    return apiError(new Error(error.message || 'Failed to fetch notifications'));
  }
}

async function markAllAsReadHandler(req: AuthenticatedRequest) {
  try {
    await notificationsService.markAllAsRead(req.user.userId);
    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error('Notifications PATCH ReadAll API Error:', error);
    return apiError(new Error(error.message || 'Failed to mark all as read'));
  }
}

export const GET = withAuth(getNotificationsHandler);
export const PATCH = withAuth(markAllAsReadHandler);
