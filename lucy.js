// .env Variables
require('dotenv').config({path: './.env'});

// Node Modules
let discord = require('discord.js');
let client = new discord.Client();

// Bot Modules
let {sendPublicMessage, sendPrivateMessage, generateDialogFunction, isAdmin} = require("./utility.js");
let {debug, reshuffleDeck, shuffleDeck, drawFromDeck, showHand, playCard} = require("./card_utility.js");

//dialog system
let dialog = generateDialogFunction(require("./dialog.json"));

//ADAM dialog decorator
//NOTE: This isn't strictly necessary for the bots
dialog = function(baseDialog) {
	return function(key, ...data) {
		if (key === "help" && typeof(data[0]) !== "undefined") {
			//force the key and arg into camelCase
			let arg = data[0].toLowerCase();
			arg = arg.charAt(0).toUpperCase() + arg.substr(1);
			key += arg;
		}

		return baseDialog(key, ...data);
	}
}(dialog);

//handle errors
client.on('error', console.error);

// The ready event is vital, it means that your bot will only start reacting to information from discord _after_ ready is emitted
client.on('ready', async () => {
	// Generates invite link
	try {
		let link = await client.generateInvite(["SEND_MESSAGES"]);
		console.log("Invite Link: " + link);
	} catch(e) {
		console.log(e.stack || e);
	}

	// You can set status to 'online', 'invisible', 'away', or 'dnd' (do not disturb)
	client.user.setStatus('online');

	// Sets your "Playing"
	if (process.env.ACTIVITY) {
		client.user.setActivity(process.env.ACTIVITY, { type: process.env.TYPE })
			//DEBUGGING
			.then(presence => console.log("Activity set to " + (presence.game ? presence.game.name : 'none')) )
			.catch(console.error);
	}

	console.log("Logged in as: " + client.user.username + " - " + client.user.id);

	//initialize the deck
	reshuffleDeck();
});

// Create an event listener for messages
client.on('message', async message => {
	// Ignores ALL bot messages
	if (message.author.bot) {
		return;
	}

	// Has to be (prefix)command
	if (message.content.indexOf(process.env.PREFIX) !== 0) {
		return;
	}

	try {
		//admin commands
		if (isAdmin(message.member) && processAdminCommands(client, message)) {
			return;
		}

		//basic user commands
		if (processBasicCommands(client, message)) {
			return;
		}
	} catch(e) {
		console.log(e.stack || e);
	}
});

//Log our bot in
client.login(process.env.TOKEN);

function processBasicCommands(client, message) {
	// "This is the best way to define args. Trust me."
	// - Some tutorial dude on the internet
	let args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
	let command = args.shift().toLowerCase();

	switch (command) {
		case "help":
			sendPublicMessage(client, message.guild, message.author, message.channel, dialog(command, args[0]));
			return true;

		case "shuffleall":
			//shuffles everything into the active pile
			reshuffleDeck();
			sendPublicMessage(client, message.guild, message.author, message.channel, dialog(command));
			return true;

		case "shuffle":
			//shuffles the active pile
			shuffleDeck();
			sendPublicMessage(client, message.guild, message.author, message.channel, dialog(command));
			return true;

		case "draw":
			//read out the cards, moving everything but aces to the discard pile
			sendPublicMessage(client, message.guild, message.author, message.channel, drawFromDeck(message.author.username, args[0]));
			return true;

		case "show":
			//show cards in hand
			sendPublicMessage(client, message.guild, message.author, message.channel, showHand(message.author.username));
			return true;

		case "play":
			//plays X card from your hand by showing it then moving it to the active pile
			if (playCard(message.author.username, args[0])) {
				sendPublicMessage(client, message.guild, message.author, message.channel, dialog(command));
			} else {
				sendPublicMessage(client, message.guild, message.author, message.channel, dialog("fail"));
			}
			return true;


		default:
			sendPublicMessage(client, message.guild, message.author, message.channel, dialog(command));
			return true;
	}

	return false;
}

function processAdminCommands(client, message) {
	// "This is the best way to define args. Trust me."
	// - Some tutorial dude on the internet
	let args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
	let command = args.shift().toLowerCase();

	switch (command) {
		case "ping": //DEBUGGING
			sendPublicMessage(client, message.guild, message.author, message.channel, "PONG!");
			return true;

		case "debug":
			debug();
			return true;
	}

	return false;
}
