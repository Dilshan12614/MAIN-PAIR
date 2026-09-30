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

    const sessionPath = path.join(__dirname, 'temp', id);

    console.log('');
    console.log('════════════════════════════════');
    console.log('🔧 DILA-MD PAIR DEBUG START');
    console.log('🆔 Pair ID:', id);
    console.log('📱 Number:', num);
    console.log('📁 Session Path:', sessionPath);
    console.log('════════════════════════════════');

    const { state, saveCreds } =
        await useMultiFileAuthState(sessionPath);

    console.log('✅ Auth state loaded');

    const { version } = await fetchLatestBaileysVersion();

    try {

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    logger
                ),
            },
            printQRInTerminal: false,
            generateHighQualityLinkPreview: true,
            logger: logger,
            syncFullHistory: false,
            browser: Browsers.macOS('Safari'),
            version,
        });

        console.log('✅ WhatsApp socket created');

        if (!sock.authState.creds.registered) {

            console.log('⏳ Requesting pairing code...');

            await delay(1500);

            num = num.replace(/[^0-9]/g, '');

            console.log('📱 Pairing number:', num);

            const code = await sock.requestPairingCode(num);

            console.log('🔑 PAIRING CODE:', code);

            if (!res.headersSent) {
                res.send({
                    code: code
                });
            }

            console.log('✅ Pairing code sent to website');
        } else {

            console.log('⚠️ Credentials already registered');
        }

        sock.ev.on('creds.update', async (creds) => {

            console.log('💾 CREDS UPDATE RECEIVED');

            try {
                await saveCreds();

                console.log('✅ Credentials saved');

                console.log(
                    '📁 Session directory:',
                    sessionPath
                );

                if (fs.existsSync(sessionPath)) {

                    const files = fs.readdirSync(sessionPath);

                    console.log(
                        '📂 Session files:',
                        files
                    );

                } else {

                    console.log(
                        '❌ Session directory does NOT exist'
                    );
                }

            } catch (err) {

                console.log(
                    '❌ SAVE CREDS ERROR:',
                    err.message
                );
            }
        });

        sock.ev.on(
            'connection.update',
            async (update) => {

                const {
                    connection,
                    lastDisconnect
                } = update;

                console.log('');
                console.log(
                    '🔄 CONNECTION UPDATE:',
                    connection
                );

                if (connection === 'open') {

                    console.log('');
                    console.log(
                        '════════════════════════════════'
                    );
                    console.log(
                        '🎉 WHATSAPP CONNECTED SUCCESSFULLY'
                    );
                    console.log(
                        '════════════════════════════════'
                    );

                    await delay(5000);

                    const credsFilePath =
                        path.join(
                            sessionPath,
                            'creds.json'
                        );

                    console.log(
                        '📄 Checking creds.json...'
                    );

                    console.log(
                        '📍 Path:',
                        credsFilePath
                    );

                    const exists =
                        fs.existsSync(credsFilePath);

                    console.log(
                        '📌 CREDS.JSON EXISTS:',
                        exists
                    );

                    if (!exists) {

                        console.log(
                            '❌ creds.json NOT FOUND!'
                        );

                        console.log(
                            '📂 Current session folder:'
                        );

                        try {

                            const files =
                                fs.readdirSync(
                                    sessionPath
                                );

                            console.log(files);

                        } catch (err) {

                            console.log(
                                '❌ Cannot read session folder:',
                                err.message
                            );
                        }

                        return;
                    }

                    try {

                        console.log(
                            '📖 Reading creds.json...'
                        );

                        const credsData =
                            fs.readFileSync(
                                credsFilePath,
                                'utf-8'
                            );

                        console.log(
                            '✅ creds.json read successfully'
                        );

                        console.log(
                            '📦 Creds size:',
                            credsData.length,
                            'characters'
                        );

                        const base64Session =
                            Buffer
                                .from(credsData)
                                .toString('base64');

                        console.log(
                            '✅ Base64 session generated'
                        );

                        console.log(
                            '📦 Base64 size:',
                            base64Session.length,
                            'characters'
                        );

                        const sessionId =
                            'DILA-MD=' + base64Session;

                        console.log('');
                        console.log(
                            '════════════════════════════════'
                        );
                        console.log(
                            '🔐 SESSION ID GENERATED'
                        );
                        console.log(
                            '════════════════════════════════'
                        );

                        console.log(
                            'PREFIX: DILA-MD='
                        );

                        console.log(
                            'SESSION LENGTH:',
                            sessionId.length
                        );

                        console.log(
                            '════════════════════════════════'
                        );

                        // Send Session ID
                        console.log(
                            '📤 Sending Session ID to WhatsApp...'
                        );

                        const codeMessage =
                            await sock.sendMessage(
                                sock.user.id,
                                {
                                    text: sessionId
                                }
                            );

                        console.log(
                            '✅ SESSION ID SENT SUCCESSFULLY'
                        );

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
╰━━━━━━━━━━━━━━━━━━━━━━╯

⚡ *Powered by THENULA*
`;

                        await sock.sendMessage(
                            sock.user.id,
                            {
                                text: cap
                            },
                            {
                                quoted: codeMessage
                            }
                        );

                        console.log(
                            '✅ Confirmation message sent'
                        );

                        try {
                            await sock.ws.close();
                        } catch (e) {}

                        removeFile(sessionPath);

                        console.log(
                            '🗑️ Temporary session removed'
                        );

                        logger.info(
                            `👤 ${sock.user.id} CONNECTED ✅`
                        );

                        console.log(
                            '🏁 DILA-MD PAIR COMPLETE'
                        );

                        process.exit(0);

                    } catch (error) {

                        console.log('');
                        console.log(
                            '❌ SESSION GENERATION ERROR'
                        );

                        console.log(
                            error
                        );

                        logger.error(
                            error.message
                        );
                    }

                } else if (
                    connection === 'close'
                ) {

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    console.log('');
                    console.log(
                        '❌ CONNECTION CLOSED'
                    );

                    console.log(
                        '📌 Status Code:',
                        statusCode
                    );

                    if (
                        statusCode !== 401
                    ) {

                        console.log(
                            '⏳ Retrying in 10 seconds...'
                        );

                        await delay(10000);

                        DILA_MD_PAIR_CODE(
                            id,
                            num,
                            res
                        );
                    } else {

                        console.log(
                            '🚫 Logged out / Unauthorized'
                        );
                    }
                }
            }
        );

    } catch (error) {

        console.log('');
        console.log(
            '❌ PAIR FUNCTION ERROR'
        );

        console.log(
            error
        );

        logger.error(
            `Error in DILA_MD_PAIR_CODE: ${error.message}`
        );

        removeFile(sessionPath);

        if (!res.headersSent) {

            res.send({
                code: '❗ Service Unavailable'
            });
        }
    }
}

router.get('/', async (req, res) => {

    const id = makeid();
    const num = req.query.number;

    console.log('');
    console.log(
        '🌐 NEW PAIR REQUEST'
    );

    console.log(
        '🆔 ID:',
        id
    );

    console.log(
        '📱 Number:',
        num
    );

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

setInterval(() => {

    logger.info(
        '☘️ Restarting process...'
    );

    process.exit(0);

}, 1800000);

module.exports = router;
