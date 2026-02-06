
import dns from 'dns';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL not found in .env');
    process.exit(1);
}

const hostname = new URL(supabaseUrl).hostname;
console.log(`\n🔍 Diagnosing connection to: ${hostname}`);

// 1. DNS Lookup
console.log('1️⃣  Testing DNS Resolution...');
dns.lookup(hostname, (err, address, family) => {
    if (err) {
        console.error(`❌ DNS Lookup FAILED: ${err.code}`);
        console.error('   -> Your computer cannot find the IP address for this Supabase URL.');
        console.error('   -> Possible causes: Bad URL, offline, or restricted DNS.');
    } else {
        console.log(`✅ DNS Resolved: ${address} (IPv${family})`);

        // 2. HTTPS Connection
        console.log('2️⃣  Testing TCP/HTTPS Connection...');
        const req = https.request({
            hostname: hostname,
            port: 443,
            method: 'HEAD',
            timeout: 5000
        }, (res) => {
            console.log(`✅ Connection Established! Status Code: ${res.statusCode}`);
            console.log('   -> Network path is CLEAR.');
        });

        req.on('error', (e) => {
            console.error(`❌ Connection FAILED: ${e.message}`);
            console.error('   -> DNS worked, but we could not establish a connection.');
            console.error('   -> Possible causes: Firewall, blocked port 443, or server down.');
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('❌ Connection TIMED OUT');
        });

        req.end();
    }
});
