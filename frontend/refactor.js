const fs = require('fs');
const path = require('path');

const files = ['inventory.service.ts', 'restock.service.ts', 'procurement.service.ts'];

files.forEach(file => {
  const filePath = path.join('d:\\MEARN STACK\\MEGAMIND\\BMS\\bms\\frontend\\lib\\api-backend', file.split('.')[0], file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace exceptions
  content = content.replace(/import\s+\{([^\}]*)\}\s+from\s+'@nestjs\/common';/g, (match, p1) => {
    const ex = p1.split(',').map(s => s.trim()).filter(s => s.includes('Exception'));
    if (ex.length > 0) return 'import { ' + ex.join(', ') + " } from '../errors';";
    return '';
  });

  // Remove TypeORM decorators
  content = content.replace(/import\s+\{[^\}]*\}\s+from\s+'@nestjs\/typeorm';/g, '');
  content = content.replace(/@Injectable\(\)\n/g, '');
  content = content.replace(/@InjectRepository\([^\)]+\)\n\s+/g, '');

  // Fix notifications import
  content = content.replace(/import \{ NotificationsService \} from '\.\.\/notifications\/notifications\.service';/, "import { NotificationsService } from './notifications.service';");

  // Fix relative imports
  content = content.replace(/\.\.\/common\/helpers\/role\.helper/g, '../api-backend/common/helpers/role.helper');
  content = content.replace(/\.\.\/common\/helpers\/stock\.helper/g, './stock.helper');
  
  // Need to correctly replace parent path for api-backend
  content = content.replace(/from\s+'\.\.\/(?!errors)(?!api-backend)(?!auth)/g, "from '../api-backend/");
  
  // Need to fix self directory imports
  content = content.replace(/from\s+'\.\//g, "from '../api-backend/" + file.split('.')[0] + "/");
  
  // Fix auth/jwt
  content = content.replace(/\.\.\/api-backend\/auth\/interfaces\/jwt-payload\.interface/g, '../auth/jwt');
  content = content.replace(/\.\.\/auth\/interfaces\/jwt-payload\.interface/g, '../auth/jwt');

  // Add getDataSource
  content = "import { getDataSource } from '../db/data-source';\n" + content;
  content = "import { RestockRequest, RestockStatus } from '../api-backend/restock/entities/restock-request.entity';\n" + content;
  content = "import { RestockItem } from '../api-backend/restock/entities/restock-item.entity';\n" + content;
  content = "import { PurchaseOrder, POStatus } from '../api-backend/procurement/entities/purchase-order.entity';\n" + content;
  content = "import { PurchaseOrderItem } from '../api-backend/procurement/entities/purchase-order-item.entity';\n" + content;
  content = "import { Supplier } from '../api-backend/catalog/entities/supplier.entity';\n" + content;

  // Replace constructor
  const getReposCode = `
  private notificationsService = new NotificationsService();
  private async getRepos() { 
    const ds = await getDataSource(); 
    return { 
      centralStockRepo: ds.getRepository(CentralStock), 
      branchInventoryRepo: ds.getRepository(BranchInventory), 
      stockMovementRepo: ds.getRepository(StockMovement), 
      bookRepo: ds.getRepository(Book), 
      branchRepo: ds.getRepository(Branch), 
      auditLogRepo: ds.getRepository(AuditLog), 
      restockRequestRepo: ds.getRepository(RestockRequest), 
      restockItemRepo: ds.getRepository(RestockItem), 
      supplierRepo: ds.getRepository(Supplier), 
      purchaseOrderRepo: ds.getRepository(PurchaseOrder), 
      purchaseOrderItemRepo: ds.getRepository(PurchaseOrderItem) 
    }; 
  }`;

  content = content.replace(/constructor\([\s\S]*?\)\s*\{[\s\S]*?\}/, getReposCode);

  // Replace repository references
  content = content.replace(/this\.centralStockRepository/g, "(await this.getRepos()).centralStockRepo");
  content = content.replace(/this\.branchInventoryRepository/g, "(await this.getRepos()).branchInventoryRepo");
  content = content.replace(/this\.stockMovementRepository/g, "(await this.getRepos()).stockMovementRepo");
  content = content.replace(/this\.bookRepository/g, "(await this.getRepos()).bookRepo");
  content = content.replace(/this\.branchRepository/g, "(await this.getRepos()).branchRepo");
  content = content.replace(/this\.auditLogRepository/g, "(await this.getRepos()).auditLogRepo");
  content = content.replace(/this\.restockRequestRepository/g, "(await this.getRepos()).restockRequestRepo");
  content = content.replace(/this\.restockItemRepository/g, "(await this.getRepos()).restockItemRepo");
  content = content.replace(/this\.supplierRepository/g, "(await this.getRepos()).supplierRepo");
  content = content.replace(/this\.purchaseOrderRepository/g, "(await this.getRepos()).purchaseOrderRepo");
  content = content.replace(/this\.purchaseOrderItemRepository/g, "(await this.getRepos()).purchaseOrderItemRepo");
  
  // dataSource and notifications
  content = content.replace(/this\.dataSource/g, "(await getDataSource())");
  content = content.replace(/this\.notificationsService/g, "this.notificationsService");

  fs.writeFileSync(path.join('d:\\MEARN STACK\\MEGAMIND\\BMS\\bms\\frontend\\lib\\services', file), content);
});
