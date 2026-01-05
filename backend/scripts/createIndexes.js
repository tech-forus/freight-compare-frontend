import mongoose from 'mongoose';
import dotenv from 'dotenv';
import temporaryTransporterModel from '../model/temporaryTransporterModel.js';
import priceModel from '../model/priceModel.js';
import transporterModel from '../model/transporterModel.js';

dotenv.config();

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    const dbUrl = process.env.MONGO_DB_URL;
    if (!dbUrl) {
      throw new Error('MONGO_DB_URL environment variable is not defined');
    }
    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB successfully');

    console.log('\n=== Creating Indexes ===\n');

    // 1. Check and create indexes for priceModel
    console.log('Checking priceModel indexes...');
    const priceIndexes = await priceModel.collection.getIndexes();
    console.log('Current priceModel indexes:', Object.keys(priceIndexes));

    if (!priceIndexes.companyId_1) {
      console.log('Creating index on priceModel.companyId...');
      await priceModel.collection.createIndex({ companyId: 1 });
      console.log('✓ Created companyId index on prices collection');
    } else {
      console.log('✓ companyId index already exists on prices collection');
    }

    // 2. Check and create indexes for temporaryTransporterModel
    console.log('\nChecking temporaryTransporterModel indexes...');
    const tempIndexes = await temporaryTransporterModel.collection.getIndexes();
    console.log('Current temporaryTransporterModel indexes:', Object.keys(tempIndexes));

    if (!tempIndexes.customerID_1) {
      console.log('Creating index on temporaryTransporterModel.customerID...');
      await temporaryTransporterModel.collection.createIndex({ customerID: 1 });
      console.log('✓ Created customerID index on temporaryTransporters collection');
    } else {
      console.log('✓ customerID index already exists on temporaryTransporters collection');
    }

    if (!tempIndexes.customerID_1_approvalStatus_1) {
      console.log('Creating compound index on temporaryTransporterModel.customerID + approvalStatus...');
      await temporaryTransporterModel.collection.createIndex({ customerID: 1, approvalStatus: 1 });
      console.log('✓ Created customerID+approvalStatus compound index on temporaryTransporters collection');
    } else {
      console.log('✓ customerID+approvalStatus compound index already exists on temporaryTransporters collection');
    }

    // 3. Check and create indexes for transporterModel
    console.log('\nChecking transporterModel indexes...');
    const transporterIndexes = await transporterModel.collection.getIndexes();
    console.log('Current transporterModel indexes:', Object.keys(transporterIndexes));

    if (!transporterIndexes.companyName_1) {
      console.log('Creating index on transporterModel.companyName...');
      await transporterModel.collection.createIndex({ companyName: 1 });
      console.log('✓ Created companyName index on transporters collection');
    } else {
      console.log('✓ companyName index already exists on transporters collection');
    }

    if (!transporterIndexes.isTransporter_1) {
      console.log('Creating index on transporterModel.isTransporter...');
      await transporterModel.collection.createIndex({ isTransporter: 1 });
      console.log('✓ Created isTransporter index on transporters collection');
    } else {
      console.log('✓ isTransporter index already exists on transporters collection');
    }

    console.log('\n=== Index Creation Complete ===\n');

    // Verify indexes
    console.log('Final priceModel indexes:', Object.keys(await priceModel.collection.getIndexes()));
    console.log('Final temporaryTransporterModel indexes:', Object.keys(await temporaryTransporterModel.collection.getIndexes()));
    console.log('Final transporterModel indexes:', Object.keys(await transporterModel.collection.getIndexes()));

    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
