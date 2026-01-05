// Script to get pricing data for all public transporters
import mongoose from 'mongoose';

const MONGO_URL = 'mongodb+srv://ForusELectric:BadeDevs%409123@foruscluster.6guqi8k.mongodb.net/test?retryWrites=true&w=majority';

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to test database');

    // Get all public transporters
    const transporters = await mongoose.connection.db.collection('transporters')
        .find({})
        .project({ _id: 1, companyName: 1, servicableZones: 1 })
        .toArray();

    console.log(`\n=== ${transporters.length} PUBLIC TRANSPORTERS ===`);
    for (const t of transporters) {
        console.log(`${t.companyName}: [${(t.servicableZones || []).join(', ')}]`);
    }

    // Get pricing for each transporter
    const prices = await mongoose.connection.db.collection('prices')
        .find({})
        .toArray();

    console.log(`\n=== ZONE PRICING (for test cases) ===`);

    // Create test case data
    const testZones = [
        { from: 'N1', to: 'N1', name: 'Delhi to Delhi (Same Zone)' },
        { from: 'N1', to: 'S1', name: 'Delhi to Hyderabad (North to South)' },
        { from: 'E1', to: 'W1', name: 'Kolkata to Ahmedabad (East to West)' },
        { from: 'W2', to: 'S2', name: 'Mumbai to Chennai (West to South)' },
        { from: 'C1', to: 'N2', name: 'Indore to Varanasi (Central to North)' },
    ];

    console.log('\n--- PRICING BY VENDOR FOR EACH ZONE PAIR ---');

    for (const testCase of testZones) {
        console.log(`\n📍 ${testCase.name} (${testCase.from} → ${testCase.to}):`);

        for (const p of prices) {
            const transporter = transporters.find(t => t._id.toString() === p.companyId?.toString());
            if (!transporter) continue;

            // Get rate for this zone pair
            if (p.zoneRates) {
                const rates = p.zoneRates instanceof Map ? Object.fromEntries(p.zoneRates) : p.zoneRates;
                const fromRates = rates[testCase.from];
                if (fromRates) {
                    const toRates = fromRates instanceof Map ? Object.fromEntries(fromRates) : fromRates;
                    const rate = toRates[testCase.to];
                    if (rate !== undefined) {
                        console.log(`   ${transporter.companyName}: ₹${rate}/kg`);
                    }
                }
            }
        }
    }

    await mongoose.disconnect();
}

main().catch(console.error);
