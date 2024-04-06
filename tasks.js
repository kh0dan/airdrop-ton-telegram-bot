const main = require('./main.js');

const tasks = [
    {
        id: 1,
        name_ru: "⭐️ Иметь Telegram Premium",
        name_en: "⭐️ Have Telegram Premium",
        description_ru: "Для выполнения этого задания, на вашем телеграм аккаунте должна быть активна подписка Telegram Premium.",
        description_en: "To complete this task you must have an active Telegram Premium subscription on your Telegram account.",
        reward: 5000,
        available: 1
    },
    {
        id: 2,
        name_ru: "🔥👛 Подтвердить кошелёк",
        name_en: "🔥👛 Confirm wallet",
        description_ru: `Вам нужно отправить $0,02, чтобы подтвердить свой кошелёк.\n<i>Вся собранная сумма будет направлена в ликвидность жетона.</i>\n\n<a href="https://telegra.ph/YOD-DROP-04-06"><b>Отправить вручную</b></a>`,
        description_en: `You need to send $0.02 to verify your wallet.\n<i>The entire collected amount will be used for token liquidity.</i>\n\n<a href="https://telegra.ph/YOD-DROP-04-06"><b>Send manually</b></a>`,
        reward: main.price_for_transaction,
        available: 1
    }
];

module.exports = tasks;
