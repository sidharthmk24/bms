const fs = require('fs');
const path = require('path');

const file = 'procurement.service.ts';
const filePath = path.join('d:\\MEARN STACK\\MEGAMIND\\BMS\\bms\\frontend\\lib\\services', file);
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import\s*\{\s*hasRole\s*\}\s*from\s*'\.\.\/common\/helpers\/role\.helper';/, "import { hasRole } from '../api-backend/common/helpers/role.helper';");
content = content.replace(/import\s*\{[^\}]*\}\s*from\s*'@nestjs\/common';/, "import { ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '../errors';");
content = content.replace(/import\s*\{\s*InjectRepository\s*\}\s*from\s*'@nestjs\/typeorm';/, '');
content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\/entities\//g, "import {$1} from '../api-backend/inventory/entities/");
content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/catalog\/entities\//g, "import {$1} from '../api-backend/catalog/entities/");
content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/branches\/entities\//g, "import {$1} from '../api-backend/branches/entities/");
content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/audit\/entities\//g, "import {$1} from '../api-backend/audit/entities/");
content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'\.\/dto\//g, "import {$1} from '../api-backend/inventory/dto/");
content = content.replace(/import\s*\{\s*JwtPayload\s*\}\s*from\s*'\.\.\/auth\/interfaces\/jwt-payload\.interface';/, "import { JwtPayload } from '../auth/jwt';");
content = content.replace(/import\s*\{\s*UserRole\s*\}\s*from\s*'\.\.\/users\/enums\/user-role\.enum';/, "import { UserRole } from '../api-backend/users/enums/user-role.enum';");
content = content.replace(/import\s*\{\s*NotificationsService\s*\}\s*from\s*'\.\.\/notifications\/notifications\.service';/, "import { NotificationsService } from './notifications.service';");
content = content.replace(/import\s*\{([^\}]*)\}\s*from\s*'\.\.\/common\/helpers\/stock\.helper';/, "import {$1} from './stock.helper';");
content = content.replace(/@Injectable\(\)\n/g, '');
content = "import { getDataSource } from '../db/data-source';\n" + content;

const constructorRegex = /constructor\([\s\S]*?\)\s*\{[\s\S]*?\}/;
const newConstructor = `private notificationsService = new NotificationsService();
  private async getRepos() {
    const ds = await getDataSource();
    return {
      purchaseOrderRepo: ds.getRepository(PurchaseOrder),
      purchaseOrderItemRepo: ds.getRepository(PurchaseOrderItem),
      stockMovementRepo: ds.getRepository(StockMovement),
      bookRepo: ds.getRepository(Book), supplierRepo: ds.getRepository(Supplier),
      branchRepo: ds.getRepository(Branch),
      auditLogRepo: ds.getRepository(AuditLog)
    };
  }
  private async getDataSource() { return await getDataSource(); }`;

content = content.replace(constructorRegex, newConstructor);
content = content.replace(/this\.purchaseOrderRepository/g, "(await this.getRepos()).purchaseOrderRepo");
content = content.replace(/this\.purchaseOrderItemRepository/g, "(await this.getRepos()).purchaseOrderItemRepo");
content = content.replace(/this\.stockMovementRepository/g, "(await this.getRepos()).stockMovementRepo");
content = content.replace(/this\.bookRepository/g, "(await this.getRepos()).bookRepo");
content = content.replace(/this\.branchRepository/g, "(await this.getRepos()).branchRepo");
content = content.replace(/this\.auditLogRepository/g, "(await this.getRepos()).auditLogRepo");
content = content.replace(/this\.dataSource/g, "(await this.getDataSource())");
content = content.replace(/this\.notificationsService/g, "this.notificationsService");

fs.writeFileSync(filePath, content);

