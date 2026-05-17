import { Client } from 'basic-ftp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const FTP_CONFIG = {
    host: 'ftpcluster.loopia.se',
    user: 'infinityplay.rs',
    password: 'Sp/R/d0N0v',
    secure: false
};

async function uploadDirectory(client, localPath, remotePath) {
    const files = await readdir(localPath);

    for (const file of files) {
        const localFile = join(localPath, file);
        const remoteFile = `${remotePath}/${file}`;
        const fileStat = await stat(localFile);

        if (fileStat.isDirectory()) {
            console.log(`📁 Creating directory: ${remoteFile}`);
            try {
                await client.ensureDir(remoteFile);
            } catch (e) {
                // Directory might already exist
            }
            await uploadDirectory(client, localFile, remoteFile);
        } else {
            console.log(`📤 Uploading: ${file}`);
            await client.uploadFrom(localFile, remoteFile);
        }
    }
}

async function main() {
    const client = new Client();
    client.ftp.verbose = true;

    try {
        console.log('🔌 Connecting to Loopia FTP...');
        await client.access(FTP_CONFIG);
        console.log('✅ Connected!');

        // Upload API folder
        console.log('\n📤 Uploading API folder...');
        const remoteRoot = '/radio.infinityplay.rs/public_html/api';
        await client.ensureDir(remoteRoot);
        await uploadDirectory(client, './api', remoteRoot);

        console.log('\n✅ API folder uploaded successfully!');
        console.log('\n🧪 Test API:');
        console.log('   curl https://radio.infinityplay.rs/api/health');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
