import { Client, Collection, Events, GatewayIntentBits, Message, Guild, TextChannel, User } from "discord.js";


export class TestClient extends Client {
    /** The default user to use (your userBot) */
    testUser: User;
    /** The default channel to test on */
    testChannel: TextChannel;
    /** The default guild to test on */
    testGuild: Guild;

    constructor(options) {
        super(options);
    }

    /**
     * @deprecated
     * @description For testing purposes: returns a Promise for a specific messageCreate or messageUpdate to be emitted.
     * Options have default values, and can be set to true to accept any value.
     * @example
     * // Embed Example: Two embeds with "hello" and "bye" as descriptions
     * embeds: [
     *  {"data": {"description":"hello"}},
     *  {"data": {"description":"bye"}}
     * ]
     * 
     * // Buttons Example: One action row with 2 buttons label "Start" and "End", and customId "start-button"
     * components: [{ components: 
     *   [{data: { label: "Start", customId: "start-button"}},
     *   {data: { label: "End"}}]
     *  }]
     * 
     * @see {@link https://discord.js.org/docs/packages/discord.js/14.15.3/Message:Class} for the structure of embeds and components
     * @default "" | options.content
     * [] | options.embeds
     * [] | options.components
     * this.user.id | options.userId
     * 5000 | options.timeLimit
     * this.testChannel.id | options.channelId
     * @returns {Promise<Message | Error>} either the found message or the array of messages checked.
     */
    async waitForMessage({
        content = "",
        embeds = [],
        components = [],
        userId = this.testUser?.id,
        timeLimit = 5000,
        channelId = this.testChannel?.id
    }: {
        content?: string | true,
        embeds?: object[] | true,
        components?: object[] | true,
        userId?: string | true,
        timeLimit?: number,
        channelId?: string | true
    } = {}): Promise<Message | Error> {
        let client = this;
        
        return new Promise((resolve, reject) => {
            let checkedMessages = []

            const timeout = setTimeout(() => {
                client.off(Events.MessageCreate,createdFunc);
                client.off(Events.MessageUpdate,updateFunc);
                console.dir(checkedMessages, {depth: null})
                reject(new Error(`Message was not found within the timeLimit ${JSON.stringify({ content, embeds, components, userId, timeLimit, channelId }, null, 2)}`));
            }, timeLimit);
    
            /**
             * 
             * @param {Message} message 
             */
            let createdFunc = (message: Message) => {
                checkedMessages.push(message);
                if ((userId === true || message.author.id == userId) && 
                    (content === true || message.content == content) &&
                    (channelId === true || message.channel.id == channelId) &&
                    (embeds === true || matchesSimplifiedProperties(message.embeds,embeds)) && 
                    (components === true || matchesSimplifiedProperties(message.components,components))
                ) {
                    client.off(Events.MessageCreate,createdFunc);
                    client.off(Events.MessageUpdate,updateFunc);
                    clearTimeout(timeout);
                    resolve(message);
                }
            }

            let updateFunc = (oldMessage, newMessage) => {createdFunc(newMessage)}
            client.on(Events.MessageCreate, createdFunc);
            client.on(Events.MessageUpdate, updateFunc);
        });
    }

    /**
     * General purpose function that returns a promise that waits for a certain event & properties to be emitted in the client.
     * @example
     * waitForEvent(Events.GuildCreate, (g) => {g}, {"name": "MatthewTest"}, 5000)
     * //waits for the bot to be added to a guild in the next 5 seconds
     * @param {Events} event the type of Client Event to wait for
     * @param {Function} function the function to apply to the event (for example, MessageUpdate should only grab newMessage)
     * @param {Object} object the simplified object to compare with the actual object. An empty object accepts any object.
     * @param {Number} timeLimit the amount of milliseconds to wait for
     * @param {Boolean} strictArrays whether arrays should have the same length (see matchesSimplifiedProperties)
     * @returns {Promise<Object|Error>} returns a Promise that either resolves the found object or rejects an Error.
     */
    async waitForEvent(event,func,mockObject,timeLimit,strictArrays=false) {
        //needed because 'this' in the promise is a different scope
        let client = this;
        let checkedObjects = []
        Error.captureStackTrace(checkedObjects);
        
        return await new Promise((resolve, reject) => {
            
    
            /**
             * 
             * @param {Message} message 
             */
            let checker = (...args) => {
                let object = func(...args)

                
                
                let result = matchesSimplifiedProperties(object,mockObject,strictArrays)
                if (result === true) {
                    client.off(event,checker);
                    clearTimeout(timeout)
                    resolve(object);
                } else {
                    checkedObjects.push({"result": result, "object": object});
                }
            }

            const timeout = setTimeout(() => {
                client.off(event,checker);
                const error = new Error(`Matching event was not found within the timeLimit for ${JSON.stringify(mockObject, null, 2)}.\n\n checkedObjects:\n${JSON.stringify(checkedObjects, null, 2)}\n\nAt ${checkedObjects.stack}. `);
                reject(error);
            }, timeLimit);

            client.on(event, checker);
        });
    }

    /**
     * @deprecated
     * Waits for the next message in the testChannel. 
     * This should be used in tests, where you are testing for a specific interaction and assume everything else works.
     * @returns {Message}
     */
    async waitForNextMessage() {
        return this.waitForMessage({content: true, embeds: true, components: true, userId: true})
    }

    /**
     * Takes in a mock of a message, then applies changes based on input
     * If mockMessage === true instead of an object, allow any message to be sent (with default author, guild and channel)
     * Else if base == true, set content, embeds, components, author, guild, channel to default values if not set.
     * Else no changes made
     * @param {Object} mockMessage
     * @param {Boolean} base
     * @returns {Object}
     */
    editMockMessage(mockMessage,base) {
        const DEFAULTS = {
            "content": "",
            "components": [],
            "embeds": [],
            "author": {id: this.user.id},
            "guildId": this.testGuild.id,
            "channelId": this.testChannel.id
        }
        if (mockMessage === true) { 
            mockMessage = {author: DEFAULTS["author"], guildId: DEFAULTS["guildId"], channelId: DEFAULTS["channelId"]}
        }
        else if (base) {
            
            for (var key in DEFAULTS) {
                if (! mockMessage[key]) {
                    mockMessage[key] = DEFAULTS[key]
                }
            }
        }
        return mockMessage
    }
    /** @returns {Promise<Message>} */
    async waitForMessageCreate(mockObject={},base=false,timeLimit=5000) {
        return this.waitForEvent(Events.MessageCreate,(m) => m, this.editMockMessage(mockObject,base), timeLimit);
    }
    /** @returns {Promise<Message>} */
    async waitForMessageUpdate(mockObject={},base=false,timeLimit=5000) {
        return this.waitForEvent(Events.MessageUpdate,(oM,nM) => nM, this.editMockMessage(mockObject,base), timeLimit)
    }
    /** @returns {Promise<Message>} */
    async waitForMessageDelete(mockObject={},base=false,timeLimit=5000) {
        return this.waitForEvent(Events.MessageDelete,(m) => m, this.editMockMessage(mockObject,base), timeLimit)
    }
    /** @returns {Promise<[MessageReaction, User]>} */
    async waitForReactionAdd(mockObject,base=false,timeLimit=5000) {
        return this.waitForEvent(Events.MessageReactionAdd,(r,u) => [r,u], mockObject, timeLimit);
    }
    /**
     * 
     * @param {Object} mockObject 
     * @param {Boolean} base 
     * @param {Number} timeLimit 
     * @returns {Promise<[MessageReaction, User]>}
     */
    async waitForReactionRemove(mockObject={},base=false,timeLimit=5000) {
        return this.waitForEvent(Events.MessageReactionRemove,(r,u) => [r,u], mockObject, timeLimit);
    }

}

/**
 * Compares a real value to a simplified version (ex. for embeds or components), and functions.
 * Returns true if all properties in the simplified version match the real value.
 * Otherwise, returns a helpful error string.
 * @param {any} real The actual object to be compared.
 * @param {any} mock The simplified mock object containing expected properties, which can also include predicates (functions).
 * @param {boolean} [strictLength=false] - If true, arrays / maps require the same length; otherwise, extra elements are allowed.
 * @param {boolean} [first=true] - Internal use to manage the formatting of the returned error string. This parameter should not be manually set in regular use.
 * @returns {string | true} returns true if all properties match, an error string specifying the first mismatch or missing property if the comparison fails.
 * 
 * Behaviour (tests can be found in {@link file://./matthewClient.test.js}):
 * 
 * Properties in the mock object can be predicates (functions).
 * The function is executed with the corresponding property in the real object.
 * If it returns false, the check fails.
 * 
* @example
 * // Example 1: Object comparison
 * const mock = { test: {} };
 * matchesSimplifiedProperties({ test: {} }, mock); // PASS
 * matchesSimplifiedProperties({ test: { key: "value" } }, mock); // PASS
 * matchesSimplifiedProperties({ test: "string" }, mock); // FAIL - "test has type String instead of Object"
 * 
 * @example
 * // Example 2: Array comparison
 * const mock = { list: ["item"] };
 * matchesSimplifiedProperties({ list: ["item"] }, mock); // PASS
 * matchesSimplifiedProperties({ list: ["item", "extra"] }, mock); // PASS
 * matchesSimplifiedProperties({ list: [] }, mock); // FAIL - "[0] does not exist in real"
 * 
 * @example
 * // Example 3: Function as a predicate
 * const mock = { value: n => n > 6 };
 * matchesSimplifiedProperties({ value: 7 }, mock); // PASS
 * matchesSimplifiedProperties({ value: 5 }, mock); // FAIL - "function (n => n > 6) returned false for 5"
 * 
 * @example
 * // Example 4: Map comparison
 * const mock = new Map([["key", "value"]]);
 * matchesSimplifiedProperties(new Map([["key", "value"]]), mock); // PASS
 * matchesSimplifiedProperties(new Map([["key", "different"]]), mock); // FAIL - "key different: real: different, mock: value"
 * 
 * @todo add map / collection functionality? It is already object, but could add strict mode for length.
 * @todo 
 */
export function matchesSimplifiedProperties(real,mock,strictLength=false,first=true) {
        if (mock === undefined) {return true};
        if (real === undefined) {return `${first ? "" : " "}does not exist in real`};
        if (mock instanceof Array || mock instanceof Map || mock instanceof Object && ! (mock instanceof Function)) {
            if (! (real instanceof mock.constructor)) {
                return `${first ? "" : " "}has type ${real.constructor.name} instead of ${mock.constructor.name}`
            }
        }
        if (mock instanceof Array) {
            if (strictLength && real.length != mock.length) {
                return `${first ? "" : " "}has size ${real.length} instead of ${mock.length}. Turn strictLength off to allow different lengths.`
            }
            for (let index in mock) {
                let result = matchesSimplifiedProperties(real[index],mock[index],strictLength,false)
                if (result !== true) {
                    return `[${index}]${result}`
                }
            }
        }
        else if (mock instanceof Map) {
            if (strictLength && real.size != mock.size) {
                return `${first ? "" : " "}has size ${real.size} instead of ${mock.size}. Turn strictLength off to allow different lengths.`
            }
            for (let key of mock) {
                let result = matchesSimplifiedProperties(real.get(key[0]),mock.get(key[0]),strictLength,false)
                if (result !== true) {
                    return `${first ? "" : "."}${key[0]}${result}`
                }
            }
        }
        else if (mock instanceof Function) {
            if (mock(real) === false) {
                return `${first ? "" : " "}function (${mock.toString()}) returned false for ${JSON.stringify(real)}`
            }
        }
        else if (typeof mock == "object") {
            for (let key in mock) {
                let result = this.matchesSimplifiedProperties(real[key],mock[key],strictLength,false)
                if (result !== true) {
                    return `${first ? "" : "."}${key}${result}`
                }
            }
        } else {
            if (real != mock) {
                return `${first ? "" : " "}different: real: ${real}, mock: ${mock}`;
            }
        }
        return true;
    }

module.exports = TestClient
