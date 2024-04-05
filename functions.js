const User = require('./models/user.models.js')
const Referal = require('./models/referal.models.js')

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

module.exports = {
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