//Microsoft Graph requests
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

async function addTaskDefault(graphClient, graphTaskItem){
    try {
        var result = await graphClient
        .api(`/me/outlook/tasks`)
        .post(graphTaskItem)

        console.log(`${result.subject} was added to default To-Do list`);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function addTask(graphClient, graphTaskItem, targetList){
    if (undefined === targetList) {
        return addTaskDefault(graphClient, graphTaskItem)
    } else {
        return addTaskToList(graphClient, graphTaskItem, targetList);
    }
}

async function getTasks(graphClient, filter, targetList){
    try {
        var tasks = await graphClient
        .api(`/me/outlook/taskFolders/${targetList.id}/tasks`)
        .filter(filter)
        .count(true)
        .get();

        console.log("Received tasks:");
        console.log(tasks);
        return tasks;
    } catch (error) {
        console.log(error);
    }
}

async function getLists(graphClient, filter){
    try {
        var lists = await graphClient
        .api('/me/outlook/taskFolders')
        .filter(filter)
        .count(true)
        .get();

        console.log("Received lists:");
        console.log(lists);
        return lists;
    } catch (error) {
        console.log(error);
    }
}

async function updateTask(graphClient, graphTaskItem){
    try {
        var task = await graphClient
        .api(`/me/outlook/tasks/${graphTaskItem.id}`)
        .patch(graphTaskItem);

        console.log(`${task.subject} was updated.`);
        return task;
    } catch (error) {
        console.log(error);
    }
}

async function addList(graphClient, graphListItem){
    try {
        var list = await graphClient
        .api(`/me/outlook/taskFolders`)
        .post(graphListItem);

        console.log(`${list.name} was created.`);
        return list;
    } catch (error) {
        console.log(error);
    }
}

//Skill logic

/**
* Adds an outlookTask to the given target list by name. If no shopping list exists, the
* default list will be created (Alexa shopping list)
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {outlookTask} graphTaskItem task item which shall be added
* @param {String} listName Originating alexa list name.
*/
function buildShoppingListFilter(listName){
    return `contains(name,'einkauf')
            or contains(name,'shop')
            or contains(name,'grocery')
            or contains(name,'${listName}')`;
}

function createGraphListItem(listName){
    return { "name": listName };
}

async function getShoppingList(graphClient, listName){
    var shoppingListFilter = buildShoppingListFilter(listName);
    var lists = await getLists(graphClient, shoppingListFilter);
    
    if (lists["@odata.count"] > 0){
        return lists.value[0];
    } else {
        return createList(graphClient, alexaListName);
    }
}

async function getDefaultList(graphClient){
    try {
        var allLists = await getLists(graphClient,"");
        return allLists.value.find(x => x.isDefaultFolder === true);
    } catch (error) {
        console.log(error); 
    }
}

async function createList(graphClient, listName){
    const graphListItem = createGraphListItem(listName);
    return await addList(graphClient, listName);
}

async function handleDuplicates(graphClient, graphTaskItem, targetList){
    var duplicates = getDuplicates(graphClient, graphTaskItem, targetList);
    if (duplicates["@odata.count"] > 0){
        //Set completed duplicate task back to notStarted
         var duplicate = duplicates.value.find(x => x.status === "completed");
        duplicate.status = "notStarted";
        updateTask(graphClient, duplicate)

        return true;
    }
    return false;
}

async function getDuplicates(graphClient, graphTaskItem, targetList){
    var duplicateFilter = `subject eq '${graphTaskItem.subject}'`
    if (undefined === targetList) {
        var targetList = await getDefaultList(graphClient);
    }
    return await getTasks(graphClient, duplicateFilter, targetList);
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
    if (false === await handleDuplicates(graphClient, graphTaskItem, targetList)){
        //No duplicates found!
        addTask(graphClient, graphTaskItem, targetList);
    }
};

/**
* Adds an outlookTask to the default to-do list.
* @param graphClient Microsoft graph API client
* @param {outlookTask} taskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = async (graphClient, graphTaskItem, consentToken) => {
    if(false === await handleDuplicates(graphClient, graphTaskItem)){
        //No duplicates found!
        addTask(graphClient, graphTaskItem);
    }
};

module.exports = {
    addShoppingItem,
    addToDoItem
};