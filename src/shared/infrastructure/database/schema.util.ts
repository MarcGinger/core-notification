/**
 * Copyright (c) 2025 Marc Ginger. All rights reserved.
 *
 * This file is part of a proprietary NestJS system developed by Marc Ginger.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited and may result in legal action.
 *
 * Confidential and proprietary.
 */

import { DataSource } from 'typeorm';
import { AppConfigUtil } from '../../config';

/**
 * Database Schema Management Utilities
 *
 * This utility handles database schema creation and management tasks
 * that need to be performed before the main application starts.
 */
export class DatabaseSchemaUtil {
  /**
   * Ensures that required database schemas exist before application startup.
   * Creates schemas if they don't exist to prevent runtime errors.
   *
   * @throws {Error} If schema creation fails or database connection issues occur
   */
  static async ensureSchemas(): Promise<void> {
    // Get database configuration using centralized config utility
    const dbConfig = AppConfigUtil.getDatabaseConfig();

    // Create a temporary DataSource just for schema creation
    const tempDataSource = new DataSource({
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password,
    });

    try {
      await tempDataSource.initialize();
      const queryRunner = tempDataSource.createQueryRunner();

      // Create required schemas
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS bank_product`);
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS core_slack`);

      await queryRunner.release();
    } catch (error) {
      console.error('Error ensuring schema:', error);
      throw error;
    } finally {
      if (tempDataSource.isInitialized) {
        await tempDataSource.destroy();
      }
    }
  }
}
