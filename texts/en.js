const main = require('../main.js');

module.exports = {
    greeting: "<b>Hi, {{name}}!</b>\n\nChoose your language 👇",
    language: "Choose your language 👇",
    unsubscribed: '🚫 You have not subscribed to the channel!',
    subscribe: `To participate in AIRDROP, subscribe to ${main.name_crypto}: <b>@${main.channel_en}</b>`,
    thx_sub: 'Thanks for subscribing, {{name}} ❤️',
    menu: `<b>{{name}}, your balance: {{balance}} ${main.name_jetton}</b>\n\nInvite a fren and get ${main.price_for_fren} ${main.name_jetton}! 😱\n<b>These are the most favorable conditions for a massive AIRDROP!</b>\n\nSimple and easy! Each participant is guaranteed to receive their <b>DROP</b> in <b>${main.name_jetton}</b> 💎\nClick on the <b>'📃 Terms'</b> button to find out all the details!\n\n<b>Link to invite frens:</b> <code>{{link}}</code>`,
    invite_a_fren: `Invite a fren 👥`,
    claim_time: `⏰ Return in <b>{{time}} minutes</b> to receive <b>${main.name_jetton}</b>`,
    claim_reward: `💰 {{name}}, you received <b>${main.price_for_click} ${main.name_jetton}</b>`,
    terms: `<b>🔥 Each participant is guaranteed to receive $YOD tokens to their wallet!</b>\n\nTo take part , you just need to follow two simple steps:\n\n<b>1.</b> Subscribe to our channel: <b>@${main.channel_en}</b>\n<b>2.</b> Invite all your frens\n \n<b>And that's not all!</b> 😱 For every friend you invite, you will receive <b>${main.price_for_fren} ${main.name_jetton}</b> - this opportunity does not come along every day!\n\n<b>Start inviting frens now: <code>{{link}}</code></b>\n\nDon't miss your chance! Invite your frens and become part of something interesting! 🚀`,
    wallet: `We recommend using <b>Tonkeeper</b>/Tonhub/MyTonWallet\n\n<b>👛 Your current wallet:</b> <code>{{wallet}}</code>\n\nEnter your TON address:`,
    invalid_message: `<b>❌ Unknown command!</b>\n\nUse <b>/start</b> and keyboard buttons to interact with the bot.`,
    kb_menu: [
        [`💎 Claim ${main.name_jetton}`],
        ['📃 Terms', '👛 Wallet'],
        ['✍️ Tasks', '🥇 Rating']
    ],
};