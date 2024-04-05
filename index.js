const dotenv = require('dotenv');
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
    {command: '/start', description: '💎 Info'},
    {command: '/language', description: '🔄 Change language'}
])

bot.start(async (ctx) => {
    try {
        if(ctx.chat.type !== 'private') return;

        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) {
            if(user.user_state !== 'start') {
                await functions.sendTrackerMessage(bot, `send /start (${user.user_state})`, ``, ctx.from.id, ctx.from.username);
                const text = user.user_lang === 'ru' ? ru : en;
                const messageString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
                const menuButtons = text.kb_menu;
        
                return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: messageString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
                //return ctx.replywithpho(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
            } else if(user.user_state === 'start') {
                await functions.sendTrackerMessage(bot, `send /start (${user.user_state}, нужно подтвердить подписку)`, ``, ctx.from.id, ctx.from.username);
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
        await functions.sendTrackerMessage(bot, `first time send /start`, ``, ctx.from.id, ctx.from.username);
    } catch (error) {
        await functions.sendTrackerMessage(bot, `start`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
})

bot.command('language', async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user && user.user_state !== 'start') {
            const text = user.user_lang === 'ru' ? en : ru; // en и ru наоборот
            const messageString = text.language;
            return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: '🇬🇧 English', callback_data: `startBot-en`}], [{text: '🇷🇺 Русский', callback_data: 'startBot-ru'}]]}});
        }
    } catch (error) {
        await functions.sendTrackerMessage(bot, bot.command, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
})

bot.action(/^((startBot)-\S+)$/, async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        const callbackData = ctx.match[1];
        const lang = callbackData.split('-')[1];

        if(user) {
            if(lang === user.user_lang) return ctx.deleteMessage();
            await functions.updateUserInDatabase(ctx.from.id, {user_lang: lang});
            await ctx.deleteMessage();

            const messageString = lang === 'ru' ? '✅ Вы успешно изменили язык!' : '✅ You have successfully changed the language!';
            await ctx.replyWithHTML(messageString);
            await ctx.replyWithChatAction('typing');
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const text = lang === 'ru' ? ru : en;
            const menuString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
            const menuButtons = text.kb_menu;
    
            return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: menuString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
        }
        
        await functions.addUserToDatabase(ctx.from);
        await functions.updateUserInDatabase(ctx.from.id, {user_lang: lang});

        await ctx.deleteMessage();

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

bot.action('CancelWallet', async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(!user || user.user_state !== 'wallet') return ctx.deleteMessage();

        await ctx.deleteMessage();
        await functions.updateUserInDatabase(ctx.from.id, {user_state: 'active'});

        await ctx.replyWithChatAction('typing');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const text = user.user_lang === 'ru' ? ru : en;
        const menuString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
        const menuButtons = text.kb_menu;

        return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: menuString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `CancelWallet`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.action(/^((checkSub)-\S+)$/, async (ctx) => {
    try {
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user.user_state !== 'start') return ctx.deleteMessage();

        const text = user.user_lang === 'ru' ? ru : en;

        const callbackData = ctx.match[1];
        let channelId = callbackData.split('-')[2];
        channelId = -parseInt(channelId);

        const chatMember = await bot.telegram.getChatMember(channelId, ctx.from.id)
        if (!chatMember || chatMember.status === 'left' || chatMember.status === 'kicked') {
            const cbString = text.unsubscribed;

            return ctx.answerCbQuery(cbString);
        }

        await functions.updateUserInDatabase(ctx.from.id, {user_state: 'active'});

        await ctx.deleteMessage();

        const messageString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
        const menuButtons = text.kb_menu;

        return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: messageString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
        //return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: messageString, parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}})
        //return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `checkSub`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.on('message', async (ctx) => {
    try {
        if(ctx.chat.type !== 'private') return;

        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) {
            const text = user.user_lang === 'ru' ? ru : en;

            if(user.user_state !== 'start') {
                if(user.user_state === 'wallet') {
                    if(ctx.message.text && ctx.message.text.length === 48) {
                        await functions.updateUserInDatabase(ctx.from.id, {user_wallet: ctx.message.text, user_state: 'active'});
                        await ctx.deleteMessage();
                        const messageString = user.user_lang === 'ru' ? '✅ Вы успешно изменили адрес своего TON кошелька!' : '✅ You have successfully changed your TON wallet address!';
                        return ctx.replyWithHTML(messageString + `\n\n<code>${ctx.message.text}</code>`);
                    } else {
                        const buttonString = user.user_lang === 'ru' ? '🚫 Отмена' : '🚫 Cancel';

                        let userWallet = user.user_wallet;
                        if(user.user_wallet === 'none') userWallet = '—'

                        await functions.updateUserInDatabase(ctx.from.id, {user_state: 'wallet'}); 

                        const messageString = user.user_lang === 'ru' ? '❌ Адрес TON кошелька должен состоять из 48-и символов.\n\n<b>Пожалуйста, введите корректный адрес.</b>' : '❌ The TON wallet address must consist of 48 characters.\n\n<b>Please enter a correct address.</b>';
                        return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `CancelWallet`}]]}})
                    }
                }

                const claimReward = ['💎 Получить $YOD', '💎 Claim $YOD'];
                const terms = ['📃 Условия', '📃 Terms'];
                const wallet = ['👛 Кошелёк', '👛 Wallet'];

                if(claimReward.includes(ctx.message.text)) {
                    let timer = 3600;
                    if(ctx.from.is_premium) timer = 2400;

                    const currentDate = Math.floor(Date.now() / 1000);
                    const reward_time = currentDate - user.user_timer;

                    if(reward_time < timer) {
                        const remainingTime = functions.msToNumber(timer - reward_time, 'min');
                        const messageString = text.claim_time.replace('{{time}}', remainingTime);
                        return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id});
                    }

                    const messageString = text.claim_reward.replace('{{name}}', ctx.from.first_name);
                    await functions.updateUserInDatabase(ctx.from.id, {user_balance: user.user_balance + main.price_for_click, user_timer: currentDate});
                    return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id})
                } else if(terms.includes(ctx.message.text)) {
                    const buttonString = user.user_lang === 'ru' ? 'Пригласить друга 👥' : 'Invite fren 👥';
                    const messageString = text.terms.replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
                    return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}})
                } else if(wallet.includes(ctx.message.text)) {
                    const buttonString = user.user_lang === 'ru' ? '🚫 Отмена' : '🚫 Cancel';

                    let userWallet = user.user_wallet;
                    if(user.user_wallet === 'none') userWallet = '—'

                    await functions.updateUserInDatabase(ctx.from.id, {user_state: 'wallet'}); 

                    const messageString = text.wallet.replace('{{wallet}}', userWallet);
                    return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `CancelWallet`}]]}})
                } else {
                    const messageString = text.invalid_message;
                    return ctx.replyWithHTML(messageString);
                }
            }
        }
    } catch (error) {
        await functions.sendTrackerMessage(bot, `message`, error, ctx.from.id, ctx.from.username);
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