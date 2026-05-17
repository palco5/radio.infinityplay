import { Client } from 'basic-ftp';
import path from 'path';

async function deploy() {
    const client = new Client();
    client.ftp.verbose = true;

    const config = {
        host: "ftpcluster.loopia.se",
        user: "infinityplay.rs",
        password: "Sp/R/d0N0v",
        remoteRoot: "/radio.infinityplay.rs/public_html/"
    };

    try {
        console.log("🔌 Povezujem se na Loopia server...");
        await client.access({
            host: config.host,
            user: config.user,
            password: config.password,
            secure: false
        });

        console.log("📂 Ulazim u root folder...");
        await client.ensureDir(config.remoteRoot);

        // NE KORISTIMO clearWorkingDir() jer bi to obrisalo 'api' folder!
        // await client.clearWorkingDir(); 

        console.log("🚀 Uploadujem nove fajlove (overwrite)...");
        // Uploadujemo sadržaj 'dist' foldera
        await client.uploadFromDir("dist");

        console.log("🚀 Uploadujem API fajlove...");
        await client.ensureDir(config.remoteRoot + "api");
        // Upload contents of local 'api' folder to the *current* remote directory (which is now .../api)
        await client.uploadFromDir("api");

        console.log("✅ GOTOVO! Sajt je uspešno postavljen.");
    } catch (err) {
        console.error("❌ GREŠKA:", err);
    }
    client.close();
}

deploy();
