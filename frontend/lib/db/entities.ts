import { AuditLog } from "../api-backend/audit/entities/audit-log.entity";
import { CreditCopy } from "../api-backend/credit-copies/entities/credit-copy.entity";
import { BillItem } from "../api-backend/billing/entities/bill-item.entity";
import { Bill } from "../api-backend/billing/entities/bill.entity";
import { Branch } from "../api-backend/branches/entities/branch.entity";
import { Author } from "../api-backend/catalog/entities/author.entity";
import { Book } from "../api-backend/catalog/entities/book.entity";
import { Category } from "../api-backend/catalog/entities/category.entity";
import { Publisher } from "../api-backend/catalog/entities/publisher.entity";
import { Supplier } from "../api-backend/catalog/entities/supplier.entity";
import { BookEnquiry } from "../api-backend/enquiries/entities/book-enquiry.entity";
import { NewTitleRequest } from "../api-backend/enquiries/entities/new-title-request.entity";
import { ExhibitionStock } from "../api-backend/exhibitions/entities/exhibition-stock.entity";
import { Exhibition } from "../api-backend/exhibitions/entities/exhibition.entity";
import { CashReconciliation } from "../api-backend/finance/entities/cash-reconciliation.entity";
import { ExpenseRevision } from "../api-backend/finance/entities/expense-revision.entity";
import { Expense } from "../api-backend/finance/entities/expense.entity";
import { BranchInventory } from "../api-backend/inventory/entities/branch-inventory.entity";
import { CentralStock } from "../api-backend/inventory/entities/central-stock.entity";
import { StockMovement } from "../api-backend/inventory/entities/stock-movement.entity";
import { PurchaseOrderItem } from "../api-backend/procurement/entities/purchase-order-item.entity";
import { PurchaseOrder } from "../api-backend/procurement/entities/purchase-order.entity";
import { RestockRequestItem } from "../api-backend/restock/entities/restock-request-item.entity";
import { RestockRequest } from "../api-backend/restock/entities/restock-request.entity";
import { SystemSetting } from "../api-backend/settings/entities/system-setting.entity";
import { PasswordResetToken } from "../api-backend/users/entities/password-reset-token.entity";
import { RefreshToken } from "../api-backend/users/entities/refresh-token.entity";
import { UserRole } from "../api-backend/users/entities/user-role.entity";
import { User } from "../api-backend/users/entities/user.entity";

export const entities = [
  AuditLog,
  CreditCopy,
  BillItem,
  Bill,
  Branch,
  Author,
  Book,
  Category,
  Publisher,
  Supplier,
  BookEnquiry,
  NewTitleRequest,
  ExhibitionStock,
  Exhibition,
  CashReconciliation,
  ExpenseRevision,
  Expense,
  BranchInventory,
  CentralStock,
  StockMovement,
  PurchaseOrderItem,
  PurchaseOrder,
  RestockRequestItem,
  RestockRequest,
  SystemSetting,
  PasswordResetToken,
  RefreshToken,
  UserRole,
  User,
];

