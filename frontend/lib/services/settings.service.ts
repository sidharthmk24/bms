import 'server-only';
import { NotFoundException } from '../errors';
import { getDataSource } from '../db/data-source';
import { SystemSetting } from '../api-backend/settings/entities/system-setting.entity';
import { UpdateSettingDto } from '../api-backend/settings/dto/update-setting.dto';
import { JwtPayload } from '../auth/jwt';

export class SettingsService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      settingRepo: ds.getRepository(SystemSetting),
    };
  }

  async findAll(): Promise<SystemSetting[]> {
    const { settingRepo } = await this.getRepos();
    return settingRepo.find();
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const { settingRepo } = await this.getRepos();
    const setting = await settingRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async updateSetting(key: string, dto: UpdateSettingDto, user: JwtPayload): Promise<SystemSetting> {
    const { settingRepo } = await this.getRepos();
    const setting = await this.getSetting(key);
    setting.value = dto.value;
    setting.updatedById = user.userId;
    return settingRepo.save(setting);
  }
}
