import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { BillingModule } from './billing/billing.module';
import { RestockModule } from './restock/restock.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ExhibitionsModule } from './exhibitions/exhibitions.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { FinanceModule } from './finance/finance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';

/**
 * AppModule — root of the NestJS module graph.
 *
 * Registers infrastructure concerns (database, cache, rate-limiting)
 * globally so every feature module can inject them without re-registering.
 *
 * Feature modules (auth, users, billing, …) are added here phase by phase.
 */
@Module({
  imports: [
    // ── Environment variables ───────────────────────────────────────────────
    // isGlobal: true means every module can inject ConfigService without
    // importing ConfigModule themselves.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── MySQL via TypeORM ───────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'bms_user'),
        password: config.get<string>('DB_PASSWORD', 'BmsApp@2026'),
        database: config.get<string>('DB_NAME', 'bms_db'),
        // Auto-discover entities from all feature modules via glob.
        // This is safe; we control the schema via migrations.
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // synchronize: false — we ALWAYS use migrations for schema changes.
        // Setting this true would silently alter tables and destroy data.
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
        // Keep connections alive across the node process lifetime
        keepConnectionAlive: true,
        // Charset must match the DB we created (utf8mb4_unicode_ci)
        charset: 'utf8mb4_unicode_ci',
        timezone: 'Z', // Z = UTC; matches our process.env.TZ = 'UTC'
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),

    // ── Redis cache (falls back to in-memory if REDIS_HOST is blank) ────────
    // Why: book catalog, categories, authors, publishers, and settings are
    // read far more than they change. Caching them reduces DB load significantly.
    // Stock counts, bills, and dashboard figures are NEVER cached — see rule in CLAUDE.md.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST', '');

        if (redisHost) {
          // Redis store — used when REDIS_HOST is set.
          // cache-manager-redis-yet@5 takes connection options directly
          // (no pre-created client) — the store manages the connection internally.
          const { redisStore } = await import('cache-manager-redis-yet');

          return {
            store: await redisStore({
              socket: {
                host: redisHost,
                port: config.get<number>('REDIS_PORT', 6379),
              },
              password: config.get<string>('REDIS_PASSWORD') || undefined,
            }),
            ttl: 60 * 5, // 5-minute default TTL
          };
        }

        // In-memory fallback — sufficient for local development
        console.warn(
          '[Cache] REDIS_HOST not set — using in-memory cache. ' +
          'Cache will be lost on server restart.',
        );
        return {
          ttl: 60 * 5, // 5-minute default TTL
        };
      },
    }),

    // ── Rate limiting ───────────────────────────────────────────────────────
    // Protects auth endpoints from brute-force attacks.
    // Fine-grained limits (e.g. 5 req/min on /auth/login) are applied per-route.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // ── Feature modules (added phase by phase) ──────────────────────────────
    HealthModule,
    AuthModule,
    NotificationsModule,
    UsersModule,
    BranchesModule,
    CatalogModule,
    InventoryModule,
    BillingModule,
    RestockModule,
    ProcurementModule,
    ExhibitionsModule,
    EnquiriesModule,
    FinanceModule,
    DashboardModule,
    AuditModule,
    SettingsModule,
  ],
})
export class AppModule {}
