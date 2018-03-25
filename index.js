'use strict';
const Alexa = require('alexa-sdk');
const https = require("https");

//Status of list, either active or completed
const STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed'
};
 
const api_url = 'api.amazonalexa.com';
const api_port = '443';
const APP_ID = 'amzn1.ask.skill.6afdb0f6-5d54-418a-81b1-7e4a0df32060';

// Microsoft Graph JavaScript SDK and client
var MicrosoftGraph = require("@microsoft/microsoft-graph-client");
var client = {};

// Log level definitions
var logLevels = {error: 3, warn: 2, info: 1, debug: 0};

// Language strings
const languageStrings = {
    'de': {
        translation: {
            SKILL_NAME: 'Wunder To-Do',
            WELCOME_MESSAGE: 'Willkommen bei Wunder To-Do! Füge mit Alexa neue Elemente zu deinen Listen hinzu! Du kannst sagen, „Alexa, schreibe Brot auf Einkaufsliste“ oder "Alexa, schreibe Sport auf meine Aufgabenliste"',
            HELP_MESSAGE: 'Du kannst sagen, „Alexa, schreibe Brot auf Einkaufsliste“ oder "Alexa, schreibe Sport auf meine Aufgabenliste"',
            HELP_REPROMPT: 'Füge mit Alexa neue Elemente zu deinen Listen hinzu!',
            STOP_MESSAGE: 'Auf Wiedersehen!',
            ERROR_MESSAGE: 'Es tut mir leid. Ich habe im Moment technische Probleme.',
            PERMISSIONS_MISSING_CARD_TITLE: 'Wunder To-Do - Fehlende Berechtigungen',
            PERMISSIONS_MISSING_MESSAGE: 'Um diesen Skill benutzen zu können, nutze bitte die Alexa-App um die Berechtigungen für den Listenzugriff zu erteilen.',
            LINK_ACCOUNT_MESSAGE: 'Um diesen Skill benutzen zu können, nutze bitte die Alexa-App um dein Konto zu verknüpfen. Weitere Informationen findest du auf deiner Alexa-Startseite.',
            SHOPPING_LIST: 'Einkaufsliste'
        },
    },
    'en': {
        translation: {
            SKILL_NAME: 'Wonder Do It',
            WELCOME_MESSAGE: 'Welcome to Wonder Do It! Use Alexa to add new elements to your lists! You could say, "Alexa, put bread on my shopping list" or "Alexa, add shopping to my todo list"',
            HELP_MESSAGE: 'You could say, "Alexa, put bread on my shopping list" or "Alexa, add shopping to my todo list"',
            HELP_REPROMPT: 'Use Alexa to add new elements to your lists!',
            STOP_MESSAGE: 'Goodbye!',
            PERMISSIONS_MISSING_CARD_TITLE: 'Wonder Do It - Missing permissions',
            PERMISSIONS_MISSING_MESSAGE: 'To start using this skill, please use the companion app to accept the required list access permissions.',
            ERROR_MESSAGE: 'I am sorry. I cannot handle your request due to technical difficulties.',
            LINK_ACCOUNT_MESSAGE: 'To start using this skill, please use the companion app to authenticate on Amazon. More information has been send to your Alexa-Home.',
            SHOPPING_LIST: 'Shopping list'
        },
    },
};

/**
 * Fetches list item information for each listItem in listItemIds. Executes the
 * callback function with the response back from api.amazonalexa.com
 * for each item in the list.
 *
 * @param {String} listId list id to check
 * @param {String[]} listItemIds list item ids in the request
 * @param {String} consentToken consent token from Alexa request
 * @param {(String) => void} callback func for each list item
 */
const traverseListItems = (listId, listItemIds, consentToken, callback) => {
    const listClient = new Alexa.services.ListManagementService();
    listItemIds.forEach((itemId) => {
        const listRequest = listClient.getListItem(listId, itemId, consentToken);

        listRequest.then((response) => {
            callback(response);
        }).catch((err) => {
            console.error(err);
        });
    });
};

/**
 * Fetches list information for given list id. Executes the
 * callback function with the response back from api.amazonalexa.com.
 *
 * @param {String} listId list id to check
 * @param {String} status specify either “active” or “completed” items.
 * @param {String} consentToken consent token from Alexa request
 * @param {(String) => void} callback func for the list
 */
const getListInfo = (listId, status, consentToken, callback) => {
    const listClient = new Alexa.services.ListManagementService();
    const listInfo = listClient.getList(listId, status, consentToken);

    listInfo.then((response) => {
        callback(response);
    }).catch((err) => {
        console.error(err);
    });
};

/**
 * Adds an outlookTask to the given target list by name. If the list does not 
 * exist it will be created.
 * 
 * @param {String} listName list name to which the item shall be added
 * @param {outlookTask} taskItem task item which shall be added
 * @param {String} consentToken consent token from Alexa request
*/
const addToList = (listName, taskItem, consentToken) => {
    //Get listId
    var filter = `startswith(name,'${listName}')`;
    client
    .api('/me/outlook/taskFolders')
    .filter(filter)
    .count(true)
    .get()
    .then((res) => {
        console.log(res);
        if (res["@odata.count"] > 0) {
            //Add to existing list
            client
            .api(`/me/outlook/taskFolders/${res.value[0].id}/tasks`)
            .post(taskItem)
            .then((res) => {
                console.log(`${res.subject} was added to list ${listName}`);
            }).catch((err) => {
                console.log(err);
            });
        } else {
            //Create new list
            const listItem = {
                "name": listName,
            };
            client
            .api(`/me/outlook/taskFolders`)
            .post(listItem)
            .then((res) => {
                console.log(`${listName} was created`);
                //Add to created list
                client
                .api(`/me/outlook/taskFolders/${res.id}/tasks`)
                .post(taskItem)
                .then((res) => {
                    console.log(`${res.subject} was added to list ${listName}`);
                }).catch((err) => {
                    console.log(err);
                });
            });
        }
        console.log(res);
    }).catch((err) => {
        console.log(err);
    });   
};

/**
 * Capitalizes the first character of the input string
 *
 * @param {String} itemToAdd itemToAdd which shall be split into several items
 * @returns {String} the capitalized string
 */
function capitalizeFirstLetter(itemToAdd) {
    return itemToAdd.charAt(0).toUpperCase() + itemToAdd.slice(1);
}

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);

    console.log("this.event = " + JSON.stringify(event));
    console.log("this.context = " + JSON.stringify(context));

    alexa.appId = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    try {
        // Validate Alexa list API access token
        var alexaToken = event.context.System.apiAccessToken;
        if (alexaToken) {
            console.log("Alexa API Auth Token: " + alexaToken, logLevels.debug);
        } else {
            console.log("Alexa list permissions are not defined!");
        }

        // Validate Microsoft Graph API access token
        var graphToken = event.context.System.user.accessToken;
        if (graphToken) {
            console.log("Microsoft Graph API Auth Token: " + graphToken, logLevels.debug);

            // Initialize the Microsoft Graph client
            client = MicrosoftGraph.Client.init({
                defaultVersion: 'beta',
                authProvider: (done) => {
                    done(null, graphToken);
                }
            });        
        } else {
            //if no amazon token, return a LinkAccount card
            console.log("Account not linked properly. Microsoft Graph permissions are not defined!");
        }    
        alexa.execute();
    } catch (err){
        console.error('Caught Error: ' + err);
        return;
    }
};

const handlers = {
    //Default events
    'LaunchRequest': function () {
        if (this.event.context.System.user.permissions) {
            const graphToken = this.event.context.System.user.accessToken;
            const alexaToken = this.event.context.System.apiAccessToken;
            const consentToken = this.event.context.System.user.permissions.consentToken;
            if (graphToken && alexaToken && consentToken) {
                this.response.speak(this.t('WELCOME_MESSAGE'));
                this.emit(':responseReady');       
            } else {
                //if no amazon token, return a LinkAccount card
                this.emit(':tellWithLinkAccountCard', this.t('LINK_ACCOUNT_MESSAGE'));
                return;                
            }     
        }     
        else {
            //List access permissions
            const speechOutput = this.t('PERMISSIONS_MISSING_MESSAGE'); 
            const cardTitle = this.t('PERMISSIONS_MISSING_CARD_TITLE'); 
            const cardContent = this.t('PERMISSIONS_MISSING_MESSAGE'); 

            this.response.speak(speechOutput).cardRenderer(cardTitle, cardContent);
            this.emit(':responseReady');
        }    
    },
    'SessionEndedRequest': function () {
        this.response.speak(this.t('STOP_MESSAGE'));
        this.emit(':responseReady');
    },
    'UnhandledRequest': function () {
        this.response.speak(this.t('ERROR_MESSAGE'));
        this.emit(':responseReady');
    },
    //Default intents
    'AMAZON.HelpIntent': function () {    
        this.response.speak(this.t('HELP_MESSAGE'));
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(this.t('STOP_MESSAGE'));
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(this.t('STOP_MESSAGE'));
        this.emit(':responseReady');
    },
    // Skill events
    'AlexaSkillEvent.SkillEnabled' : function() {
        const userId = this.event.context.System.user.userId;

        console.log(`skill was enabled for user: ${userId}`);        
    },
    'AlexaSkillEvent.SkillDisabled' : function() {
        const userId = this.event.context.System.user.userId;
        
        console.log(`skill was disabled for user: ${userId}`);
    },
    'AlexaSkillEvent.SkillPermissionAccepted' : function() {
        const userId = this.event.context.System.user.userId;
        const acceptedPermissions = JSON.stringify(this.event.request.body.acceptedPermissions);

        console.log(`skill permissions were accepted for user ${userId}. New permissions: ${acceptedPermissions}`);
    },
    'AlexaSkillEvent.SkillPermissionChanged' : function() {
        const userId = this.event.context.System.user.userId;
        const acceptedPermissions = JSON.stringify(this.event.request.body.acceptedPermissions);

        console.log(`skill permissions were changed for user ${userId}. New permissions: ${acceptedPermissions}`);
    },
    'AlexaSkillEvent.SkillAccountLinked' : function() {
        const userId = this.event.context.System.user.userId;

        console.log(`skill account was linked for user ${userId}`);
    },

    // Household list events
    'AlexaHouseholdListEvent.ItemsCreated' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const listItemIds = this.event.request.body.listItemIds;
        const listClient = new Alexa.services.ListManagementService();
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            traverseListItems(listId, listItemIds, consentToken, (listItem) => {
				const itemName = listItem.value;
				
				//Split and loop over list
				itemName.split(/ and | und /).forEach(function(entry) {
					//Make first letter upper case
                    var capitalizedEntry = capitalizeFirstLetter(entry);
					listClient.deleteListItem(listId, listItem.id, consentToken)
					.then((res) => {
						console.log(res);
					}).catch((err) => {
						console.log(err);
					});

					//Create task item
					const taskItem = {
						"Subject": capitalizedEntry,
					};

					//Add to default To-Do list
					if (list.name === "Alexa to-do list"){
							client
                            .api(`/me/outlook/tasks`)
                            .post(taskItem)
                            .then((res) => {
                                console.log(`${capitalizedEntry} was added to default To-Do list}`);
                            }).catch((err) => {
                                console.log(err);
						});
					} 
					//Add to shopping list or create if not exists
					else if (list.name === "Alexa shopping list"){
						//TODO: Use translation once clarified how to resolve missing locale information
						addToList(list.name, taskItem, consentToken)
					} 
					//Add to custom named list or create if not exists
					else {
						addToList(list.name, taskItem, consentToken)
					}
				});
            });
        });    
    },
    'AlexaHouseholdListEvent.ItemsDeleted' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const listItemIds = this.event.request.body.listItemIds;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            console.log(`${listItemIds} was deleted from list ${list.name}`);
        });
    },
    'AlexaHouseholdListEvent.ItemsUpdated' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const listItemIds = this.event.request.body.listItemIds;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            traverseListItems(listId, listItemIds, consentToken, (listItem) => {
                const itemName = listItem.value;
                console.log(`${itemName} was updated on list ${list.name}`);
            });
        });
    },
    'AlexaHouseholdListEvent.ListCreated' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;
        
        getListInfo(listId, status, consentToken, (list) => {
            console.log(`list ${list.name} was created`);
        });
    },
    'AlexaHouseholdListEvent.ListUpdated' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            console.log(`list ${list.name} was updated`);
        });
    },
    'AlexaHouseholdListEvent.ListDeleted' : function() {
        const listId = this.event.request.body.listId;
        const consentToken = this.event.context.System.apiAccessToken;
        const apiEndpoint = this.event.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;

        console.log(`list ${listId} was deleted`);
    },
};