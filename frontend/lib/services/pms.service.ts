import 'server-only';
import { Pool } from 'pg';

export interface PmsTitle {
  pmsTitleId: string;
  title: string;
  titleMl: string | null;
  isbn: string | null;
  category: string | null;
  language: string;
  edition: string;
  price: number;
  costPrice: number;
  pages: number | null;
  binding: string | null;
  authorName: string | null;
  pmsStock: number;
  productionStatus: string | null;
  warehouseReceivedQty: number;
  printCompletedAt: string | null;
}

let pool: Pool | null = null;

function getPmsPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.PMS_DATABASE_URL ||
      'postgresql://neondb_owner:npg_dRhpOeiz0t1r@ep-shiny-leaf-azov12ss-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?schema=kairali_pms&sslmode=require';
    
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export class PmsIntegrationService {
  async getCompletedTitles(): Promise<PmsTitle[]> {
    const client = await getPmsPool().connect();
    try {
      const query = `
        SELECT 
          t.id AS pms_title_id,
          t.name AS title,
          t.name_ml AS title_ml,
          t.isbn,
          t.category,
          t.language,
          t.edition,
          t.mrp_paise,
          t.unit_cost_paise,
          t.pages,
          t.binding,
          COALESCE(t.stock, 0) AS pms_stock,
          a.name AS author_name,
          p.status AS production_status,
          COALESCE(p.warehouse_received_qty, 0) AS warehouse_received_qty,
          p.print_completed_at
        FROM kairali_pms.titles t
        LEFT JOIN kairali_pms.authors a ON t.author_id = a.id
        LEFT JOIN kairali_pms.production_projects p ON p.title_id = t.id
        WHERE p.status = 'completed' OR t.status = 'active'
        ORDER BY t.created_at DESC
      `;

      const res = await client.query(query);

      return res.rows.map((row) => {
        const mrp = Number(row.mrp_paise || 0) / 100;
        let cost = Number(row.unit_cost_paise || 0) / 100;
        if (!cost && mrp > 0) {
          cost = Math.round(mrp * 0.6 * 100) / 100; // default 60% if unset
        }

        return {
          pmsTitleId: row.pms_title_id,
          title: row.title,
          titleMl: row.title_ml || null,
          isbn: row.isbn || null,
          category: row.category || 'General',
          language: row.language || 'Malayalam',
          edition: row.edition || '1st',
          price: mrp,
          costPrice: cost,
          pages: row.pages ? Number(row.pages) : null,
          binding: row.binding || 'Paperback',
          authorName: row.author_name || 'Unknown',
          pmsStock: Number(row.pms_stock || 0),
          productionStatus: row.production_status || null,
          warehouseReceivedQty: Number(row.warehouse_received_qty || 0),
          printCompletedAt: row.print_completed_at || null,
        };
      });
    } catch (err) {
      console.error('Error querying PMS completed titles:', err);
      throw err;
    } finally {
      client.release();
    }
  }
}
