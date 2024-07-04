
import {mmClient, wsClient} from "./mm-client";
import 'babel-polyfill'
import 'isomorphic-fetch'
import {WebSocketMessage} from "@mattermost/client";
import {JSONMessageData, MessageData} from "./types";

import {botLog, matterMostLog} from "./logging";

if (!global.FormData) {
    global.FormData = require('form-data')
}

async function onClientMessage(msg: WebSocketMessage<JSONMessageData>, meId: string) {
    botLog.log("onClientMessage", msg, meId);
    
    if (msg.event !== 'posted' || !meId) {
        matterMostLog.debug({msg: msg})
        return
    }

    const msgData = parseMessageData(msg.data)

    if (isMessageIgnored(msgData, meId)) {
        return
    }

    try {
        await mmClient.createPost({
            message: "Hi!",
            channel_id: msgData.post.channel_id,
            root_id: msgData.post.id,
        })
        botLog.log("DONE");
    } catch(e) {
        botLog.log("ERROR", e);
    }

    return;
}

/**
 * Checks if we are responsible to answer to this message.
 * We do only respond to messages which are posted in a thread or addressed to the bot. We also do not respond to
 * message which were posted by the bot.
 * @param msgData The parsed message data
 * @param meId The mattermost client id
 * @param previousPosts Older posts in the same channel
 */
function isMessageIgnored(msgData: MessageData, meId: string): boolean {
    // we are not in a thread and not mentioned
    botLog.log("is1", msgData.post.root_id === '' && !msgData.mentions.includes(meId))
    if (msgData.post.root_id === '' && !msgData.mentions.includes(meId)) {
        return true
    }

    // it is our own message
    botLog.log("is2", msgData.post.user_id === meId)
    if (msgData.post.user_id === meId) {
        return true
    }

    return false;
}

/**
 * Transforms a data object of a WebSocketMessage to a JS Object.
 * @param msg The WebSocketMessage data.
 */
function parseMessageData(msg: JSONMessageData): MessageData {
    return {
        mentions: JSON.parse(msg.mentions ?? '[]'),
        post: JSON.parse(msg.post),
        sender_name: msg.sender_name
    }
}


/* Entry point */
async function main(): Promise<void> {
    const meId = (await mmClient.getMe()).id

    botLog.log("Connected to Mattermost2.")

    wsClient.addMessageListener((e) => onClientMessage(e, meId))
    botLog.trace("Listening to MM messages...")
}

main().catch(reason => {
    botLog.error(reason);
    process.exit(-1)
})
