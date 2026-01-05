/**
 * Migration Script: Rebuild Serviceability for Old Vendors
 *
 * This script rebuilds the serviceability array for vendors that have
 * zoneConfig but empty serviceability array (affected by the priceChart bug).
 *
 * Run with: node backend/scripts/migrateServiceability.js
 */

import mongoose from 'mongoose';
import temporaryTransporterModel from '../model/temporaryTransporterModel.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/freight';

async function migrateServiceability() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find vendors with zoneConfig but empty serviceability
    const vendors = await temporaryTransporterModel.find({
      $and: [
        { zoneConfig: { $exists: true, $ne: null } },
        { $or: [
          { serviceability: { $exists: false } },
          { serviceability: { $size: 0 } },
          { serviceability: [] }
        ]}
      ]
    });

    console.log(`\n📊 Found ${vendors.length} vendors with zoneConfig but no serviceability`);

    if (vendors.length === 0) {
      console.log('✅ No vendors need migration');
      await mongoose.disconnect();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const vendor of vendors) {
      try {
        const zoneConfig = vendor.zoneConfig;

        // Convert Map to object if needed
        const zoneConfigObj = zoneConfig instanceof Map
          ? Object.fromEntries(zoneConfig)
          : zoneConfig;

        if (!zoneConfigObj || Object.keys(zoneConfigObj).length === 0) {
          console.log(`⚠️  Skipping ${vendor.companyName} - zoneConfig is empty`);
          skippedCount++;
          continue;
        }

        // Rebuild serviceability array from zoneConfig
        const serviceabilityArray = [];

        for (const [zone, pincodes] of Object.entries(zoneConfigObj)) {
          if (!Array.isArray(pincodes)) continue;

          for (const pincode of pincodes) {
            serviceabilityArray.push({
              pincode: String(pincode),
              zone: String(zone).toUpperCase(),
              state: '', // Unknown - will need manual update
              city: '',  // Unknown - will need manual update
              isODA: false, // Default to false
              active: true
            });
          }
        }

        if (serviceabilityArray.length === 0) {
          console.log(`⚠️  Skipping ${vendor.companyName} - no valid pincodes in zoneConfig`);
          skippedCount++;
          continue;
        }

        // Update the vendor
        vendor.serviceability = serviceabilityArray;
        vendor.serviceabilitySource = 'migrated';
        vendor.serviceabilityChecksum = ''; // Will need to be regenerated

        await vendor.save();

        console.log(`✅ Migrated ${vendor.companyName}: ${serviceabilityArray.length} pincodes across ${Object.keys(zoneConfigObj).length} zones`);
        migratedCount++;

      } catch (err) {
        console.error(`❌ Error migrating ${vendor.companyName}:`, err.message);
        skippedCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} vendors`);
    console.log(`   ⚠️  Skipped: ${skippedCount} vendors`);
    console.log(`   📊 Total: ${vendors.length} vendors processed`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateServiceability();
