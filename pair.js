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
    jidNormalizedUser
} = require('@whiskeysockets/baileys');


function removeFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, {
                recursive: true,
                force: true
            });
        }
    } catch (error) {
        console.log('❌ Remove temp error:', error.message);
    }
}


/*
|--------------------------------------------------------------------------
| SEND SESSION
|--------------------------------------------------------------------------
*/

async function sendSession(sock, sessionPath) {

    const credsFilePath = path.join(
        sessionPath,
        'creds.json'
    );

    console.log('🔎 Waiting for credentials...');

    /*
    | Wait up to 30 seconds for creds.json
    */

    for (let i = 0; i < 30; i++) {

        if (fs.existsSync(credsFilePath)) {
            break;
        }

        await delay(1000);
    }


    if (!fs.existsSync(credsFilePath)) {

        throw new Error(
            'creds.json was not created'
        );
    }


    console.log(
        '✅ creds.json found'
    );


    /*
    | Read credentials
    */

    const credsData = fs.readFileSync(
        credsFilePath,
        'utf8'
    );


    if (!credsData || credsData.length < 50) {

        throw new Error(
            'creds.json is empty or invalid'
        );
    }


    console.log(
        '📦 Credentials size:',
        credsData.length
    );


    /*
    | Generate Session ID
    */

    const base64Session =
        Buffer
            .from(credsData)
            .toString('base64');


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
        '📦 Length:',
        sessionId.length
    );
    console.log(
        '════════════════════════════════'
    );


    /*
    | Get own WhatsApp JID
    */

    const userJid = sock.user?.id
        ? jidNormalizedUser(sock.user.id)
        : null;


    if (!userJid) {

        throw new Error(
            'WhatsApp user JID not available'
        );
    }


    console.log(
        '📱 Sending Session to:',
        userJid
    );


    /*
    |--------------------------------------------------------------------------
    | MESSAGE 1 - SESSION ID
    |--------------------------------------------------------------------------
    */

    const sessionMessage =
        await sock.sendMessage(
            userJid,
            {
                text: sessionId
            }
        );


    console.log(
        '✅ SESSION ID SENT'
    );


    /*
    |--------------------------------------------------------------------------
    | MESSAGE 2 - SUCCESS MESSAGE
    |--------------------------------------------------------------------------
    */

    await delay(1500);


    const successMessage = `
╭━━━━━━━━━━━━━━━━━━━╮
┃   🔐 *DILA-MD SESSION*
╰━━━━━━━━━━━━━━━━━━━╯

╭───────────────●●►
│ ✅ *PAIRING SUCCESSFUL*
│
│ 🤖 *BOT:* DILA-MD
│ 👤 *OWNER:* THENULA
│
│ 🔑 *SESSION ID*
│ 📩 Session ID එක ඉහළින්
│    message එකේ තියෙනවා.
╰───────────────●●►

⚠️ *IMPORTANT*
• Session ID එක කාටවත් share කරන්න එපා.
• මේ Session ID එක bot එකට login
  කරන්න භාවිතා කරන්න.

╭───────────────●●►
│ 🚀 *CYBER THENUVA X MD*
│ ⚡ *POWERED BY THENULA*
╰───────────────●●►
`;


    await sock.sendMessage(
        userJid,
        {
            text: successMessage
        },
        {
            quoted: sessionMessage
        }
    );


    console.log(
        '✅ SUCCESS MESSAGE SENT'
    );


    /*
    | Give WhatsApp time to finish sending
    */

    await delay(3000);


    console.log(
        '🎉 SESSION DELIVERY COMPLETE'
    );


    return true;
}


/*
|--------------------------------------------------------------------------
| PAIR CODE FUNCTION
|--------------------------------------------------------------------------
*/

async function DILA_MD_PAIR_CODE(
    id,
    num,
    res
) {

    const sessionPath = path.join(
        __dirname,
        'temp',
        id
    );


    console.log('');
    console.log(
        '════════════════════════════════'
    );
    console.log(
        '🔧 DILA-MD PAIR START'
    );
    console.log(
        '🆔 ID:',
        id
    );
    console.log(
        '📱 Number:',
        num
    );
    console.log(
        '📁 Session:',
        sessionPath
    );
    console.log(
        '════════════════════════════════'
    );


    try {

        /*
        | Create auth state
        */

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            sessionPath
        );


        console.log(
            '✅ Auth state loaded'
        );


        /*
        | Get Baileys version
        */

        const {
            version
        } = await fetchLatestBaileysVersion();


        /*
        | Create socket
        */

        const sock = makeWASocket({

            auth: {
                creds: state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        logger
                    )
            },

            printQRInTerminal: false,

            generateHighQualityLinkPreview: true,

            logger,

            syncFullHistory: false,

            browser:
                Browsers.macOS('Safari'),

            version

        });


        console.log(
            '✅ WhatsApp socket created'
        );


        /*
        |--------------------------------------------------------------------------
        | SAVE CREDENTIALS
        |--------------------------------------------------------------------------
        */

        sock.ev.on(
            'creds.update',
            async () => {

                try {

                    await saveCreds();

                    console.log(
                        '💾 Credentials saved'
                    );

                } catch (error) {

                    console.log(
                        '❌ Save credentials error:',
                        error.message
                    );
                }
            }
        );


        /*
        |--------------------------------------------------------------------------
        | REQUEST PAIRING CODE
        |--------------------------------------------------------------------------
        */

        if (!state.creds.registered) {

            await delay(1500);


            const cleanNumber =
                String(num)
                    .replace(
                        /[^0-9]/g,
                        ''
                    );


            if (!cleanNumber) {

                throw new Error(
                    'Invalid phone number'
                );
            }


            console.log(
                '📱 Pairing number:',
                cleanNumber
            );


            const code =
                await sock.requestPairingCode(
                    cleanNumber
                );


            console.log(
                '🔑 PAIRING CODE:',
                code
            );


            /*
            | Send pairing code to website
            */

            if (!res.headersSent) {

                res.status(200).json({
                    code: code
                });
            }


            console.log(
                '✅ Pairing code sent to website'
            );

        } else {

            console.log(
                '⚠️ Credentials already registered'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | CONNECTION UPDATE
        |--------------------------------------------------------------------------
        */

        sock.ev.on(
            'connection.update',
            async (update) => {

                const {
                    connection,
                    lastDisconnect
                } = update;


                console.log(
                    '🔄 CONNECTION:',
                    connection
                );


                /*
                |--------------------------------------------------------------------------
                | CONNECTED
                |--------------------------------------------------------------------------
                */

                if (connection === 'open') {

                    console.log('');
                    console.log(
                        '🎉 WHATSAPP CONNECTED!'
                    );


                    try {

                        /*
                        | Wait for credential save
                        */

                        await delay(3000);


                        /*
                        | Send Session ID
                        */

                        await sendSession(
                            sock,
                            sessionPath
                        );


                        console.log(
                            '✅ SESSION DELIVERY SUCCESS'
                        );


                        /*
                        | Close only this socket
                        */

                        await delay(3000);


                        try {

                            sock.ws.close();

                        } catch (e) {

                            console.log(
                                '⚠️ Socket close:',
                                e.message
                            );
                        }


                        /*
                        | Remove temporary auth
                        */

                        await delay(1000);


                        removeFile(
                            sessionPath
                        );


                        console.log(
                            '🗑️ Temporary session removed'
                        );


                        console.log(
                            '🏁 PAIRING COMPLETE'
                        );


                    } catch (error) {

                        console.log('');
                        console.log(
                            '❌ SESSION SEND ERROR'
                        );
                        console.log(
                            error
                        );

                    }

                    return;
                }


                /*
                |--------------------------------------------------------------------------
                | CONNECTION CLOSED
                |--------------------------------------------------------------------------
                */

                if (connection === 'close') {

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;


                    console.log(
                        '❌ CONNECTION CLOSED:',
                        statusCode
                    );


                    /*
                    | 401 = logged out / invalid
                    */

                    if (
                        statusCode ===
                        DisconnectReason.loggedOut
                    ) {

                        console.log(
                            '🚫 WhatsApp logged out'
                        );

                        removeFile(
                            sessionPath
                        );

                        return;
                    }


                    /*
                    | Other disconnects
                    */

                    console.log(
                        '🔄 Connection closed before completion'
                    );
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


        removeFile(
            sessionPath
        );


        if (!res.headersSent) {

            res.status(500).json({
                error:
                    'Pairing service unavailable',
                message:
                    error.message
            });
        }
    }
}


/*
|--------------------------------------------------------------------------
| PAIRING ROUTE
|--------------------------------------------------------------------------
*/

router.get(
    '/',
    async (req, res) => {

        const id = makeid();

        const num =
            req.query.number;


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

            return res.status(400).json({
                error:
                    'Number is required'
            });
        }


        await DILA_MD_PAIR_CODE(
            id,
            num,
            res
        );
    }
);


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;
