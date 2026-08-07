import { loginAs } from './auth';
import { apiClient } from './client';

export interface Fixtures {
  branch1Id: string;
  branch2Id: string;
  bookId: string;
  userId: string;
  billId: string;
}

let cachedFixtures: Fixtures | null = null;

export async function getFixtures(): Promise<Fixtures> {
  if (cachedFixtures) return cachedFixtures;

  const token = await loginAs('SUPER_ADMIN');

  // Fetch branches
  const branchesRes = await apiClient('GET', '/branches', { token });
  const branches = branchesRes.body.data;
  const branch1Id = branches.find((b: any) => b.code === 'BR-01')?.id;
  const branch2Id = branches.find((b: any) => b.code === 'BR-02')?.id;

  // Fetch books
  const booksRes = await apiClient('GET', '/catalog/books', { token });
  const booksData = booksRes.body.data;
  // findAllBooks returns a paginated { books, total, ... } shape
  const bookId = (Array.isArray(booksData) ? booksData[0] : booksData?.books?.[0])?.id;

  // Fetch users
  const usersRes = await apiClient('GET', '/users', { token });
  const userId = usersRes.body.data.find((u: any) => u.email === 'counter.br01@bms.com')?.id;

  // Fetch bills (need BRANCH_FRONT_OFFICE for BR-01)
  const foToken = await loginAs('BRANCH_FRONT_OFFICE');
  const billsRes = await apiClient('GET', `/billing?branchId=${branch1Id}`, { token: foToken });
  const billsData = billsRes.body.data;
  // getBills returns a paginated { items, total, ... } shape
  const billId = (Array.isArray(billsData) ? billsData[0] : billsData?.items?.[0])?.id;

  cachedFixtures = {
    branch1Id,
    branch2Id,
    bookId,
    userId,
    billId,
  };

  return cachedFixtures;
}
