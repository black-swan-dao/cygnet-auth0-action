/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
    const sanity = require('@sanity/client')
    const slug = require('slug')
    const { Client, Intents } = require('discord.js');
    const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS], fetchAllMembers: true });

    const DISCORD_PREFIX = "oauth2|discord|"
    const DISCORD_KEY = "xxx"
    const SANITY_TOKEN = "xxx"
    const SANITY_ID = "xxx"
    const STRIPPED_USER_ID = event.user.user_id.replace(DISCORD_PREFIX, '')

    const sanityClient = sanity({
        projectId: SANITY_ID,
        dataset: 'production',
        token: SANITY_TOKEN
    })

    const writeToDatabase = async (roles) => {
        const currentDoc = await sanityClient.fetch("*[_type == 'user' && _id == $userId][0]", { userId: STRIPPED_USER_ID + '-' + instance._id })
        const doc = {
            _type: 'user',
            _id: STRIPPED_USER_ID + '-' + instance._id,
            name: event.user.name,
            avatarURL: event.user.picture,
            instance: {
                _type: 'reference',
                _ref: instance._id
            },
            roles: roles,
            email: event.user.email,
            ethAddress: currentDoc && currentDoc.ethAddress ? currentDoc.ethAddress : '',
            slug: {
                _type: 'slug',
                current: slug(event.user.name)
            }
        }
        sanityClient.createOrReplace(doc)
    }

    const deny = msg => {
        api.access.deny(msg)
    }

    await client.login(DISCORD_KEY);

    const instance = await sanityClient.fetch('*[_type == "instance" && auth0ClientId == $clientId][0]', { clientId: event.client.client_id })

    // Get all guilds the bot is in
    const selectedGuild = await client.guilds.fetch(instance.discordGuildId)
    if (!selectedGuild) {
        deny('The Cygnet bot has not been added to the Discord server.');
    }
    const members = await selectedGuild.members.fetch()

    const memberIdList = members.map(m => m.user.id)

    // Deny access if not a member
    if (!memberIdList.includes(STRIPPED_USER_ID)) {
        deny('You need to be a member of the Discord to login.');
    } else {
        // Get user
        let memberObject = members.find(m => m.user.id == STRIPPED_USER_ID)
        // Get roles
        let roles = await selectedGuild.roles.fetch()
        // Check roles
        let assignedRoles = []
        memberObject._roles.forEach(aR => {
            let tempRole = roles.find(r => {
                if (r.id == aR) {
                    return r
                }
            })
            if (tempRole) {
                assignedRoles.push(tempRole.name)
            }
        })
        writeToDatabase(assignedRoles)
    }
};

/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
  // exports.onContinuePostLogin = async (event, api) => {
  // };
