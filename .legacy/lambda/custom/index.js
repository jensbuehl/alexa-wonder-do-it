'use strict';

//Constants
const API_URL = 'api.amazonalexa.com';
const API_PORT = '443';
const APP_ID = 'amzn1.ask.skill.6afdb0f6-5d54-418a-81b1-7e4a0df32060';
const STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed'
};
const DEFAULT_ALEXA_LISTS = {
    SHOPPING: 'Alexa shopping list',
    TODO: 'Alexa to-do list'
}

//External modules
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
var MicrosoftGraph = require("@microsoft/microsoft-graph-client");

// My modules
const alexaListHelper = require('./lib/alexaListHelper.js');
const graphListHelper = require('./lib/graphListHelper.js');
const stringExtensions = require('./lib/stringExtensions.js');
const translations = require('./lib/translations.js');

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
        console.log(`skill account linked for user ${userId}.`);
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
        const alexaListClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, alexaListClient, (list) => {
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
        const alexaListClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;
        
        alexaListHelper.getListInfo(listId, status, consentToken, alexaListClient, (list) => {
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
        const alexaListClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, alexaListClient, (list) => {
            alexaListHelper.traverseListItems(listId, listItemIds, consentToken, alexaListClient, (listItem) => {
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
        const alexaListClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;
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
        const alexaListClient = handlerInput.serviceClientFactory.getListManagementServiceClient();
        const status = STATUS.ACTIVE;

        alexaListHelper.getListInfo(listId, status, consentToken, alexaListClient, (alexaList) => {
            alexaListHelper.traverseListItems(listId, listItemIds, consentToken, alexaListClient, (listItem) => {
				const alexaTaskName = listItem.value;
				
				//Split and loop over list
				alexaTaskName.split(/ and | und | y | e | et /).forEach(function(entry) {
					//Make first letter upper case
                    var alexaSplitTaskName = stringExtensions.capitalize(entry);
                    // Set as done instead of removing.
                    const completedItem = {
                        'value': alexaTaskName,
                        'status': STATUS.COMPLETED,
                        'version': listItem.version
                    };
                    alexaListClient.updateListItem(listId, listItem.id, completedItem, consentToken)
					.then((res) => {
						console.log(`${listItem.value} was updated in Alexa list`);
					}).catch((err) => {
                        console.log("Error when trying to update item in Alexa list");
                        console.log(err)
					});

					//Create task item
					const graphTaskItem = {
						"title": alexaSplitTaskName,
                    };
                    
					//Add to default To-Do list
					if (alexaList.name === DEFAULT_ALEXA_LISTS.TODO){
                        graphListHelper.addToDoItem(attributes.graphClient, graphTaskItem, consentToken);
					} 
					//Add to shopping list or create if not exists
					else if (alexaList.name === DEFAULT_ALEXA_LISTS.SHOPPING){
                        graphListHelper.addShoppingItem(attributes.graphClient, alexaList.name, graphTaskItem, consentToken)
					} 
					//Add to custom named list or create if not exists
					else {
						graphListHelper.addCustomTaskItem(attributes.graphClient, alexaList.name, graphTaskItem, consentToken)
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
                console.log("Microsoft Graph API Auth Token: " + graphToken);

                // Initialize the Microsoft Graph client
                var graphClient = MicrosoftGraph.Client.init({
                    defaultVersion: 'beta',
                    authProvider: (done) => {
                        done(null, graphToken);
                    }
                });
                const attributes = handlerInput.attributesManager.getRequestAttributes();      
                attributes.graphClient = graphClient;
                handlerInput.attributesManager.setRequestAttributes(attributes);
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
                console.log("Alexa API Auth Token: " + alexaToken);
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
         SkillAccountLinkedEventHandler,
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
     .withSkillId(APP_ID)
     .withApiClient(new Alexa.DefaultApiClient())
     .lambda();