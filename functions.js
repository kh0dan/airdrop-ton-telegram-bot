const User = require('./models/user.models.js')
const Referal = require('./models/referal.models.js')
const Task = require('./models/task.models.js')
const axios = require('axios');
const main = require('./main.js');
const tasksJS = require('./tasks.js');

async function sendTrackerMessage(bot, message, error, from_id, from_username) {
    try {
        await bot.telegram.sendMessage(process.env.TRACKER, `<b>${from_id || '-'} # @${from_username || '-'}</b>\n\n${message}\n\n${error}`, {parse_mode: 'HTML', disable_web_page_preview: true});
    } catch (err) {
        console.error(err)
    }
}

async function getUserFromDatabase(user_id) {
    try {
        return User.findOne({ user_id: user_id });
    } catch (error) {
        console.error(error);
    }
};

async function addUserToDatabase(user) {
    try {
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
        return Referal.findOne({ user_invited: user_id });
    } catch (error) {
        console.error(error);
    }
};

async function countUserReferals(user_init) {
    try {
        return Referal.countDocuments({ user_initiator: user_init });
    } catch (error) {
        console.error(error);
    }
}

async function updateReferalInDatabase(user_id, updateData) {
    try {
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
        return User.findOne({ user_wallet: wallet });
    } catch (error) {
        console.error(error);
    }
};

async function addTaskToDatabase(user_id, task_id) {
    try {
        const currentDate = Math.floor(Date.now() / 1000);

        const newTask = new Task({ 
            user_id: user_id, 
            task_id: task_id,
            date: currentDate })

        const savedTask = await newTask.save();
        return savedTask;
    } catch (error) {
        console.error(error);
    }
};

async function getTaskFromDatabase(user_id, task_id) {
    try {
        return Task.findOne({ user_id: user_id, task_id: task_id});
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
                        await bot.telegram.sendMessage(userId, messageString, {parse_mode: "HTML"});
                        await new Promise((resolve) => setTimeout(resolve, 10000));
                        successSend++
                    }
                }
            }
        }

        await sendTrackerMessage(bot, `Успешное подтверждение ${successSend} транзакций в блокчейне!`, ``, 0, ``)
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
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
    sendTrackerMessage
}