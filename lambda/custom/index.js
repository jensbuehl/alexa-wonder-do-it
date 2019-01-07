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

// My modules
const alexaListHelper = require('./lib/alexaListHelper.js');
const graphListHelper = require('./lib/graphListHelper.js');
const stringExtensions = require('./lib/stringExtensions.js');
const translations = require('./lib/translations.js');

//Status of list, either active or completed
const STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed'
};

// Log level definitions
var logLevels = {error: 3, warn: 2, info: 1, debug: 0};

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
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, listClient, (list) => {
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
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;
        
        alexaListHelper.getListInfo(listId, status, consentToken, listClient, (list) => {
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
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, listClient, (list) => {
            alexaListHelper.traverseListItems(listId, listItemIds, consentToken, listClient, (listItem) => {
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
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        getListInfo(listId, status, consentToken, listClient, (list) => {
            console.log(`${listItemIds} was deleted from list ${list.name}`);
        });
    }
};

const HouseHoldListItemsCreatedEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AlexaHouseholdListEvent.ItemsCreated';
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getRequestAttributes();
		const listId = handlerInput.requestEnvelope.request.body.listId;
        const consentToken = handlerInput.requestEnvelope.context.System.apiAccessToken;
        const apiEndpoint = handlerInput.requestEnvelope.context.System.apiEndpoint;
        const listItemIds = handlerInput.requestEnvelope.request.body.listItemIds;
        const listClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, listClient, (list) => {
            alexaListHelper.traverseListItems(listId, listItemIds, consentToken, listClient, (listItem) => {
				const itemName = listItem.value;
				
				//Split and loop over list
				itemName.split(/ and | und /).forEach(function(entry) {
					//Make first letter upper case
                    var capitalizedEntry = stringExtensions.capitalize(entry);
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
                        graphListHelper.addToList(list.name, taskItem, consentToken)
					} 
					//Add to custom named list or create if not exists
					else {
						graphListHelper.addToList(list.name, taskItem, consentToken)
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
            resources: translations,
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
     .withApiClient(new Alexa.DefaultApiClient())
     .lambda();