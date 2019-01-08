function getShoppingFilter(listName)
{
    return `contains(name,'einkauf')
            or contains(name,'shop')
            or contains(name,'grocery')
            or contains(name,'${listName}')`;
}

function getTargetShoppingLists(graphClient, listName){
    var filter = getShoppingFilter(listName);
    return graphClient
        .api('/me/outlook/taskFolders')
        .filter(filter)
        .count(true)
        .get()
}

function addTaskToFolder(graphClient, targetListId, graphTaskItem){
    return graphClient
        .api(`/me/outlook/taskFolders/${targetListId}/tasks`)
        .post(graphTaskItem)
}

function addTask(graphClient, graphTaskItem){
    return graphClient
        .api(`/me/outlook/tasks`)
        .post(graphTaskItem)
}

function createList(graphClient, listName){
    const graphListItem = {
        "name": listName,
    };

    return graphClient
    .api(`/me/outlook/taskFolders`)
    .post(graphListItem)
}

/**
* Adds an outlookTask to the given target list by name. If no shoppint list exists, the
* default list will be created (Alexa shopping list)
* 
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {outlookTask} graphTaskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addShoppingItem = async (graphClient, alexaListName, graphTaskItem, consentToken) => {
    const targetList = await getTargetShoppingLists(graphClient, alexaListName); 
    console.log(targetList); 

    if (targetList["@odata.count"] > 0) {
        //Add to existing list
        var result = await addTaskToFolder(graphClient, targetList.value[0].id, graphTaskItem);
        console.log(`${result.subject} was added to list: ${targetList.value[0].name}`);
    } else {
        //Create new list
        var result = await createList(graphClient, alexaListName);
        console.log(`${result.name} was created`);
        
        //Add to created list
        var result = await addTaskToFolder(graphClient, result.id, graphTaskItem);
        console.log(`${result.subject} was added to list: ${result.name}`);
    }  
};

/**
* Adds an outlookTask to the default to-do list.
* 
* @param graphClient Microsoft graph API client
* @param {outlookTask} taskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = async (graphClient, graphTaskItem, consentToken) => {
    var result = await addTask(graphClient, graphTaskItem);
    console.log(`${result.subject} was added to default To-Do list}`);
};

module.exports = {
    addShoppingItem,
    addToDoItem
};