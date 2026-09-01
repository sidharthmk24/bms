import { apiSuccess, apiError } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { getDataSource } from '@/lib/db/data-source';
import { User } from '@/lib/api-backend/users/entities/user.entity';
import { UserRole } from '@/lib/api-backend/users/entities/user-role.entity';
import { UserRole as UserRoleEnum } from '@/lib/api-backend/users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(UserRole);
    
    let admin = await userRepo.findOne({ where: { email: 'superadmin@bms.com' }, relations: ['roles'] });
    
    if (!admin) {
      admin = userRepo.create({
        id: uuidv4(),
        email: 'superadmin@bms.com',
        passwordHash: bcrypt.hashSync('Password@123', 10),
        name: 'Super Admin',
        primaryRole: UserRoleEnum.SUPER_ADMIN,
        isActive: true,
      });
      await userRepo.save(admin);
    } else {
      admin.primaryRole = UserRoleEnum.SUPER_ADMIN;
      await userRepo.save(admin);
    }

    // Add role
    const existingRole = await roleRepo.findOne({ where: { userId: admin.id, role: UserRoleEnum.SUPER_ADMIN } });
    if (!existingRole) {
       const newRole = roleRepo.create({
         id: uuidv4(),
         userId: admin.id,
         role: UserRoleEnum.SUPER_ADMIN
       });
       await roleRepo.save(newRole);
    }

    return apiSuccess({
      message: 'Super Admin created successfully!',
      email: 'superadmin@bms.com',
      password: 'Password@123'
    });
  } catch (error: any) {
    return apiError(error);
  }
}
