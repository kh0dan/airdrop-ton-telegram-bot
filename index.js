const dotenv = require('dotenv'); // пенис
dotenv.config();
const { Telegraf } = require('telegraf');
const rateLimit = require('telegraf-ratelimit');
const mongoose = require('mongoose');
const cron = require('node-cron');

const main = require('./main.js');
const en = require('./texts/en.js');
const ru = require('./texts/ru.js');

const bot = new Telegraf(process.env.BOT_TOKEN);

const functions = require('./functions.js');

const limitConfig = {
    window: 6000, 
    limit: 50
};

mongoose.connect(process.env.MONGODB_URI);

bot.telegram.setMyCommands([
    {command: '/start', description: '💎 Информация'}
])

bot.start(async (ctx) => {
    try {
        if(ctx.chat.type !== 'private') return;

        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) {
            if(user.user_state !== 'start') {
                await ctx.deleteMessage();

                const text = user.user_lang === 'ru' ? ru : en;
                const messageString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance);
                const buttonString = text.invite_a_fren;

                return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
            } else if(user.user_state === 'start') {
                await ctx.deleteMessage();

                const channelId = user.user_lang === 'ru' ? process.env.CHANNEL_RU : process.env.CHANNEL_EN;
                const buttonString = user.user_lang === 'ru' ? '✅ Я подписан(а)' : '✅ Im subscribed';
                const text = user.user_lang === 'ru' ? ru : en;
                const messageString = text.subscribe;

                return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `checkSub-${channelId}`}]]}});
            }
        }

        let messageString = en.greeting.replace('{{name}}', ctx.from.first_name);

        const ruLanguages = ['ru', 'be', 'uk', 'sr'];
        if (ruLanguages.includes(ctx.from.language_code)) {
            messageString = ru.greeting.replace('{{name}}', ctx.from.first_name);
        }

        await ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: '🇬🇧 English', callback_data: `startBot-en`}], [{text: '🇷🇺 Русский', callback_data: 'startBot-ru'}]]}});
        await functions.sendTrackerMessage(bot, `запустил бота`, ``, ctx.from.id, ctx.from.username);
    } catch (error) {
        await functions.sendTrackerMessage(bot, `start`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
})

bot.action(/^((startBot)-\S+)$/, async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) return ctx.deleteMessage();

        const callbackData = ctx.match[1];
        const lang = callbackData.split('-')[1];
        
        await functions.addUserToDatabase(ctx.from);
        await functions.updateUserInDatabase(ctx.from.id, {user_lang: lang});

        await ctx.deleteMessage();
        await ctx.replyWithChatAction('typing');

        const channelId = lang === 'ru' ? process.env.CHANNEL_RU : process.env.CHANNEL_EN;
        const buttonString = lang === 'ru' ? '✅ Я подписан(а)' : '✅ Im subscribed';
        const text = lang === 'ru' ? ru : en;
        const messageString = text.subscribe;

        return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `checkSub-${channelId}`}]]}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `startBot`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.action(/^((checkSub)-\S+)$/, async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user.user_state !== 'start') return ctx.deleteMessage();

        const callbackData = ctx.match[1];
        let channelId = callbackData.split('-')[2];
        channelId = -parseInt(channelId);

        const chatMember = await bot.telegram.getChatMember(channelId, ctx.from.id)
        if (!chatMember || chatMember.status === 'left' || chatMember.status === 'kicked') {
            const text = user.user_lang === 'ru' ? ru : en;
            const cbString = text.unsubscribed;

            return ctx.answerCbQuery(cbString);
        }

        await functions.updateUserInDatabase(ctx.from.id, {user_state: 'active'});

        await ctx.deleteMessage();
        await ctx.replyWithChatAction('typing');

        const text = user.user_lang === 'ru' ? ru : en;
        const messageString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance);
        const buttonString = text.invite_a_fren;

        await new Promise((resolve) => setTimeout(resolve, 1100));

        return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `checkSub`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.use(rateLimit(limitConfig));

bot.catch(async (error) => { 
    await functions.sendTrackerMessage(bot, `catchError`, error, 0, 0)
    console.error(error);
})

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));