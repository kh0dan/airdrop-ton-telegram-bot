const main = require('./main.js');

const tasks = [
    {
        id: 1,
        name_ru: "⭐️ Telegram Premium",
        name_en: "⭐️ Telegram Premium",
        description_ru: "Для выполнения этого задания, на вашем телеграм аккаунте должна быть активна подписка Telegram Premium.",
        description_en: "To complete this task you must have an active Telegram Premium subscription on your Telegram account.",
        reward: 5000,
        available: 1
    },
    {
        id: 2,
        name_ru: "🔥👛 Кошелёк",
        name_en: "🔥👛 Wallet",
        description_ru: `Вам нужно отправить $0,02, чтобы подтвердить свой кошелёк.\n<i>Вся собранная сумма будет направлена в ликвидность ${main.name_jetton}.</i>\n\n<a href="https://telegra.ph/YOD-DROP-04-06"><b>Отправить вручную</b></a>`,
        description_en: `You need to send $0.02 to verify your wallet.\n<i>The entire collected amount will be used for ${main.name_jetton} liquidity.</i>\n\n<a href="https://telegra.ph/YOD-DROP-04-06"><b>Send manually</b></a>`,
        reward: main.price_for_transaction,
        available: 0
    },
    {
        id: 3,
        name_ru: "💛 Notcoin",
        name_en: "💛 Notcoin",
        description_ru: `Вам нужно иметь ваучер Notcoin на подключенном к боту кошельке.`,
        description_en: `You need to have a Notcoin voucher on the wallet connected to the bot.`,
        reward: 22222,
        available: 1
    }
];

module.exports = tasks;
