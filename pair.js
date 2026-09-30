const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pino = require('pino');
const logger = pino({ level: 'info' });

const {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require('@whiskeysockets/baileys');

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

async function DILA_MD_PAIR_CODE(id, num, res) {
    const { state, saveCreds } = await useMultiFileAuthState(
        path.join(__dirname, 'temp', id)
    );

    const { version } = await fetchLatestBaileysVersion();

    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            generateHighQualityLinkPreview: true,
            logger: logger,
            syncFullHistory: false,
            browser: Browsers.macOS('Safari'),
            version,
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);

            num = num.replace(/[^0-9]/g, '');

            const code = await sock.requestPairingCode(num);

            if (!res.headersSent) {
                res.send({ code });
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                await delay(5000);

                const credsFilePath = path.join(
                    __dirname,
                    'temp',
                    id,
                    'creds.json'
                );

                try {
                    const credsData = fs.readFileSync(
                        credsFilePath,
                        'utf-8'
                    );

                    const base64Session = Buffer
                        .from(credsData)
                        .toString('base64');

                    // ==========================================
                    // DILA-MD SESSION ID
                    // ==========================================
                    const sessionId = "DILA-MD=" + base64Session;

                    // Send SESSION ID first
                    const codeMessage = await sock.sendMessage(
                        sock.user.id,
                        {
                            text: sessionId
                        }
                    );

                    // ==========================================
                    // SESSION INFORMATION MESSAGE
                    // ==========================================
                    const cap = `
╭━━━〔 🔐 DILA-MD SESSION 〕━━━╮
┃
┃ ✅ *PAIRING SUCCESSFUL*
┃
┃ 🤖 *BOT:* DILA-MD
┃ 👤 *OWNER:* THENULA
┃
┃ 🔑 *SESSION ID SENT ABOVE*
┃
┃ ⚠️ *DO NOT SHARE YOUR SESSION ID*
┃
┃ Anyone with your Session ID
┃ may be able to access your
┃ WhatsApp bot session.
┃
┃
┃ 📌 *SESSION FORMAT*
┃
┃ DILA-MD=xxxxxxxxxxxxxxxx
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

⚡ *Powered by THENULA*
`;

                    await sock.sendMessage(
                        sock.user.id,
                        {
                            text: cap,
                            contextInfo: {
                                externalAdReply: {
                                    title: "DILA-MD SESSION ✅",
                                    body: "Powered by THENULA",
                                    thumbnailUrl:
                                        "https://telegra.ph/file/adc46970456c26cad0c15.jpg",
                                    sourceUrl:
                                        "https://whatsapp.com/",
                                    mediaType: 2,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: false,
                                },
                            },
                        },
                        {
                            quoted: codeMessage,
                        }
                    );

                    // Close connection
                    try {
                        await sock.ws.close();
                    } catch (e) {}

                    // Remove temporary session
                    removeFile(
                        path.join(__dirname, 'temp', id)
                    );

                    logger.info(
                        `👤 ${sock.user.id} CONNECTED ✅`
                    );

                    process.exit(0);

                } catch (error) {

                    logger.error(
                        `Error in connection update: ${error.message}`
                    );

                    try {
                        await sock.sendMessage(
                            sock.user.id,
                            {
                                text: `
❌ *SESSION GENERATION ERROR*

${error.message}

🤖 DILA-MD
⚡ Powered by THENULA
`
                            }
                        );
                    } catch (sendError) {
                        logger.error(
                            `Message send error: ${sendError.message}`
                        );
                    }
                }

            } else if (
                connection === 'close' &&
                lastDisconnect?.error?.output?.statusCode !== 401
            ) {

                logger.warn(
                    'Connection closed. Retrying...'
                );

                await delay(10000);

                DILA_MD_PAIR_CODE(
                    id,
                    num,
                    res
                );
            }
        });

    } catch (error) {

        logger.error(
            `Error in DILA_MD_PAIR_CODE: ${error.message}`
        );

        removeFile(
            path.join(__dirname, 'temp', id)
        );

        if (!res.headersSent) {
            res.send({
                code: "❗ Service Unavailable"
            });
        }
    }
}

// ==========================================
// PAIRING ROUTE
// ==========================================

router.get('/', async (req, res) => {

    const id = makeid();
    const num = req.query.number;

    if (!num) {
        return res.status(400).send({
            error: 'Number is required'
        });
    }

    await DILA_MD_PAIR_CODE(
        id,
        num,
        res
    );
});

// ==========================================
// AUTO RESTART
// ==========================================

setInterval(() => {

    logger.info(
        '☘️ Restarting process...'
    );

    process.exit(0);

}, 1800000);

module.exports = router;
