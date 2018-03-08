'use strict';
const Alexa = require('alexa-sdk');
const https = require("https");
const list_is_empty = "#list_is_empty#";

const api_url = 'api.amazonalexa.com';
const api_port = '443';

const APP_ID = 'amzn1.ask.skill.6afdb0f6-5d54-418a-81b1-7e4a0df32060';

// Microsoft Graph JavaScript SDK
//var MicrosoftGraph = require("msgraph-sdk-javascript");

// Graph client
var client = {};

// Adding logging levels
// error -  Other runtime errors or unexpected conditions. 
// warn -   'Almost' errors, other runtime situations that are undesirable 
//          or unexpected, but not necessarily "wrong".
// info -   Interesting runtime events (startup/shutdown/Intents). 
// debug -  Detailed information on the flow through the system. 
var logLevels = {error: 3, warn: 2, info: 1, debug: 0};

const languageStrings = {
    'de': {
        translation: {
            SKILL_NAME: 'Wunder Todo',
            WELCOME_MESSAGE: 'Willkommen bei Wunder Todo! ...Wie kann ich dir helfen?',
            HELP_MESSAGE: 'Du kannst sagen, „Schreibe Brot auf Einkaufsliste“ ...Wie kann ich dir helfen, Uschi?',
            HELP_REPROMPT: 'Wie kann ich dir helfen, Uschi?',
            STOP_MESSAGE: 'Auf Wiedersehen!',
        },
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    
    // Validate Alexa list API access token
    var alexaToken = event.context.System.apiAccessToken;
    if (alexaToken) {
        console.log("Alexa API Auth Token: " + alexaToken, logLevels.debug);
    }
    else {
        console.log("Alexa list permissions are not defined!");
    }
    
    // Validate Microsoft Graph API access token
    var msToken = event.session.user.accessToken;
    if (msToken) {
        console.log("Microsoft Graph API Auth Token: " + msToken, logLevels.debug);

        // Initialize the Microsoft Graph client
        //client = MicrosoftGraph.Client.init({
        //    authProvider: (done) => {
        //        done(null, token);
        //    }
        //});
        
        // Handle the intent
    }
    else {
        console.log("Microsoft Graph permissions are not defined!");
    }
    
    alexa.execute();
};

/**
 * This is the handler for item created on household list
 */
const itemCreatedHandler = function() {
    console.log("Starting itemCreatedHandler");
    var alexaToken = this.event.context.System.apiAccessToken;
    getTopToDoItem(alexaToken, item =>
    {
        this.emit(':tell', item);
    });
    //TODO: Figure out the item and forward to MS-ToDo
    this.emit(':tell', 'Alexa Element wurde erzeugt! Es folgt weiterleitung an Wunderlist.');
    console.log("Ending itemCreatedHandler");
};

/**
 * This is the handler for the Unhandled event.
 */
const addToIntentHandler = function() {
    console.log("Starting addToIntentHandler");
    var alexaToken = this.event.context.System.apiAccessToken;
    getTopToDoItem(alexaToken, item =>
    {
        this.emit(':tell', item);
    });
    this.emit(':tell', 'An dieser stelle würdest du etwas hinzufügen');
    console.log("Ending addToIntentHandler");
};

/**
 * Called when the session starts.
 */
const newSessionRequestHandler = function() {
    console.log("Starting newSessionRequestHandler");
    if (this.event.request.type === "IntentRequest") {
        this.emit(this.event.request.intent.name);
    }
    else {
        this.emit(LAUNCH_REQUEST);
    }
    console.log("Ending newSessionRequestHandler");
};

/**
 * Handler for the launch request event.
 */
const launchRequestHandler = function() {
    console.log("Starting launchRequestHandler");
    
    var alexaToken = this.event.context.System.apiAccessToken;
    getTopToDoItem(alexaToken, item =>
    {
        this.emit(':tell', item);
    });
    
    //this.emit(':ask', this.t('WELCOME_MESSAGE'));
    console.log("Ending launchRequestHandler");
};

/**
 * This is the handler for the SessionEnded event.
 */
const sessionEndedRequestHandler = function() {
    console.log("Starting sessionEndedRequestHandler");
    this.emit(':tell', this.t('STOP_MESSAGE'));
    console.log("Ending sessionEndedRequestHandler");
};

/**
 * This is the handler for the Unhandled event.
 */
const unhandledRequestHandler = function() {
    console.log("Starting unhandledRequestHandler");
    var speechOutput = "Denk nach! Denk nach! Diese Anfrage kann ich leider nicht bearbeiten.";
    this.emit(':tell', speechOutput);
    console.log("Ending unhandledRequestHandler");
};

/**
 * This is the handler for the Amazon help built in intent.
 */
const amazonHelpHandler = function() {
    console.log("Starting amazonHelpHandler");
    const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    console.log("Ending amazonHelpHandler");
};

/**
 * This is the handler for the Amazon cancel built-in intent.
 */
const amazonCancelHandler = function() {
    console.log("Starting amazonCancelHandler");
    this.emit(':tell', this.t('STOP_MESSAGE'));
    console.log("Ending amazonCancelHandler");
};

/**
 * This is the handler for the Amazon stop built in intent.
 */
const amazonStopHandler = function() {
    console.log("Starting amazonStopHandler");
    this.emit(':tell', this.t('STOP_MESSAGE'));
    console.log("Ending amazonStopHandler");
};

// --------------- Helper List API functions -----------------------

function getListsMetadata(token, callback) {
    const lms = new Alexa.services.ListManagementService();
    lms.getListsMetadata(token)
    .then((data) => {
        console.log('List retrieved: ' + JSON.stringify(data));
        callback(data);
        this.context.succeed();
    })
    .catch((error) => {
        console.log(error.message);
    });
};

/**
 * List API to retrieve the List of Lists : Lists Metadata.
 */
const getListsMetadataOld = function(token, callback) {
    console.log("Starting the get list metadata call.");
    var options = {
        host: api_url,
        port: api_port,
        path: '/v2/householdlists/',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    }

    var req = https.request(options, (res) => {
        console.log('STATUS: ', res.statusCode);
        console.log('HEADERS: ', JSON.stringify(res.headers));

        if(res.statusCode === 403) {
            console.log("permissions are not granted");
            callback(null);
            return;
        }
        
        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            callback(body);
        });

        res.on('error', (e) => {
            console.log(`Problem with request: ${e.message}`);
        });
    }).end();
};

/**
 * List API to retrieve the customer to-do list.
 */
const getToDoList = function(token, callback) {
    console.log("Starting get todo list call.");

    getListsMetadata(token, function(returnValue) {
        var obj = JSON.parse(returnValue);
        var todo_path = "";
        for (var i=0; i < obj.lists.length; i++) {
        if (obj.lists[i].name === "Alexa shopping list") {
	    //if (obj.lists[i].name === "Alexa to-do list") {
                for (var j=0; j < obj.lists[i].statusMap.length; j++) {
                    if (obj.lists[i].statusMap[j].status === "active") {
                        todo_path = obj.lists[i].statusMap[j].href;
                        break;
		            }
	        	}
                break;
	        }
	    }

        var options = {
           host: api_url,
           port: api_port,
           path: todo_path,
           method: 'GET',
           headers: {
               'Authorization': 'Bearer ' + token,
               'Content-Type': 'application/json'
            }
        };

        var req = https.request(options, (res) => {
            console.log('STATUS: ', res.statusCode);
            console.log('HEADERS: ', JSON.stringify(res.headers));
    
            if(res.statusCode === 403) {
               console.log("permissions are not granted");
               callback(null);
               return;
            }
    
            var body = [];
            res.on('data', function(chunk) {
                body.push(chunk);
            }).on('end', function() {
                body = Buffer.concat(body).toString();
                callback(JSON.parse(body));
            });
    
            res.on('error', (e) => {
                console.log(`Problem with request: ${e.message}`);
            });
        }).end();
    });
};

/**
 * Helper function to retrieve the top to-do item.
 */
const getTopToDoItem = function(token, callback) {
    getToDoList(token, function(returnValue) {
        if(!returnValue) {
           callback(null);
        }
        else if(!returnValue.items || returnValue.items.length === 0) {
           callback(list_is_empty);
        }
        else {
           callback(returnValue.items[0].value);
        }
    });
};

/**
 * List API to delete the top todo item.
 */
const clearTopToDoAction = function(token, callback) {
    getToDoList(token, function(returnValue) {
        if(!returnValue) {
	    callback(null);
	    return;
	}
	else if(!returnValue.items || returnValue.items.length === 0) {
	    callback(list_is_empty);
	    return;
	}

	var path = "/v2/householdlists/_listId_/items/_itemId_";
	path = path.replace("_listId_", returnValue.listId);
	path = path.replace("_itemId_", returnValue.items[0].id);

	var options = {
	    host: api_url,
	    port: api_port,
	    path: path,
	    method: 'DELETE',
	    headers: {
		'Authorization': 'Bearer ' + token,
		'Content-Type': 'application/json'
	    }
	};

	var req = https.request(options, (res) => {
		console.log('STATUS: ', res.statusCode);
		console.log('HEADERS: ', JSON.stringify(res.headers));

		if(res.statusCode === 403) {
		    console.log("permissions are not granted");
		    callback(null);
		    return;
		}

		var body = [];
		res.on('data', function(chunk) {
		    body.push(chunk);
		}).on('end', function() {
		    body = Buffer.concat(body).toString();
		    callback(res.statusCode);
		});

		res.on('error', (e) => {
		    console.log(`Problem with request: ${e.message}`);
		});

	    }).end();
	});
};

// Define events
const NEW_SESSION = "NewSession";
const LAUNCH_REQUEST = "LaunchRequest";
const SESSION_ENDED = "SessionEndedRequest";
const UNHANDLED = "Unhandled";
const ITEM_CREATED = "AlexaHouseholdListEvent.ItemsCreated";

// Define intents
const ADD_TO_INTENT = "AddToIntent";
const AMAZON_HELP = "AMAZON.HelpIntent";
const AMAZON_CANCEL = "AMAZON.CancelIntent";
const AMAZON_STOP = "AMAZON.StopIntent";

const handlers = {};

// Event handlers
handlers[NEW_SESSION] = newSessionRequestHandler;
handlers[LAUNCH_REQUEST] = launchRequestHandler;
handlers[SESSION_ENDED] = sessionEndedRequestHandler;
handlers[UNHANDLED] = unhandledRequestHandler;
handlers[ITEM_CREATED] = itemCreatedHandler;

// Intent handlers
handlers[ADD_TO_INTENT] = addToIntentHandler;
handlers[AMAZON_CANCEL] = amazonCancelHandler;
handlers[AMAZON_STOP] = amazonStopHandler;
handlers[AMAZON_HELP] = amazonHelpHandler;

