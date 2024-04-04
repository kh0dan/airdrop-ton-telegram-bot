const main = require('../main.js');

module.exports = {
    greeting: "<b>Hi, {{name}}!</b>\n\nChoose your language 👇",
    unsubscribed: '🚫 You have not subscribed to the channel!',
    subscribe: `To participate in AIRDROP, subscribe to ${main.name_crypto}: <b>@${main.channel_en}</b>`,
    thx_sub: 'Thanks for subscribing, {{name}} ❤️',
    menu: `<b>{{name}}, your balance: {{balance}} ${main.name_jetton}</b>\n\nInvite a fren and get ${main.price_for_fren} ${main.name_jetton}! 😱\n<b>These are the most favorable conditions for a massive AIRDROP!</b>\n\nSimple and easy! Each participant is guaranteed to receive their <b>DROP</b> in <b>${main.name_jetton}</b> 💎\nClick on the <b>'Conditions'</b> button to find out all the details!`,
    invite_a_fren: `Invite a fren 👥`,
    kb_menu: [
        [`💎 Claim ${main.name_jetton}`],
        ['📃 Terms', '👛 Wallet'],
        ['✍️ Tasks', '🥇 Rating']
    ],
};