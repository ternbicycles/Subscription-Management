const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseMigrations {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.migrations = [
      {
        version: 1,
        name: 'initial_schema_consolidated',
        up: () => this.migration_001_initial_schema_consolidated()
      },
      {
        version: 2,
        name: 'add_notification_tables_telegram',
        up: () => this.migration_002_add_notification_tables_telegram()
      }
    ];
  }

  // Initialize migrations table
  initMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Get current database version
  getCurrentVersion() {
    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM migrations').get();
      return result.version || 0;
    } catch (error) {
      return 0;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    console.log('🔄 Checking for database migrations...');

    // Set database pragmas first (outside transaction)
    console.log('📝 Setting database pragmas...');
    this.db.pragma('foreign_keys = ON');

    this.initMigrationsTable();
    const currentVersion = this.getCurrentVersion();

    console.log(`📊 Current database version: ${currentVersion}`);

    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Running migration ${migration.version}: ${migration.name}`);

        // Run migration in transaction
        this.db.transaction(() => {
          migration.up();
          this.db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        })();

        console.log(`✅ Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  }

  // Migration 001: Consolidated initial schema - Create all tables and data
  migration_001_initial_schema_consolidated() {
    console.log('📝 Creating consolidated database schema from schema.sql...');

    try {
      // Read and execute the schema.sql file
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

      // Remove comments and PRAGMA statements
      const cleanSQL = schemaSQL
        .split('\n')
        .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('PRAGMA'))
        .join('\n');

      // Split into statements more carefully, handling multi-line statements
      const statements = this.parseSQL(cleanSQL);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            this.db.exec(statement);
          } catch (error) {
            // Log the problematic statement for debugging
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }



      console.log('✅ Consolidated schema created successfully from schema.sql');
    } catch (error) {
      console.error('❌ Error creating consolidated schema:', error.message);
      throw error;
    }
  }

  // Migration 002: Add notification tables
  migration_002_add_notification_tables_telegram() {
    console.log('📝 Creating notification tables (telegram)...');

    // Create notification_settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        notification_type TEXT NOT NULL CHECK (
          notification_type IN (
            'renewal_reminder', 'expiration_warning', 
            'renewal_success', 'renewal_failure', 'subscription_change'
          )
        ),
        is_enabled BOOLEAN NOT NULL DEFAULT 1,
        advance_days INTEGER DEFAULT 7,
        notification_channels TEXT NOT NULL DEFAULT '["telegram"]',
        time_window_start TEXT DEFAULT '09:00',
        time_window_end TEXT DEFAULT '22:00',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_type)
      );
    `);

    // Create notification_channels table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        channel_type TEXT NOT NULL CHECK (channel_type IN ('telegram')),
        channel_config TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, channel_type)
      );
    `);

    // Create notification_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1,
        subscription_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (
          status IN ('pending', 'sent', 'failed', 'retrying')
        ),
        recipient TEXT NOT NULL,
        message_content TEXT NOT NULL,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retry INTEGER DEFAULT 3,
        scheduled_at DATETIME NOT NULL,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
      );
    `);

    // Create notification_templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_type TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'zh-CN',
        channel_type TEXT NOT NULL,
        template_name TEXT NOT NULL,
        subject_template TEXT,
        content_template TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_type, language, channel_type)
      );
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notification_settings_user_type 
      ON notification_settings(user_id, notification_type);
      
      CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled 
      ON notification_settings(is_enabled);
      
      CREATE INDEX IF NOT EXISTS idx_notification_channels_user_type 
      ON notification_channels(user_id, channel_type);
      
      CREATE INDEX IF NOT EXISTS idx_notification_channels_active 
      ON notification_channels(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_notification_history_user 
      ON notification_history(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_notification_history_subscription 
      ON notification_history(subscription_id);
      
      CREATE INDEX IF NOT EXISTS idx_notification_history_status 
      ON notification_history(status);
      
      CREATE INDEX IF NOT EXISTS idx_notification_history_scheduled 
      ON notification_history(scheduled_at);
      
      CREATE INDEX IF NOT EXISTS idx_notification_history_created 
      ON notification_history(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_notification_templates_type 
      ON notification_templates(notification_type);
      
      CREATE INDEX IF NOT EXISTS idx_notification_templates_language 
      ON notification_templates(language);
    `);

    // Insert default notification settings
    this.db.exec(`
      INSERT OR IGNORE INTO notification_settings (user_id, notification_type, is_enabled, advance_days, notification_channels) VALUES
      (1, 'renewal_reminder', 1, 7, '["telegram"]'),
      (1, 'expiration_warning', 1, 1, '["telegram"]'),
      (1, 'renewal_success', 1, 0, '["telegram"]'),
      (1, 'renewal_failure', 1, 0, '["telegram"]'),
      (1, 'subscription_change', 1, 0, '["telegram"]');
    `);

    // Insert default notification templates for Telegram
    this.db.exec(`
      INSERT OR IGNORE INTO notification_templates (notification_type, language, channel_type, template_name, content_template) VALUES
      ('renewal_reminder', 'zh-CN', 'telegram', 'default', 
        '<b>续订提醒</b>

📢 <b>{{name}}</b> 即将到期

📅 到期时间: {{next_billing_date}}
💰 金额: {{amount}} {{currency}}
💳 支付方式: {{payment_method}}
📋 计划: {{plan}}

请及时续订以避免服务中断。'),
      
      ('expiration_warning', 'zh-CN', 'telegram', 'default',
        '<b>⚠️ 订阅过期警告</b>

📢 <b>{{name}}</b> 已经过期

📅 过期时间: {{next_billing_date}}
💰 金额: {{amount}} {{currency}}
💳 支付方式: {{payment_method}}
📋 计划: {{plan}}

请尽快续订以恢复服务。'),
      
      ('renewal_success', 'zh-CN', 'telegram', 'default',
        '<b>✅ 续订成功</b>

📢 <b>{{name}}</b> 续订成功

💰 支付金额: {{amount}} {{currency}}
📅 新的到期时间: {{next_billing_date}}
💳 支付方式: {{payment_method}}
📋 计划: {{plan}}

感谢您的续费！'),
      
      ('renewal_failure', 'zh-CN', 'telegram', 'default',
        '<b>❌ 续订失败</b>

📢 <b>{{name}}</b> 续订失败

💰 金额: {{amount}} {{currency}}
📅 计划续订时间: {{next_billing_date}}
💳 支付方式: {{payment_method}}
📋 计划: {{plan}}

请检查支付方式并手动续订。'),
      
      ('subscription_change', 'zh-CN', 'telegram', 'default',
        '<b>📝 订阅变更</b>

📢 <b>{{name}}</b> 信息已更新

📋 计划: {{plan}}
💰 金额: {{amount}} {{currency}}
📅 下次付款: {{next_billing_date}}
💳 支付方式: {{payment_method}}

变更已生效。');
    `);

    console.log('✅ Notification tables created successfully (telegram)');
  }

  // Helper method to parse SQL statements properly
  parseSQL(sql) {
    const statements = [];
    let currentStatement = '';
    let inTrigger = false;

    const lines = sql.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === '') continue;

      // Check if we're starting a trigger
      if (trimmedLine.toUpperCase().startsWith('CREATE TRIGGER')) {
        inTrigger = true;
      }

      currentStatement += line + '\n';

      // Check if we're ending a statement
      if (trimmedLine.endsWith(';')) {
        if (inTrigger && trimmedLine.toUpperCase().includes('END;')) {
          // End of trigger
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inTrigger) {
          // Regular statement
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  }


  close() {
    this.db.close();
  }
}

module.exports = DatabaseMigrations;
