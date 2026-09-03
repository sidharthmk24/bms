import { ExhibitionStockItemDto } from './create-exhibition.dto';

export class UpdateExhibitionDto {
  name?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  assignedUserId?: string | null;
  items?: ExhibitionStockItemDto[];
}
