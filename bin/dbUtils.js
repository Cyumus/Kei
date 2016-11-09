var Connection = require('./dbConnection');
var utils = require('./utils');
var levels = require('../consts/levels.json');
var owners = require('../config.json').owners;

/*
Checks the roles of the user to find a match with the roles stored in the db
and returns true if the user is allowed to execute the command.
*/
exports.getLevel = function(guild, member, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('roles');

    if (guild == null) return callback(null, levels.MASTER);

    if (owners.includes(member.user.id)) {
        return callback(null, levels.MASTER);
    }

    if(member.user.id == guild.ownerID){
        return callback(null, levels.OWNER);
    }

    collection.find({
        'guild_id': guild.id
    }, function(err, cur) {
        if (err) return callback(err);

        //We convert to array so we can iterate easily over it
        cur.sort({
            'level': -1
        }).toArray().then((arr) => {
            //If the guild has no level for the given member
            if (arr.length == 0) return callback(null, levels.DEFAULT);
            for (var el of arr) {
                if (member.roles.exists('id', el._id)) {
                    return callback(null, el.level);
                }
            }
            return callback(null, levels.DEFAULT);
        }).catch(console.log);
    });
}

exports.insertLog = function(user_id, moderator_id, type, reason, time, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var elementToInsert = {
        user_id: user_id,
        timestamp: Date.now(),
        type: type,
        moderator_id: moderator_id,
        reason: reason
    };
    if (time > 0) {
        elementToInsert.time = time;
    }

    var collection = db.collection('warnings');

    collection.insertOne(elementToInsert, (err, r) => {
        if (err) return callback(err);
        return callback(null);
    });

}

exports.insertTimer = function(timestamp, time, user_id, role_id, guild_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var elementToInsert = {
        timestamp: Date.now(),
        time: time,
        user_id: user_id,
        role_id: role_id,
        guild_id: guild_id
    };
    if (time > 0) {
        elementToInsert.time = time;
    }

    var collection = db.collection('timers');

    collection.insertOne(elementToInsert, (err, r) => {
        if (err) return callback(err);
        return callback(null);
    });

}

exports.removeTimer = function(user_id, role_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('timers');

    collection.deleteOne({
        user_id: user_id,
        role_id: role_id
    }, function(err, res) {
        return callback(err, res);
    });
}

exports.tagMessageAs = function(message_id, edited, edit) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('logs');

    var operation = {};
    if (edited) {
        operation = {
            $set: {
                edited: true
            },
            $push: {
                edits: edit
            }
        }
    } else {
        operation = {
            $set: {
                deleted: true
            }
        }
    }

    collection.findOneAndUpdate({
        _id: message_id
    }, operation, function(err, res) {
        if (err) return console.log(err);
    });
}

exports.storeMessage = function(msg) {


    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('logs');
    var guild = null;
    if (msg.guild) {
        guild = msg.guild.id;
    }
    var toInsert = {
        _id: msg.id,
        author_id: msg.author.id,
        channel_id: msg.channel.id,
        guild_id: guild,
        timestamp: msg.createdAt,
        content: msg.content,
        edited: false,
        deleted: false,
        attachments: msg.attachments.array().length
    }

    collection.insertOne(toInsert).catch((e) => {
        //Ignore error on add
    });
}

exports.storeNameChange = function(user_id, oldName, newName, isNick, guild_id) {
    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('lognames');

    var toInsert = {
        user_id: user_id,
        oldName: oldName,
        newName: newName,
        isNick: isNick
    }
    if (isNick) toInsert.guild_id = guild_id;

    collection.insertOne(toInsert);
}

exports.fetchLogs = function(channel_id, guild_id, amount, retrieveTime, callback) {

    var search = {
        guild_id: guild_id,
        channel_id: channel_id
    }

    if (retrieveTime) {
        var time = new Date((new Date()).getTime() - amount)
        //time
        search['timestamp'] = {
            '$gte': time
        };
    } else {
        //amount of msg
    }

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('logs');

    collection.find(search, function(err, cur) {
        if (err) return callback(err, null);

        if (retrieveTime) {
            cur.sort({
                timestamp: -1
            }).toArray().then(arr => {
                return callback(null, arr.reverse());
            }).catch(console.log);
        } else {
            cur.sort({
                timestamp: -1
            }).limit(parseInt(amount, 10)).toArray().then(arr => {
                return callback(null, arr.reverse());
            }).catch(console.log);
        }
    });
}

exports.fetchChannel = function(channel_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('channels');

    collection.findOne({
        _id: channel_id
    }, function(err, res) {
        callback(err, res);
    });
}

exports.fetchGuild = function(guild_id, callback) {

    var db = Connection.getDB();
    if (!db) return callback("Not connected to DB!");

    var collection = db.collection('guilds');

    collection.findOne({
        _id: guild_id
    }, function(err, res) {
        callback(err, res);
    });
}
