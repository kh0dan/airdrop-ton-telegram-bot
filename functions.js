const User = require('./models/user.models.js')
const Referal = require('./models/referal.models.js')
const Task = require('./models/task.models.js')
const Rating = require('./models/rating.models.js')

const axios = require('axios');
const main = require('./main.js');
const tasksJS = require('./tasks.js');

const en = require('./texts/en.js');
const ru = require('./texts/ru.js');

let { logs } = require('./index.js');

async function sendTrackerMessage(bot, message, error, from_id, from_username) {
    try {
        await bot.telegram.sendMessage(process.env.TRACKER, `<b>${from_id || '-'} # @${from_username || '-'}</b>\n\n${message}\n\n${error}`, {parse_mode: 'HTML', disable_web_page_preview: true});
    } catch (err) {
        console.error(err)
    }
}

async function getUserFromDatabase(user_id) {
    try {
        logs.log_sql++
        return User.findOne({ user_id: user_id });
    } catch (error) {
        console.error(error);
    }
};

async function addUserToDatabase(user) {
    try {
        logs.log_sql++
        logs.log_reg++
        const currentDate = Math.floor(Date.now() / 1000);

        const newUser = new User({ 
            user_id: user.id, 
            user_username: user.username || '',
            user_first: user.first_name, 
            user_date: currentDate })

        const savedUser = await newUser.save();
        return savedUser;
    } catch (error) {
        console.error(error);
    }
};

async function updateUserInDatabase(user_id, updateData) {
    try {
        logs.log_sql++
        const result = await User.updateOne(
            { user_id: user_id },
            { $set: updateData }
        );
    
        return result.nModified;
    } catch (error) {
        console.error(error);
    }
}

function msToNumber(seconds, type) {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if(type === 'min') return minutes;
    if(type === 'h') return hours;
    if(type === 'd' || !type) return days;
}

async function addUserToReferals(user_init, user_inv) {
    try {
        logs.log_sql++
        logs.log_ref++
        const currentDate = Math.floor(Date.now() / 1000);

        const newReferal = new Referal({ 
            user_initiator: user_init, 
            user_invited: user_inv,
            date: currentDate })

        const savedReferal = await newReferal.save();
        return savedReferal;
    } catch (error) {
        console.error(error);
    }
};

async function getUserFromReferals(user_id) {
    try {
        logs.log_sql++
        return Referal.findOne({ user_invited: user_id });
    } catch (error) {
        console.error(error);
    }
};

async function countUserReferals(user_init) {
    try {
        logs.log_sql++
        return Referal.countDocuments({ user_initiator: user_init });
    } catch (error) {
        console.error(error);
    }
}

async function updateReferalInDatabase(user_id, updateData) {
    try {
        logs.log_sql++
        const result = await Referal.updateOne(
            { user_invited: user_id },
            { $set: updateData }
        );
    
        return result.nModified;
    } catch (error) {
        console.error(error);
    }
}

async function getWalletFromDatabase(wallet) {
    try {
        logs.log_sql++
        return User.findOne({ user_wallet: wallet });
    } catch (error) {
        console.error(error);
    }
};

async function addTaskToDatabase(user_id, task_id, comment) {
    try {
        logs.log_sql++
        logs.log_tasks++
        const currentDate = Math.floor(Date.now() / 1000);

        const newTask = new Task({ 
            user_id: user_id, 
            task_id: task_id,
            date: currentDate,
            comment: comment })

        const savedTask = await newTask.save();
        return savedTask;
    } catch (error) {
        console.error(error);
    }
};

async function getTaskFromDatabase(user_id, task_id) {
    try {
        logs.log_sql++
        return Task.findOne({ user_id: user_id, task_id: task_id});
    } catch (error) {
        console.error(error);
    }
};

async function getTaskFromDatabaseByComment(task_id, comment) {
    try {
        logs.log_sql++
        return Task.findOne({ task_id: task_id, comment: comment});
    } catch (error) {
        console.error(error);
    }
};

async function checkTransactions(bot) {
    try {
        let successSend = 0;
        const taskId = 2;
        const response = await axios.get(`https://tonapi.io/v2/blockchain/accounts/${process.env.TON_WALLET}/transactions?limit=100`);
        const transactions = response.data.transactions;
        for (const transaction of transactions) {
            if (transaction.in_msg && transaction.in_msg.decoded_body && transaction.in_msg.decoded_body.text) {
                const userId = parseInt(transaction.in_msg.decoded_body.text.substring(1));
                const isTaskCompleted = await getTaskFromDatabase(userId, taskId);
                if (!isTaskCompleted) {
                    const user = await getUserFromDatabase(userId);
                    if(user) {
                        await addTaskToDatabase(userId, taskId);
                        const task = tasksJS.find(task => task.id === taskId);
                        await updateUserInDatabase(userId, {user_balance: user.user_balance + task.reward});
                        const messageString = user.user_lang === 'ru' ? `<b>${task.name_ru}</b>\n\n✅ Вы успешно выполнили задание и получили <b>${task.reward} ${main.name_jetton}</b>` : `<b>${task.name_en}</b>\n\n✅ You have successfully completed the task and received <b>${task.reward} ${main.name_jetton}</b>`;
                        try { await bot.telegram.sendMessage(userId, messageString, {parse_mode: "HTML"}); } catch (error) {}
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                        successSend++
                    }
                }
            }
        }

        if(successSend > 0) await sendTrackerMessage(bot, `Успешное подтверждение ${successSend} транзакций в блокчейне!`, ``, 0, ``)
    } catch (error) {
        console.error(error);
    }
};

async function checkNotcoinVouchers(bot, wallet) {
    try {
        await sendTrackerMessage(bot, `🔄 check notcoin voucher (${wallet})`, ``, 0, ``);
        const response = await axios.get(`https://tonapi.io/v2/accounts/${wallet}/nfts?collection=0%3Ae6923eb901bfe6d1a65a5bc2292b0e2462a220213c3f1d1b2d60491543a34860&limit=1000&offset=0&indirect_ownership=false`);
        if (response.data.nft_items && response.data.nft_items.length) {
            return true;
        } else return;
    } catch (error) {
        console.error(error);
    }
};

async function GetRatingUsers(bot) {
    try {
        const fridayStart = new Date();
        fridayStart.setUTCHours(17, 0, 0, 0); 
        fridayStart.setDate(fridayStart.getDate() - ((fridayStart.getDay() + 2) % 7)); 

        const fridayEnd = new Date(fridayStart);
        fridayEnd.setDate(fridayEnd.getDate() + 7); 

        const topInviters = await Referal.aggregate([
            {
                $match: {
                    date: { $gte: fridayStart.getTime() / 1000, $lt: fridayEnd.getTime() / 1000 },
                    active: 1
                }
            },
            {
                $sort: { date: 1 }
            },
            {
                $group: {
                    _id: "$user_initiator",
                    totalInvited: { $sum: 1 }
                }
            },
            {
                $sort: { totalInvited: -1 }
            },
            {
                $limit: 10
            }
        ]);            
        
        await sendTrackerMessage(bot, `Успешное получение рейтинга!`, topInviters, 0, ``)
        console.log(topInviters);
        await updateRating(bot, topInviters);
    } catch (error) {
        console.error(error);
    }
}

async function updateRating(bot, topInviters) {
    try {
        let ratings = await Rating.findOne(); 
        
        if (!ratings) {
            ratings = new Rating();
        }

        ratings.rankings = topInviters.map((inviter, index) => ({
            rank: index + 1,
            userId: inviter._id,
            totalRefs: inviter.totalInvited
        }));
        
        await ratings.save();
        await sendTrackerMessage(bot, `Успешное обновление рейтинга!`, ``, 0, ``)
    } catch (error) {
        console.error(error);
    }
}

async function generateRatingMessage(user) {
    try {
        const emojis_nums = ['🥇', '🥈', '🥉', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9️⃣', '🔟'];
        const rating = await Rating.findOne();
        if (!rating) {
            return ``;
        }

        const ratingMessage = await Promise.all(rating.rankings.map(async (rank, index) => {
            const userInit = await User.findOne({ user_id: rank.userId });
            if (!userInit) {
                console.error(`User with ID ${rank.userId} not found`);
                return null;
            }
            const placeEmoji = emojis_nums[index];
            const reward = main.rating_rewards[index];
            //const lang = user.user_lang === 'ru' ? 'реф.' : 'ref.';
            // return `${placeEmoji} ${userInit.user_first} | ${rank.totalRefs} ${lang} | <b>${reward} ${main.name_jetton}</b>`;
            return `${placeEmoji} ${userInit.user_first} | <b>${reward} ${main.name_jetton}</b>`;
        }));

        return ratingMessage.filter(message => message !== null).join('\n');
    } catch (error) {
        console.error(error);
    }
}

async function ResetRating(bot) {
    try {
        const ratings = await Rating.find();
        console.log(ratings);

        if (!ratings || ratings.length === 0) {
            return;
        }

        for (const rating of ratings) {
            if (!rating.rankings || rating.rankings.length === 0) {
                console.log(`No rankings found in document with ID: ${rating._id}`);
                continue;
            }

            for (const [index, rank] of rating.rankings.entries()) {
                const user = await User.findOne({ user_id: rank.userId });

                if (user) {
                    const reward = main.rating_rewards[index];
                    await sendTrackerMessage(bot, `@${user.user_username} получил ${reward} ${main.name_jetton} за ${index+1} место в рейтинге`, ``, 0, ``)
                    const messageString = user.user_lang === 'ru' ? `🏆 Вы получили <b>${reward} ${main.name_jetton}</b> за ${index+1} место в недельном рейтинге. Благодарим Вас за участие в конкурсе и желаем Вам удачи в продолжающейся битве!` : `🏆 You received <b>${reward} ${main.name_jetton}</b> for ${index+1} place in the weekly ranking. Thank you for participating in the competition and wish you good luck in the ongoing battle!`;
                    await updateUserInDatabase(user.user_id, {user_balance: user.user_balance + reward});
                    await bot.telegram.sendMessage(user.user_id, messageString, { parse_mode: "HTML" });
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }
        }

        await Rating.deleteMany({});
        await GetRatingUsers();
    } catch (error) {
        console.error(error);
    }
}

async function countUsersInDatabase() {
    try {
        return User.countDocuments();
    } catch (error) {
        console.error(error);
        return 0;
    }
}

async function getAllUserIds() {
    try {
        const users = await User.find({}).exec();
        const uniqueUserIds = [...new Set(users.map(user => user.user_id))];
        return uniqueUserIds;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function sendAllUsers(bot, ctx) {
    try {
        if(ctx.from.id !== 894923798) return;
        
        const users = await getAllUserIds(); 

        const packages = [];
        while (users.length > 0) {
            packages.push(users.splice(0, 30));
        }

        let successCount = 0;

        for (let i = 0; i < packages.length; i++) {
            const package = packages[i];
            for (let j = 0; j < package.length; j++) {
                const chatId = package[j];

                console.log(`Отправляю ${chatId}...`)
                const userMes = await getUserFromDatabase(chatId);
                const text = userMes.user_lang === 'ru' ? ru : en;
                const messageString = text.messaging;
                const buttonString = userMes.user_lang === 'ru' ? 'Пригласить друга 👥' : 'Invite fren 👥';
                
                try {
                    await bot.telegram.sendPhoto(chatId, main.picture_messaging, {caption: messageString, disable_web_page_preview: true, parse_mode: "HTML", reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${chatId}`}]]}});
                    //await bot.telegram.sendMessage(chatId, messageString, {parse_mode: "HTML", disable_web_page_preview: true, disable_notification: true, reply_markup: {inline_keyboard: [[{text: buttonString, url: `https://t.me/share/url?url=${process.env.BOT_LINK}start=r${chatId}`}]]}});
                    console.log(`Успешно ${chatId}`)
                    successCount++;
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                } catch (err) {
                    console.log(`Неудача ${chatId}`)
                    if (err.code === 429) {
                        await new Promise((resolve) => setTimeout(resolve, 10000));
                        j--;
                    }
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 15000));
        }        

        return sendTrackerMessage(bot, `Рассылка пользователям завершена, успешно отправлено ${successCount} сообщений.`, ``, 0, ``);
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    sendAllUsers,
    countUsersInDatabase,
    ResetRating,
    generateRatingMessage,
    GetRatingUsers,
    checkTransactions,
    getTaskFromDatabase,
    addTaskToDatabase,
    getWalletFromDatabase,
    countUserReferals,
    addUserToReferals,
    updateReferalInDatabase,
    getUserFromReferals,
    msToNumber,
    updateUserInDatabase,
    addUserToDatabase,
    getUserFromDatabase,
    sendTrackerMessage,
    checkNotcoinVouchers,
    getTaskFromDatabaseByComment
}