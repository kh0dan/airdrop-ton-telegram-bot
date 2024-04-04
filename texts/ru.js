const main = require('../main.js');

module.exports = {
    greeting: `<b>Привет, {{name}}!</b>\n\nДля начала, выбери свой язык 👇`,
    subscribe: `Чтобы участвовать в AIRDROP, подпишитесь на ${main.name_crypto}: <b>@${main.channel_ru}</b>`,
    unsubscribed: '🚫 Вы не подписались на канал!',
    thx_sub: 'Спасибо за подписку, {{name}} ❤️',
    menu: `<b>{{name}}, твой баланс: {{balance}} ${main.name_jetton}</b>\n\nПригласи друга и получи ${main.price_for_fren} ${main.name_jetton}! 😱\n<b>Это самые выгодные условия для массового AIRDROP!</b>\n\nПросто и легко! Каждый участник гарантированно получит свой <b>DROP</b> в <b>${main.name_jetton}</b> 💎\nНажми на кнопку <b>'Условия'</b>, чтобы узнать все подробности!`,
    invite_a_fren: `Пригласить друга 👥`
};