var Command = require('../commandTemplate');
var Connection = require('../dbConnection');
var levels = require('../../consts/levels.json');
var paramtypes = require('../../consts/paramtypes.json');
var utils = require('../utils');
var dbUtils = require('../dbUtils');
var discordUtils = require('../discordUtils');
var commands = [];

var cmd;
////////////////////////////////////////////////////////////
cmd = new Command('set', 'Setup');
cmd.addHelp('Sets a parameter for the guild');
cmd.addUsage('<field> ["remove"] <value>');
cmd.minLvl = levels.ADMIN;
cmd.reqDB = true;
cmd.params.push(paramtypes.PARAM);
cmd.execution = function(client, msg, suffix) {

    var db = Connection.getDB();
    var collection = db.collection('guilds');
    var operation = {};

    //We check which operation the user is trying to execute
    var option = suffix[0].toLowerCase();
    switch (option) {
        case "role":
        case "roles":
            rolesOperation();
            break;
        case "limitedcolors":
            if (suffix.length > 1) {
                operation = {
                    $set: {
                        limitedcolors: (suffix[1] == true)
                    }
                }
                break;
            } else {
                utils.sendAndDelete(msg.channel, "Error, try again.");
                return;
            }
        case "topicchannel":
            if (msg.guild.channels.exists('id', suffix[1])) {
                operation = {
                    $set: {
                        topicchannel: suffix[1]
                    }
                }
                break;
            } else {
                utils.sendAndDelete(msg.channel, "Error, try again.");
                return;
            }
        default:
            utils.sendAndDelete(msg.channel, "You can't access that field!");
            return;
    }

    /*
     * This funciton tries to find the appropiate role and adds it / removes it
     * from the pool of roles available for the user
     */
    function rolesOperation() {
        var roleName;
        var remove = false;
        if (suffix.length > 2 && suffix[1].toLowerCase() == "remove") {
            roleName = suffix.splice(2, suffix.length).join(" ");
            remove = true;
        } else {
            roleName = suffix.splice(1, suffix.length).join(" ");
        }

        var role = discordUtils.getRole(msg.guild, roleName);

        if (!role) {
            utils.sendAndDelete(msg.channel, "No role found for " + roleName + "! Please try again.");
            return;
        }
        //If the user specified the removal of the role
        if (remove) {
            operation = {
                $pull: {
                    roles: role.id
                }
            }
        } else {
            operation = {
                $push: {
                    roles: role.id
                }
            }
        }
    }

    collection.findOneAndUpdate({
            _id: msg.guild.id
        }, operation, {
            returnOriginal: false,
            upsert: true
        },
        function(err, res) {
            if (err) return console.log(err);
            if (res.ok == 1) {
                utils.sendAndDelete(msg.channel, suffix[0] + " updated!", 10000);
            } else {
                console.log(res);
                utils.sendAndDelete(msg.channel, res)
            }
        }
    );
}
commands.push(cmd);
////////////////////////////////////////////////////////////
cmd = new Command('guild', 'Setup', 'dev');
cmd.alias.push('server');
cmd.addHelp('Prints the guild settings');
cmd.minLvl = levels.ADMIN;
cmd.reqDB = true;
cmd.execution = function(client, msg, suffix) {

    // @TODO Work on this formatting and stuff
    dbUtils.fetchGuild(msg.guild.id, function(err, guildData) {
        if (err) return utils.sendAndDelete(msg.channel, err);
        if (!guildData) return utils.sendAndDelete(msg.channel, "Guild has no settings!");

        var out = "";
        if (guildData.hasOwnProperty('roles')) {
            var roles = [];
            for (var roleID of guildData.roles) {
                var role = msg.guild.roles.find('id', roleID);
                if (role) {
                    roles.push(role);
                }
            }
            out += roles.join(", ");
            out += "\n";
        }
        if (guildData.hasOwnProperty('colors')) {
            if (guildData.colorRoles) {
                out += "Colors are limited";
            } else {
                out += "Colors are unlimited";
            }
            out += "\n";
        }

        msg.channel.sendCode('xl', out);

    });
}
commands.push(cmd);
////////////////////////////////////////////////////////////

module.exports = commands;
