import {Events, GatewayIntentBits, Client} from "discord.js"
import { TestClient } from "./testClient"
import dotenv from "dotenv";

const client = new TestClient({intents: [GatewayIntentBits.Guilds, 
                GatewayIntentBits.MessageContent, 
                GatewayIntentBits.GuildMessages, 
                GatewayIntentBits.GuildMessageReactions, 
                GatewayIntentBits.DirectMessages, 
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.GuildMembers]})
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

dotenv.config();

const token = process.env.TOKEN;
if (!token) {
    throw new Error("TOKEN not found in .env file");
}
client.login(token);