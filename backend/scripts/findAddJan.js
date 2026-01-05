/**
 * DEBUG Script: Find ALL vendors matching "Add" or "Jan" and compare pricing
 * Run: node scripts/findAddJan.js
 * 
 * This helps identify if there are DUPLICATE vendors or if data isn't being saved correctly
 */

import mongoose from 'mongoose';
import temporaryTransporterModel from '../model/temporaryTransporterModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection
const connectDB = async () => {
    try {
        // Priority: Command line arg > Env var > Default localhost
        const mongoURI = process.argv[2] || process.env.MONGO_URI || process.env.MONGO_DB_URL || 'mongodb://localhost:27017/freightcompare';

        console.log('🔌 Connecting to MongoDB...');
        console.log('   URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@'));

        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('\n💡 Usage: node scripts/findAddJan.js "mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
        process.exit(1);
    }
};

const findVendors = async () => {
    try {
        await connectDB();

        console.log('\n' + '='.repeat(80));
        console.log('🔍 SEARCHING FOR ALL "Add Jan" VENDORS (CASE INSENSITIVE)');
        console.log('='.repeat(80));

        // Search multiple patterns
        const patterns = [
            { name: 'Exact "Add Jan"', regex: /^Add Jan$/i },
            { name: 'Contains "Add Jan"', regex: /add.*jan/i },
            { name: 'Contains "jan"', regex: /jan/i },
            { name: 'Contains "add"', regex: /add/i },
        ];

        for (const pattern of patterns) {
            const vendors = await temporaryTransporterModel.find({
                companyName: { $regex: pattern.regex }
            }).select('_id companyName createdAt updatedAt prices.priceRate.docketCharges prices.priceRate.greenTax prices.priceChart').lean();

            console.log(`\n📋 ${pattern.name}: ${vendors.length} match(es)`);

            if (vendors.length > 0) {
                vendors.forEach((v, i) => {
                    const pr = v.prices?.priceRate || {};
                    const chart = v.prices?.priceChart || {};
                    const n1s1price = chart?.N1?.S1 || chart?.n1?.s1 || 'N/A';

                    console.log(`   ${i + 1}. "${v.companyName}"`);
                    console.log(`      _id: ${v._id}`);
                    console.log(`      Created: ${v.createdAt}`);
                    console.log(`      Updated: ${v.updatedAt}`);
                    console.log(`      Docket: ₹${pr.docketCharges ?? 'N/A'}, GreenTax: ₹${pr.greenTax ?? 'N/A'}`);
                    console.log(`      N1→S1 Price: ₹${n1s1price}/kg`);
                });
            }
        }

        // Now get the FULL details for any exact match
        console.log('\n' + '='.repeat(80));
        console.log('📊 FULL DETAIL FOR "Add Jan" (or closest match)');
        console.log('='.repeat(80));

        let vendor = await temporaryTransporterModel.findOne({
            companyName: { $regex: /^Add Jan$/i }
        }).lean();

        if (!vendor) {
            vendor = await temporaryTransporterModel.findOne({
                companyName: { $regex: /add.*jan/i }
            }).lean();
        }

        if (!vendor) {
            console.log('\n❌ No "Add Jan" vendor found!');

            // Show first 10 vendors instead
            const allVendors = await temporaryTransporterModel.find({})
                .select('companyName _id')
                .limit(10)
                .lean();

            console.log('\nFirst 10 vendors in DB:');
            allVendors.forEach((v, i) => console.log(`   ${i + 1}. ${v.companyName} (${v._id})`));
            return;
        }

        console.log(`\n✅ Found: "${vendor.companyName}"`);
        console.log(`   _id: ${vendor._id}`);
        console.log(`   customerID: ${vendor.customerID}`);

        console.log('\n💰 PRICE RATE BREAKDOWN:');
        const pr = vendor.prices?.priceRate || {};
        console.log(`   minWeight: ${pr.minWeight}`);
        console.log(`   minCharges: ${pr.minCharges}`);
        console.log(`   docketCharges: ${pr.docketCharges}`);
        console.log(`   fuel: ${pr.fuel}%`);
        console.log(`   greenTax: ${pr.greenTax}`);
        console.log(`   daccCharges: ${pr.daccCharges}`);
        console.log(`   miscellanousCharges: ${pr.miscellanousCharges}`);
        console.log(`   divisor (kFactor): ${pr.divisor || pr.kFactor || 'not set'}`);

        console.log('\n   CHARGE OBJECTS:');
        const charges = ['rovCharges', 'handlingCharges', 'appointmentCharges', 'insuaranceCharges', 'fmCharges', 'odaCharges'];
        for (const charge of charges) {
            const c = pr[charge];
            if (c) {
                console.log(`   ${charge}: fixed=₹${c.fixed ?? 0}, variable=${c.variable ?? 0}%`);
            } else {
                console.log(`   ${charge}: NOT SET`);
            }
        }

        console.log('\n📊 PRICE CHART:');
        const chart = vendor.prices?.priceChart || {};
        if (Object.keys(chart).length === 0) {
            console.log('   EMPTY - No zone pricing!');
        } else {
            console.log(JSON.stringify(chart, null, 2).split('\n').map(l => '   ' + l).join('\n'));
        }

        console.log('\n🗺️ ZONE CONFIG:');
        console.log(`   selectedZones: [${(vendor.selectedZones || []).join(', ')}]`);

        // 🔥 IMPORTANT: Show what the calculator would compute
        console.log('\n' + '='.repeat(80));
        console.log('🧮 SIMULATED CALCULATION (100 kg, N1 → S1)');
        console.log('='.repeat(80));

        const unitPrice = chart?.N1?.S1 || chart?.n1?.s1 || 0;
        const chargeableWeight = 100;
        const baseFreight = unitPrice * chargeableWeight;
        const fuel = pr.fuel || 0;
        const fuelCharges = (fuel / 100) * baseFreight;

        console.log(`   Unit Price (N1→S1): ₹${unitPrice}/kg`);
        console.log(`   Chargeable Weight: ${chargeableWeight} kg`);
        console.log(`   Base Freight: ₹${unitPrice} × ${chargeableWeight} = ₹${baseFreight}`);
        console.log(`   Fuel (${fuel}%): ₹${fuelCharges.toFixed(2)}`);
        console.log(`   Docket: ₹${pr.docketCharges || 0}`);
        console.log(`   Green Tax: ₹${pr.greenTax || 0}`);
        console.log(`   DACC: ₹${pr.daccCharges || 0}`);
        console.log(`   Misc: ₹${pr.miscellanousCharges || 0}`);
        console.log(`   ROV: ₹${pr.rovCharges?.fixed || 0}`);
        console.log(`   Handling: ₹${pr.handlingCharges?.fixed || 0}`);
        console.log(`   Appointment: ₹${pr.appointmentCharges?.fixed || 0}`);
        console.log(`   Insurance: ₹${pr.insuaranceCharges?.fixed || 0}`);
        console.log(`   FM Charges: ₹${pr.fmCharges?.fixed || 0}`);

        const total =
            Math.max(baseFreight, pr.minCharges || 0) +
            (pr.docketCharges || 0) +
            (pr.greenTax || 0) +
            (pr.daccCharges || 0) +
            (pr.miscellanousCharges || 0) +
            fuelCharges +
            (pr.rovCharges?.fixed || 0) +
            (pr.handlingCharges?.fixed || 0) +
            (pr.appointmentCharges?.fixed || 0) +
            (pr.insuaranceCharges?.fixed || 0) +
            (pr.fmCharges?.fixed || 0);

        console.log('\n   ------------------------------------');
        console.log(`   ✅ EXPECTED TOTAL: ₹${Math.round(total)}`);
        console.log('   ------------------------------------');

        console.log('\n⚠️ COMPARE THIS with what the Calculator Page shows!');
        console.log('   If they differ, the calculator is reading DIFFERENT data.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed.');
    }
};

// Run
findVendors();
