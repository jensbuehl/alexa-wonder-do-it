'use strict';

const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const api_url = 'api.amazonalexa.com';
const api_port = '443';
const appId = 'amzn1.ask.skill.6afdb0f6-5d54-418a-81b1-7e4a0df32060';
// Microsoft Graph JavaScript SDK and client
var MicrosoftGraph = require("@microsoft/microsoft-graph-client");
var client = {};

//Status of list, either active or completed
const STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed'
};

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

//Helpers / Business logic
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

//Skill event handlers
const SkillEnabledEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillEnabled';
    },
    handle(handlerInput) {
		const userId = handlerInput.requestEnvelope.context.System.user.userId;
        console.log(`skill was enabled for user: ${userId}`); 
    }
};

const SkillDisabledEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillDisabled';
    },
    handle(handlerInput) {
		const userId = handlerInput.requestEnvelope.context.System.user.userId;      
        console.log(`skill was disabled for user: ${userId}`);
    }
};

const SkillPermissionAcceptedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillPermissionAccepted';
    },
    handle(handlerInput) {
		const userId = handlerInput.requestEnvelope.context.System.user.userId;
        const acceptedPermissions = JSON.stringify(handlerInput.requestEnvelope.request.body.acceptedPermissions);
        console.log(`skill permissions were accepted for user ${userId}. New permissions: ${acceptedPermissions}`);
    }
};

const SkillPermissionChangedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillPermissionChanged';
    },
    handle(handlerInput) {
		const userId = handlerInput.requestEnvelope.context.System.user.userId;
        const acceptedPermissions = JSON.stringify(handlerInput.requestEnvelope.request.body.acceptedPermissions);
        console.log(`skill permissions were changed for user ${userId}. New permissions: ${acceptedPermissions}`);
    }
};

const SkillAccountLinkedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaSkillEvent.SkillAccountLinked';
    },
    handle(handlerInput) {
		const userId = handlerInput.requestEnvelope.context.System.user.userId;
        const acceptedPermissions = JSON.stringify(handlerInput.requestEnvelope.request.body.acceptedPermissions);
        console.log(`skill permissions were changed for user ${userId}. New permissions: ${acceptedPermissions}`);
    }
};

//List event handlers
const HouseHoldListListUpdatedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ListUpdated';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            console.log(`list ${list.name} was updated`);
        });
    }
};

const HouseHoldListListDeletedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ListDeleted';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;

        console.log(`list ${listId} was deleted`);
    }
};

const HouseHoldListListCreatedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ListCreated';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const status = STATUS.ACTIVE;
        
        getListInfo(listId, status, consentToken, (list) => {
            console.log(`list ${list.name} was created`);
        });
    }
};

const HouseHoldListItemsUpdatedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ItemsUpdated';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const listItemIds = handlerInput.requestEnvelope.request.body.listItemIds;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            traverseListItems(listId, listItemIds, consentToken, (listItem) => {
                const itemName = listItem.value;
                console.log(`${itemName} was updated on list ${list.name}`);
            });
        });
    }
};

const HouseHoldListItemsDeletedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ItemsDeleted';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const listItemIds = handlerInput.requestEnvelope.request.body.listItemIds;
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, (list) => {
            console.log(`${listItemIds} was deleted from list ${list.name}`);
        });
    }
};

const HouseHoldListItemsCreatedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ItemsCreated';
    },
    handle(handlerInput) {
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const listItemIds = handlerInput.requestEnvelope.request.body.listItemIds;
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
    }
};

//Default intent handlers
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getRequestAttributes();
        if (handlerInput.requestEnvelope.context.System.user.permissions) {        
            const graphToken = handlerInput.requestEnvelope.context.System.user.accessToken;
            const alexaToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
            const consentToken = handlerInput.requestEnvelope.context.System.user.permissions.consentToken;
            if (graphToken && alexaToken && consentToken) {
                return handlerInput.responseBuilder
                    .speak(attributes.t('WELCOME_MESSAGE'))
                    .getResponse();   
            } else {
                //if no amazon token, return a LinkAccount card
                return handlerInput.responseBuilder
                    .speak(attributes.t('LINK_ACCOUNT_MESSAGE'))
                    .withLinkAccountCard()
                    .getResponse();               
            }     
        }     
        else {
            //List access permissions
            const speechOutput = attributes.t('PERMISSIONS_MISSING_MESSAGE'); 
            const cardTitle = attributes.t('PERMISSIONS_MISSING_CARD_TITLE'); 
            const cardContent = attributes.t('PERMISSIONS_MISSING_MESSAGE'); 
            return handlerInput.responseBuilder
                    .speak(speechOutput)
                    .withSimpleCard(cardTitle, cardContent)
                    .getResponse();   
        }    
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getRequestAttributes();
        const speechText = attributes.t('STOP_MESSAGE');

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
		const attributes = handlerInput.attributesManager.getRequestAttributes();
        const speechText = attributes.t('STOP_MESSAGE');

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
		const attributes = handlerInput.attributesManager.getRequestAttributes();
        const speechText = attributes.t('HELP_MESSAGE');

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(attributes.t('SKILL_NAME'), speechText)
            .getResponse();
    }
};

//Error handler
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const attributes = handlerInput.attributesManager.getRequestAttributes();
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak(attributes.t('ERROR_MESSAGE'))
            .getResponse();
    },
};

// Interceptors
const LocalizationInterceptor = {
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: handlerInput.requestEnvelope.request.locale,
            overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
            resources: languageStrings,
            returnObjects: true
        });

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function (...args) {
            return localizationClient.t(...args);
        };
    },
};

const MicrosoftGraphValidationInterceptor = {
    process(handlerInput) {
        try {
            var graphToken =handlerInput.requestEnvelope.context.System.user.accessToken;
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
        } catch (error) {
            console.error('Caught exception in MicrosoftGraphValidationInterceptor: ' + error);
            return;
        }       
    },
};

const AlexaListApiValidationInterceptor = {
    process(handlerInput) {
        try {
            var alexaToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
            if (alexaToken) {
                console.log("Alexa API Auth Token: " + alexaToken, logLevels.debug);
            } else {
                console.log("Alexa list permissions are not defined!");
            }   
        } catch (error) {
            console.error('Caught exception in AlexaListApiValidationInterceptor: ' + error);
            return;
        }
    },
};

const GlobalEventLoggingInterceptor = {
    process(handlerInput) {
        console.log("handlerInput.RequestEnvelope = " + JSON.stringify(handlerInput.requestEnvelope));
        console.log("handlerInput.Context = " + JSON.stringify(handlerInput.Context));
    },
};

exports.handler = Alexa.SkillBuilders.custom()
     .addRequestHandlers(
         //Default intents
         LaunchRequestHandler, 
         SessionEndedRequestHandler,
         HelpIntentHandler,
         CancelAndStopIntentHandler,
         //Skill events
         SkillEnabledEventHandler,
         SkillDisabledEventHandler,
         SkillPermissionAcceptedEventHandler,
         SkillPermissionChangedEventHandler,
         //List events
         HouseHoldListItemsCreatedEventHandler,
         HouseHoldListItemsDeletedEventHandler,
         HouseHoldListItemsUpdatedEventHandler,
         HouseHoldListListCreatedEventHandler)
     .addErrorHandlers(ErrorHandler)
     .addRequestInterceptors(
         LocalizationInterceptor, 
         MicrosoftGraphValidationInterceptor,
         GlobalEventLoggingInterceptor,
         AlexaListApiValidationInterceptor)
     .withSkillId(appId)
     .lambda();