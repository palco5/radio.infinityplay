import { Client } from 'basic-ftp';

const FTP_CONFIG = {
    host: 'ftpcluster.loopia.se',
    user: 'infinityplay.rs',
    password: 'Sp/R/d0N0v',
    secure: false
};

async function main() {
    const client = new Client();
    client.ftp.verbose = true;

    try {
        console.log('🔌 Connecting to Loopia FTP...');
        await client.access(FTP_CONFIG);
        console.log('✅ Connected!');

        console.log('\n📂 Listing root directory:');
        const list = await client.list('/');

        for (const item of list) {
            console.log(` - ${item.name} (${item.isDirectory ? 'DIR' : 'FILE'})`);
        }

        // Check if public_html exists
        const publicHtml = list.find(i => i.name === 'public_html');
        if (publicHtml) {
            console.log('\n📂 Listing public_html:');
            const publicList = await client.list('/public_html');
            for (const item of publicList) {
                console.log(` - ${item.name} (${item.isDirectory ? 'DIR' : 'FILE'})`);
            }
        }

        // Check radio.infinityplay.rs
        console.log('\n📂 Listing radio.infinityplay.rs:');
        const radioList = await client.list('/radio.infinityplay.rs');
        for (const item of radioList) {
            console.log(` - ${item.name} (${item.isDirectory ? 'DIR' : 'FILE'})`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.close();
    }
}

main();
