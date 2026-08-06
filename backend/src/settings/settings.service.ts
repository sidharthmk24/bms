import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async findAll(): Promise<SystemSetting[]> {
    return this.settingRepo.find();
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async updateSetting(key: string, dto: UpdateSettingDto, user: JwtPayload): Promise<SystemSetting> {
    const setting = await this.getSetting(key);
    setting.value = dto.value;
    setting.updatedById = user.userId;
    return this.settingRepo.save(setting);
  }
}
