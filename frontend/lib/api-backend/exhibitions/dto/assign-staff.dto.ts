import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ExhibitionAssignmentRole } from '../entities/exhibition-assignment.entity';

export class AssignStaffDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ExhibitionAssignmentRole)
  role: ExhibitionAssignmentRole;
}
