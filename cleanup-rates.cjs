#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Database path (adjust if different)
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

try {
    const db = new Database(dbPath);
    
    console.log('🧹 Starting exchange rate cleanup...');
    
    // Show current rates
    const currentRates = db.prepare('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency').all();
    console.log(`📊 Current rates in database: ${currentRates.length}`);
    
    // Remove old CNY-based rates (keep only USD as base currency)
    const deleteOldRates = db.prepare(`
        DELETE FROM exchange_rates 
        WHERE from_currency = 'CNY' AND to_currency != 'CNY'
    `);
    
    const deleteOldSelfRate = db.prepare(`
        DELETE FROM exchange_rates 
        WHERE from_currency = 'CNY' AND to_currency = 'CNY'
    `);
    
    const result1 = deleteOldRates.run();
    const result2 = deleteOldSelfRate.run();
    
    const totalDeleted = result1.changes + result2.changes;
    
    console.log(`🗑️  Deleted ${totalDeleted} old CNY-based rates`);
    
    // Show remaining rates
    const remainingRates = db.prepare('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency').all();
    console.log(`📊 Remaining rates in database: ${remainingRates.length}`);
    
    remainingRates.forEach(rate => {
        console.log(`   ${rate.from_currency} -> ${rate.to_currency}: ${rate.rate}`);
    });
    
    db.close();
    console.log('✅ Cleanup completed successfully!');
    
} catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
}
