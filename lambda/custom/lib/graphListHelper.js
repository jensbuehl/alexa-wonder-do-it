function getShoppingListFilter(listName){
    return `contains(name,'einkauf')
            or contains(name,'shop')
            or contains(name,'grocery')
            or contains(name,'${listName}')`;
}

async function getShoppingList(graphClient, listName){
    var shoppingListFilter = getShoppingListFilter(listName);
    var foundLists = await graphClient
    .api('/me/outlook/taskFolders')
    .filter(shoppingListFilter)
    .count(true)
    .get();
    
    if (foundLists["@odata.count"] > 0){
        return foundLists.value[0];
    } else {
        return createList(graphClient, alexaListName);
    }
}

async function getDefaultList(graphClient){
    try {
        var allLists = await graphClient
        .api('/me/outlook/taskFolders')
        .get();

        return allLists.value.find(x => x.isDefaultFolder === true);
    } catch (error) {
        console.log(error); 
    }
}

async function addTask(graphClient, graphTaskItem, targetList){
    if (undefined === targetList) {
        return addTaskToDefault(graphClient, graphTaskItem)
    } else {
        return addTaskToList(graphClient, graphTaskItem, targetList);
    }
}

async function addTaskToList(graphClient, graphTaskItem, targetList){
    try {
        var result = await graphClient
        .api(`/me/outlook/taskFolders/${targetList.id}/tasks`)
        .post(graphTaskItem)

        console.log(`${result.subject} was added to list: ${targetList.name}`);
        return result;
    } catch (error) {
        console.log(error);
    }
    
}

async function addTaskToDefault(graphClient, graphTaskItem){
    var result = await graphClient
        .api(`/me/outlook/tasks`)
        .post(graphTaskItem)

    console.log(`${result.subject} was added to default To-Do list`);
    return result;
}

async function createList(graphClient, listName){
    const graphListItem = {
        "name": listName,
    };

    var createdList = await graphClient
    .api(`/me/outlook/taskFolders`)
    .post(graphListItem);

    console.log(`${createdList.name} was created`);
    return createdList;
}

async function isDuplicate(graphClient, graphTaskItem, targetList){
    var duplicateFilter = `subject eq '${graphTaskItem.subject}'`
    if (undefined === targetList) {
        return isDuplicateInDefault(graphClient, duplicateFilter)
    } else {
        return isDuplicateInList(graphClient, duplicateFilter, targetList);
    }
}

async function isDuplicateInList(graphClient, duplicateFilter, targetList){
    getTasks(graphClient, duplicateFilter, targetList);
    return false;
}

async function isDuplicateInDefault(graphClient, duplicateFilter){
    var targetList = await getDefaultList(graphClient);
    getTasks(graphClient, duplicateFilter, targetList);
    return false
}

async function getTasks(graphClient, filter, targetList){
    try {
        var tasks = await graphClient
        .api(`/me/outlook/taskFolders/${targetList.id}/tasks`)
        .filter(filter)
        .count(true)
        .get();
        console.log(tasks);
    } catch (error) {
        console.log(error);
    }
}

/**
* Adds an outlookTask to the given target list by name. If no shopping list exists, the
* default list will be created (Alexa shopping list)
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {outlookTask} graphTaskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addShoppingItem = async (graphClient, alexaListName, graphTaskItem, consentToken) => {
    const targetList = await getShoppingList(graphClient, alexaListName); 
    //var result = await isDuplicate(graphClient, graphTaskItem, targetList);
    //TODO: Handle duplicates
    addTask(graphClient, graphTaskItem, targetList);
};

/**
* Adds an outlookTask to the default to-do list.
* @param graphClient Microsoft graph API client
* @param {outlookTask} taskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = async (graphClient, graphTaskItem, consentToken) => {
    //var result = await isDuplicate(graphClient, graphTaskItem);
    //TODO: Handle duplicates
    addTask(graphClient, graphTaskItem);
};

module.exports = {
    addShoppingItem,
    addToDoItem
};