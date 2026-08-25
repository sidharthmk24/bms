import 'server-only';
import { EventEmitter } from 'events';
import { getDataSource } from '../db/data-source';
import { Notification } from '../api-backend/notifications/entities/notification.entity';
import { User } from '../api-backend/users/entities/user.entity';
import { UserRole } from '../api-backend/users/enums/user-role.enum';

// Global event emitter for SSE updates
export const notificationsEmitter = new EventEmitter();

// Max listeners override to prevent memory warnings with many open connections
notificationsEmitter.setMaxListeners(200);

export class NotificationsService {
  async triggerRefresh(event: string) {
    // Legacy refresh event trigger
    console.log(`[SSE] Triggering legacy refresh event: ${event}`);
    notificationsEmitter.emit('refresh', { event });
  }

  async getRepo() {
    const ds = await getDataSource();
    return ds.getRepository(Notification);
  }

  async getUserRepo() {
    const ds = await getDataSource();
    return ds.getRepository(User);
  }

  async createNotification(userId: string, title: string, message: string, type: string = 'INFO') {
    try {
      const repo = await this.getRepo();
      const notif = repo.create({
        userId,
        title,
        message,
        type,
        isRead: false,
      });
      const saved = await repo.save(notif);

      // Emit SSE notification event to specific user
      notificationsEmitter.emit(`notification:${userId}`, saved);
      
      // Also emit a general refresh event so frontend mutates data
      notificationsEmitter.emit(`refresh:${userId}`, { type: 'refresh' });

      return saved;
    } catch (error) {
      console.error(`[NotificationsService] Failed to create notification for user ${userId}:`, error);
    }
  }

  async notifyRoles(roles: UserRole[], branchId: string | null, title: string, message: string, type: string = 'INFO') {
    try {
      const userRepo = await this.getUserRepo();
      
      // Find all active users
      // If branchId is specified (not null), filter branch-scoped roles by branchId
      const query = userRepo.createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'userRole')
        .where('user.isActive = :isActive', { isActive: true });

      if (branchId) {
        query.andWhere('(user.branchId = :branchId OR user.branchId IS NULL)', { branchId });
      }

      const allUsers = await query.getMany();
      
      // Filter in JS since roles is a join table userRole.role
      const targetUsers = allUsers.filter(user => 
        user.roles.some(ur => roles.includes(ur.role as UserRole))
      );

      console.log(`[NotificationsService] Notifying ${targetUsers.length} users with roles ${roles.join(', ')} (branch: ${branchId})`);

      for (const user of targetUsers) {
        await this.createNotification(user.id, title, message, type);
      }
    } catch (error) {
      console.error(`[NotificationsService] Failed to notify roles:`, error);
    }
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const repo = await this.getRepo();
    return repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const repo = await this.getRepo();
    const notif = await repo.findOne({ where: { id, userId } });
    if (!notif) return null;
    
    notif.isRead = true;
    const updated = await repo.save(notif);
    
    // Trigger sync refresh
    notificationsEmitter.emit(`refresh:${userId}`, { type: 'refresh' });
    return updated;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const repo = await this.getRepo();
    await repo.update({ userId, isRead: false }, { isRead: true });
    
    // Trigger sync refresh
    notificationsEmitter.emit(`refresh:${userId}`, { type: 'refresh' });
  }
}
