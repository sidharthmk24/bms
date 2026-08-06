import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMultiRoles1785917494546 implements MigrationInterface {
    name = 'AddMultiRoles1785917494546'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create table and add primary_role
        await queryRunner.query(`CREATE TABLE \`user_roles\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`role\` enum ('SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE') NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_09d115a69b6014d324d592f9c4\` (\`user_id\`, \`role\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`primary_role\` enum ('SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE') NULL`);
        await queryRunner.query(`ALTER TABLE \`user_roles\` ADD CONSTRAINT \`FK_87b8888186ca9769c960e926870\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);

        // 2. Backfill: copy role to primary_role
        await queryRunner.query(`UPDATE \`user\` SET \`primary_role\` = \`role\``);

        // 3. Backfill: insert into user_roles
        await queryRunner.query(`INSERT INTO \`user_roles\` (\`id\`, \`user_id\`, \`role\`) SELECT UUID(), \`id\`, \`role\` FROM \`user\``);

        // 4. Drop old role column
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Re-add role column
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`role\` enum ('SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE') NULL`);
        
        // 2. Backfill from primary_role
        await queryRunner.query(`UPDATE \`user\` SET \`role\` = \`primary_role\``);

        // Make it NOT NULL again
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`role\` \`role\` enum ('SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER', 'FINANCE', 'BRANCH_MANAGER', 'BRANCH_INVENTORY', 'BRANCH_FRONT_OFFICE') NOT NULL`);

        // 3. Drop objects
        await queryRunner.query(`ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_87b8888186ca9769c960e926870\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`primary_role\``);
        await queryRunner.query(`DROP INDEX \`IDX_09d115a69b6014d324d592f9c4\` ON \`user_roles\``);
        await queryRunner.query(`DROP TABLE \`user_roles\``);
    }
}
