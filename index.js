const dotenv = require('dotenv');
dotenv.config();
const { Telegraf } = require('telegraf');
const rateLimit = require('telegraf-ratelimit');
const mongoose = require('mongoose');
const cron = require('node-cron');
const moment = require('moment');
require('moment/locale/ru')

const main = require('./main.js');
const en = require('./texts/en.js');
const ru = require('./texts/ru.js');
const tasksJS = require('./tasks.js');

const TaskNotcoinTimer = {};

let logs = {
    log_call: 0,
    log_reg: 0,
    log_ref: 0,
    log_tasks: 0,
    log_sql: 0
};

module.exports = {
    logs
};

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

cron.schedule('0 0 20 * * 5', async () => {
    try {
        functions.ResetRating(bot);
    } catch (error) {
        await functions.sendTrackerMessage(bot, `Cron schedule friday 17 UTC`, error, 0, '-');
        console.error(error);
    }
});

cron.schedule('0 0 15 * * *', async () => {
    try {
        await functions.GetRatingUsers(bot);
    } catch (error) {
        await functions.sendTrackerMessage(bot, `Cron schedule 15`, error, 0, '-');
        console.error(error);
    }
});

cron.schedule('0 */30 * * * *', async () => {
    try {
        const taskId = 2;
        const task = tasksJS.find(task => task.id === taskId);
        if(task.available === 0) return;

        functions.checkTransactions(bot);
    } catch (error) {
        await functions.sendTrackerMessage(bot, `Cron schedule */30`, error, 0, '-');
        console.error(error);
    }
});

cron.schedule('00 00 00 * * *', async () => {
    try {
        const currentDate = moment().subtract(1, 'day').format('D MMMM YYYY');
        const message_date = `<b>Ежедневная статистика с 00:00 по 23:59:59 ${currentDate}</b>`;

        const users = await functions.countUsersInDatabase();
        await functions.sendTrackerMessage(bot, `${message_date}\n\nЧисло юзеров: <code>${users}</code>\nВзаимодействий с ботом: <code>${logs.log_call}</code>\nЗарегистрировано пользователей: <code>${logs.log_reg}</code>\nНовых рефералов: <code>${logs.log_ref}</code>\nВыполнено заданий: <code>${logs.log_tasks}</code>\nОбращений в базу: <code>${logs.log_sql}</code>`, new Date().getTime(), 0, ``)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logs.log_call = 0; logs.log_ref = 0; logs.log_reg = 0; logs.log_sql = 0; logs.log_tasks = 0;
    } catch (error) {
        await functions.sendTrackerMessage(bot, `Cron schedule 00`, error, 0, '-');
        console.error(error);
    }
});

bot.start(async (ctx) => {
    try {
        if(ctx.chat.type !== 'private') return;
        logs.log_call++

        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) {
            if(user.user_state !== 'start') {
                await functions.sendTrackerMessage(bot, `send /start (${user.user_state})`, ``, ctx.from.id, ctx.from.username);
                const text = user.user_lang === 'ru' ? ru : en;
                const messageString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
                const menuButtons = text.kb_menu;
        
                return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: messageString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
            } else if(user.user_state === 'start') {
                await functions.sendTrackerMessage(bot, `send /start (${user.user_state}, нужно подтвердить подписку)`, ``, ctx.from.id, ctx.from.username);
                const channelId = user.user_lang === 'ru' ? process.env.CHANNEL_RU : process.env.CHANNEL_EN;
                const buttonString = user.user_lang === 'ru' ? '✅ Я подписан(а)' : '✅ Im subscribed';
                const text = user.user_lang === 'ru' ? ru : en;
                const messageString = text.subscribe;

                return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `checkSub-${channelId}`}]]}});
            }
        }

        if(ctx.payload && ctx.payload.startsWith(`r`)) {
            const initiator = ctx.payload.slice(1);
            await functions.addUserToReferals(initiator, ctx.from.id);
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

bot.command('info', async (ctx) => {
    try {
        if(ctx.from.id !== 894923798) return;

        const users = await functions.countUsersInDatabase();
        return ctx.replyWithHTML(`Статистика с 00:00 по сейчас:\n\nЧисло юзеров: <code>${users}</code>\nВзаимодействий с ботом: <code>${logs.log_call}</code>\nЗарегистрировано пользователей: <code>${logs.log_reg}</code>\nНовых рефералов: <code>${logs.log_ref}</code>\nВыполнено заданий: <code>${logs.log_tasks}</code>\nОбращений в базу: <code>${logs.log_sql}</code>`)
    } catch (error) {
        await functions.sendTrackerMessage(bot, bot.command, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.command('send_users', async (ctx) => {
    functions.sendAllUsers(bot, ctx);
});

bot.command('language', async (ctx) => {
    try {
        logs.log_call++
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user && user.user_state !== 'start') {
            const text = user.user_lang === 'ru' ? en : ru; 
            const messageString = text.language;
            return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: '🇬🇧 English', callback_data: `startBot-en`}], [{text: '🇷🇺 Русский', callback_data: 'startBot-ru'}]]}});
        }
    } catch (error) {
        await functions.sendTrackerMessage(bot, bot.command, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
})

bot.action('Balance', async (ctx) => {
    try {
        logs.log_call++
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(!user) return ctx.deleteMessage();

        try { await ctx.telegram.editMessageReplyMarkup(ctx.from.id, ctx.update.callback_query.message.message_id, null); } catch (error) {}

        const text = user.user_lang === 'ru' ? ru : en;
        const menuString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
        const menuButtons = text.kb_menu;

        return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: menuString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `startBot`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
})

bot.action(/^((startBot)-\S+)$/, async (ctx) => {
    try {
        logs.log_call++
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
        logs.log_call++
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(!user || user.user_state !== 'wallet') return ctx.deleteMessage();

        await ctx.deleteMessage();
        await functions.updateUserInDatabase(ctx.from.id, {user_state: 'active'});

        const text = user.user_lang === 'ru' ? ru : en;
        const menuString = text.menu.replace('{{name}}', ctx.from.first_name).replace('{{balance}}', user.user_balance).replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
        const menuButtons = text.kb_menu;

        return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: menuString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `CancelWallet`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.action(/^((Complete)-\d+)$/, async (ctx) => {
    try {
        logs.log_call++
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(!user) return ctx.deleteMessage();

        const callbackData = ctx.match[1];
        let taskId = parseInt(callbackData.split('-')[1]);

        const task = tasksJS.find(task => task.id === taskId);
        if(!task) return ctx.deleteMessage();

        const isComplete = await functions.getTaskFromDatabase(ctx.from.id, taskId);
        const alreadyCompletetring = user.user_lang === 'ru' ? `✅ Вы уже выполнили это задание.`: `✅ You have already completed this task.`
        if(isComplete) return ctx.answerCbQuery(alreadyCompletetring);

        if(task.available === 0) {
            await ctx.deleteMessage();
            const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nК сожалению, срок выполнения этого задания истёк.` : `<b>${task.name_en}</b>\n\nUnfortunately this task has expired.`;
            return ctx.replyWithHTML(messageString);
        }

        await ctx.deleteMessage();

        if(taskId === 1) {
            if(!ctx.from.is_premium) {
                const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nУ вас отсутствует Telegram Premium.` : `<b>${task.name_en}</b>\n\nYou don't have Telegram Premium.`;
                const buttonString = user.user_lang === 'ru' ? `🌟 Купить Telegram Premium` : `🌟 Buy Telegram Premium`;
                return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, url: main.buy_tg_premium}]]}});
            }

            await functions.addTaskToDatabase(ctx.from.id, taskId);
            await functions.updateUserInDatabase(ctx.from.id, {user_balance: user.user_balance + task.reward});
            await functions.sendTrackerMessage(bot, `✅ complete task (${task.name_en})`, ``, ctx.from.id, ctx.from.username);
            const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n✅ Вы успешно выполнили задание и получили <b>${task.reward} ${main.name_jetton}</b>` : `<b>${task.name_en}</b>\n\n✅ You have successfully completed the task and received <b>${task.reward} ${main.name_jetton}</b>`;
            return ctx.replyWithHTML(messageString);
        } else if(taskId === 2) {
            const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n🔄 Система автоматически проверит задание в течение часа и начислит Вам <b>${task.reward} ${main.name_jetton}</b>, если задание было выполнено.` : `<b>${task.name_en}</b>\n\n🔄 The system will automatically check the task within an hour and award you <b>${task.reward} ${main.name_jetton}</b> if the task was completed.`;
            return ctx.replyWithHTML(messageString);
        } else if(taskId === 3) {
            if(user.user_wallet === 'none') {
                const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nУ вас не подключен Кошелёк.` : `<b>${task.name_en}</b>\n\nYour Wallet is not connected.`;
                return ctx.replyWithHTML(messageString);
            }

            const isComplete = await functions.getTaskFromDatabaseByComment(taskId, user.user_wallet);
            if(isComplete) {
                const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nЗадание с этого кошелька уже было выполнено.` : `<b>${task.name_en}</b>\n\nThe task from this wallet has already been completed.`;
                return ctx.replyWithHTML(messageString);
            }

            if(TaskNotcoinTimer[ctx.from.id]) {
                const timerString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n⏰ Попробуйте повторить через минуту.`: `<b>${task.name_ru}</b>\n\n⏰ Try again in a minute.`
                return ctx.replyWithHTML(timerString);
            }

            const isVoucher = await functions.checkNotcoinVouchers(bot, user.user_wallet);
            if(!isVoucher) {
                TaskNotcoinTimer[ctx.from.id] = setTimeout(() => {
                    delete TaskNotcoinTimer[ctx.from.id];
                }, 30000);

                const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nУ вас отсутствует Notcoin Voucher.` : `<b>${task.name_en}</b>\n\nYou do not have a Notcoin Voucher.`;
                return ctx.replyWithHTML(messageString);
            }

            await functions.addTaskToDatabase(ctx.from.id, taskId, user.user_wallet);
            await functions.updateUserInDatabase(ctx.from.id, {user_balance: user.user_balance + task.reward});
            await functions.sendTrackerMessage(bot, `✅ complete task (${task.name_en})`, ``, ctx.from.id, ctx.from.username);
            const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n✅ Вы успешно выполнили задание и получили <b>${task.reward} ${main.name_jetton}</b>` : `<b>${task.name_en}</b>\n\n✅ You have successfully completed the task and received <b>${task.reward} ${main.name_jetton}</b>`;
            return ctx.replyWithHTML(messageString);
        }
    } catch (error) {
        await functions.sendTrackerMessage(bot, `Complete`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.action(/^((task)-\d+)$/, async (ctx) => {
    try {
        logs.log_call++
        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(!user) return ctx.deleteMessage();

        const callbackData = ctx.match[1];
        let taskId = parseInt(callbackData.split('-')[1]);

        const task = tasksJS.find(task => task.id === taskId);
        if(!task) return ctx.deleteMessage();

        const isComplete = await functions.getTaskFromDatabase(ctx.from.id, taskId);
        const alreadyCompletetring = user.user_lang === 'ru' ? `✅ Вы уже выполнили это задание.`: `✅ You have already completed this task.`
        if(isComplete) return ctx.answerCbQuery(alreadyCompletetring);

        if(task.available === 0) {
            await ctx.deleteMessage();
            const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\nК сожалению, срок выполнения этого задания истёк.` : `<b>${task.name_en}</b>\n\nUnfortunately this task has expired.`;
            return ctx.replyWithHTML(messageString);
        }

        await ctx.deleteMessage();

        const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n${task.description_ru}\n\n<b>💎 Награда: ${task.reward} ${main.name_jetton}</b> <i>(твой баланс: ${user.user_balance} ${main.name_jetton})</i>` : `<b>${task.name_en}</b>\n\n${task.description_en}\n\n<b>💎 Reward: ${task.reward} ${main.name_jetton}</b> <i>(your balance: ${user.user_balance} ${main.name_jetton})</i>`;
        
        const buttonString = user.user_lang === 'ru' ? `✅ Подтвердить выполнение`: `✅ Confirm completion`

        if(taskId === 1) {
            return ctx.replyWithHTML(messageString, {reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `Complete-${task.id}`}]]}});
        } else if(taskId === 2) {
            const transferString = user.user_lang === 'ru' ? `💎 Отправить транзакцию`: `💎 Submit transaction`
            return ctx.replyWithHTML(messageString, {disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: transferString, url: `${main.transfer}${ctx.from.id}`}], [{text: buttonString, callback_data: `Complete-${task.id}`}]]}});
        } else if(taskId === 3) {
            return ctx.replyWithHTML(messageString, {disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `Complete-${task.id}`}]]}});
        } 
    } catch (error) {
        await functions.sendTrackerMessage(bot, `task`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.action(/^((checkSub)-\S+)$/, async (ctx) => {
    try {
        logs.log_call++
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

        const referal = await functions.getUserFromReferals(ctx.from.id);
        if(referal) {
            await functions.updateReferalInDatabase(ctx.from.id, {active: 1});
            const userInit = await functions.getUserFromDatabase(referal.user_initiator);
            if(userInit) {
                const totalRef = await functions.countUserReferals(referal.user_initiator);
                await functions.updateUserInDatabase(referal.user_initiator, {user_balance: userInit.user_balance + main.price_for_fren});
                const textForInit = userInit.user_lang === 'ru' ? ru : en;
                const initString = textForInit.new_referal.replace('{{name}}', ctx.from.first_name).replace('{{referals}}', totalRef);
                try { await bot.telegram.sendMessage(referal.user_initiator, initString, {parse_mode: "HTML"}); } catch (error) {}
            }
        }

        return bot.telegram.sendPhoto(ctx.from.id, main.picture_menu, {caption: messageString, parse_mode: "HTML", reply_markup: {resize_keyboard: true, keyboard: menuButtons}});
    } catch (error) {
        await functions.sendTrackerMessage(bot, `checkSub`, error, ctx.from.id, ctx.from.username);
        console.error(error);
    }
});

bot.on('message', async (ctx) => {
    try {
        logs.log_call++
        if(ctx.chat.type !== 'private') return;

        const user = await functions.getUserFromDatabase(ctx.from.id);
        if(user) {
            const text = user.user_lang === 'ru' ? ru : en;

            if(user.user_state !== 'start') {
                if(user.user_state === 'wallet') {
                    const buttonString = user.user_lang === 'ru' ? '🚫 Отмена' : '🚫 Cancel';

                    if(ctx.message.text && ctx.message.text.length === 48) {
                        const isExistWallet = await functions.getWalletFromDatabase(ctx.message.text);
                        if(isExistWallet) {
                            const messageString = user.user_lang === 'ru' ? '❌ Введенный адрес TON кошелька уже зарегистрирован в боте.\n\n<b>Пожалуйста, введите свой адрес.</b>' : '❌ The entered TON wallet address is already registered in the bot.\n\n<b>Please enter your address.</b>';
                            return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `CancelWallet`}]]}})
                        }

                        await functions.updateUserInDatabase(ctx.from.id, {user_wallet: ctx.message.text, user_state: 'active'});
                        await ctx.deleteMessage();
                        const messageString = user.user_lang === 'ru' ? '✅ Вы успешно изменили адрес своего TON кошелька!' : '✅ You have successfully changed your TON wallet address!';
                        return ctx.replyWithHTML(messageString + `\n\n<code>${ctx.message.text}</code>`);
                    } else {
                        const messageString = user.user_lang === 'ru' ? '❌ Адрес TON кошелька должен состоять из 48-и символов.\n\n<b>Пожалуйста, введите корректный адрес.</b>' : '❌ The TON wallet address must consist of 48 characters.\n\n<b>Please enter a correct address.</b>';
                        return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `CancelWallet`}]]}})
                    }
                }

                const claimReward = ['💎 Получить $YOD', '💎 Claim $YOD'];
                const terms = ['📃 Условия', '📃 Terms'];
                const wallet = ['👛 Кошелёк', '👛 Wallet'];
                const tasks = ['✍️ Задания', '✍️ Tasks'];
                const rating = ['🥇 Рейтинг', '🥇 Rating']

                if(claimReward.includes(ctx.message.text)) {
                    let timer = 3600;
                    if(ctx.from.is_premium) timer = 2400;

                    const currentDate = Math.floor(Date.now() / 1000);
                    const reward_time = currentDate - user.user_timer;

                    const buttonString = user.user_lang === 'ru' ? '💎 Баланс' : '💎 Balance';

                    if(reward_time < timer) {
                        const remainingTime = functions.msToNumber(timer - reward_time, 'min');
                        const messageString = text.claim_time.replace('{{time}}', remainingTime);
                        return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `Balance`}]]}});
                    }

                    await functions.sendTrackerMessage(bot, `claim reward (${user.user_state})`, ``, ctx.from.id, ctx.from.username);

                    let rewardForClick = main.price_for_click;

                    let messageString = text.claim_reward.replace('{{name}}', ctx.from.first_name);
                    let buttons = [[{text: buttonString, callback_data: `Balance`}]]

                    const totalRef = await functions.countUserReferals(ctx.from.id);
                    if(!totalRef || totalRef < main.total_frens_for_x2) {
                        const frensToX2 = main.total_frens_for_x2 - totalRef || min.total_frens_for_x2;
                        const refString = user.user_lang === 'ru' ? `\n\n👥 Пригласи еще <b>${frensToX2} друзей</b>, чтобы получать в 2 раза больше <b>${main.name_jetton}</b>` : `\n\n👥 Invite <b>${frensToX2} more frens</b> to get 2 times more <b>${main.name_jetton}</b>`;
                        const buttonFrenString = user.user_lang === 'ru' ? 'Пригласить друга 👥' : 'Invite fren 👥';
                        messageString = messageString + refString;
                        buttons = [[{text: buttonString, callback_data: `Balance`}],
                        [{text: buttonFrenString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]
                    } else if(totalRef && totalRef >= main.total_frens_for_x2) {
                        rewardForClick = rewardForClick*2;
                    }

                    messageString = messageString.replace('{{reward}}', rewardForClick);

                    await functions.updateUserInDatabase(ctx.from.id, {user_balance: user.user_balance + rewardForClick, user_timer: currentDate});
                    return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, reply_markup: {inline_keyboard: buttons}})
                } else if(terms.includes(ctx.message.text)) {
                    const buttonString = user.user_lang === 'ru' ? 'Пригласить друга 👥' : 'Invite fren 👥';
                    const messageString = text.terms.replace('{{link}}', `${process.env.BOT_LINK}start=r${ctx.from.id}`);
                    
                    return bot.telegram.sendPhoto(ctx.from.id, main.picture_terms, {caption: messageString, reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
                } else if(wallet.includes(ctx.message.text)) {
                    const buttonString = user.user_lang === 'ru' ? '🚫 Отмена' : '🚫 Cancel';

                    let userWallet = user.user_wallet;
                    if(user.user_wallet === 'none') userWallet = '—'

                    await functions.updateUserInDatabase(ctx.from.id, {user_state: 'wallet'}); 

                    const messageString = text.wallet.replace('{{wallet}}', userWallet);
                    return ctx.replyWithHTML(messageString, {reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, reply_markup: {inline_keyboard: [[{text: buttonString, callback_data: `CancelWallet`}]]}})
                } else if(tasks.includes(ctx.message.text)) {
                    const availableTasks = tasksJS.filter(task => task.available === 1);

                    const taskButtons = availableTasks.map(task => [{
                        text: user.user_lang === 'ru' ? `${task.name_ru} | ${task.reward} ${main.name_jetton}` : `${task.name_en} | ${task.reward} ${main.name_jetton}`,
                        callback_data: `task-${task.id}`
                    }]);
                    
                    const messageString = text.tasks;
                    return bot.telegram.sendPhoto(ctx.from.id, main.picture_tasks, {caption: messageString, reply_to_message_id: ctx.message.message_id, disable_web_page_preview: true, parse_mode: "HTML", reply_markup: {inline_keyboard: taskButtons}});
                } else if(rating.includes(ctx.message.text)) {
                    const messageString = text.rating;
                    const buttonString = user.user_lang === 'ru' ? 'Пригласить друга 👥' : 'Invite fren 👥';

                    const usersRating = await functions.generateRatingMessage(user);
                    return ctx.replyWithHTML(messageString + usersRating, {reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${ctx.from.id}`}]]}});
                } else {
                    await ctx.deleteMessage();
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