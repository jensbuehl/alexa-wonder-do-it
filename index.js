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

// Language strings, as of now only German is supported
const languageStrings = {
    'de': {
        translation: {
            SKILL_NAME: 'Wunder Todo',
            WELCOME_MESSAGE: 'Willkommen bei Wunder Todo! ...Wie kann ich dir helfen, Uschi?',
            HELP_MESSAGE: 'Du kannst sagen, „Schreibe Brot auf Einkaufsliste“ ...Wie kann ich dir helfen?',
            HELP_REPROMPT: 'Wie kann ich dir helfen, Uschi?',
            STOP_MESSAGE: 'Auf Wiedersehen!',
            ERROR_MESSAGE: 'Es tut mir leid. Ich habe im Moment technische Probleme.'
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

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);

    console.log("this.event = " + JSON.stringify(event));

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
        //var graphToken = event.session.user.accessToken;
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
            console.log("Microsoft Graph permissions are not defined!");
        }    
        alexa.execute();
    } catch (err){
        console.error('Caught Error: ' + err);
        alexa.emit(':tell', t('ERROR_MESSAGE'));
    }
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('SayHello');
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'UnhandledRequest': function () {
        var speechOutput = "Denk nach! Denk nach! Diese Anfrage kann ich leider nicht bearbeiten.";
        this.emit(':tell', speechOutput);
    },
    'SayHello': function () {
        client
            .api('/me')
            .select("displayName")
            .get()
            .then((res) => {
                console.log(res);
                console.log(res.displayName);
                this.response.speak('Hallo ' + res.displayName);
                this.emit(':responseReady');
            }).catch((err) => {
                console.log(err);
            });   
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
                console.log(`${itemName} was added to list ${list.name}`);
                listClient.deleteListItem(listId, listItem.id, consentToken);
                //TODO: Handle response

                //TODO: Map Alexa default lists to MS-ToDo lists
                const taskItem = {
                    "Subject": itemName,
                };

                client
                .api('/me/outlook/tasks')
                .post(taskItem)
                .then((res) => {
                    console.log(res);
                }).catch((err) => {
                    console.log(err);
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