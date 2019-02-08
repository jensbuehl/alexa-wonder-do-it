//Microsoft Graph requests
async function addTaskToFolder(graphClient, outlookTask, outlookTaskFolder){
    try {
        var result = await graphClient
        .api(`/me/outlook/taskFolders/${outlookTaskFolder.id}/tasks`)
        .post(outlookTask)

        console.log(`${result.subject} was added to list: ${outlookTaskFolder.name}`);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function addTaskDefault(graphClient, outlookTask){
    try {
        var result = await graphClient
        .api(`/me/outlook/tasks`)
        .post(outlookTask)

        console.log(`${result.subject} was added to default To-Do folder`);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function addTask(graphClient, outlookTask, outlookTaskFolder){
    if (undefined === outlookTaskFolder) {
        return addTaskDefault(graphClient, outlookTask)
    } else {
        return addTaskToFolder(graphClient, outlookTask, outlookTaskFolder);
    }
}

async function getTasks(graphClient, filter, outlookTaskFolder){
    try {
        var tasks = await graphClient
        .api(`/me/outlook/taskFolders/${outlookTaskFolder.id}/tasks`)
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

async function getFolders(graphClient, filter){
    try {
        var folders = await graphClient
        .api('/me/outlook/taskFolders')
        .filter(filter)
        .count(true)
        .get();

        console.log("Received folders:");
        console.log(folders);
        return folders;
    } catch (error) {
        console.log(error);
    }
}

async function updateTask(graphClient, outlookTask){
    try {
        var task = await graphClient
        .api(`/me/outlook/tasks/${outlookTask.id}`)
        .patch(outlookTask);

        console.log(`${task.subject} was updated.`);
        return task;
    } catch (error) {
        console.log(error);
    }
}

async function addFolder(graphClient, outlookTaskFolder){
    try {
        var folder = await graphClient
        .api(`/me/outlook/taskFolders`)
        .post(outlookTaskFolder);

        console.log(`${folder.name} was created.`);
        return folder;
    } catch (error) {
        console.log(error);
    }
}

//Skill logic

function buildShoppingListFilter(listName){
    return `contains(name,'einkauf')
            or contains(name,'shop') //en
            or contains(name,'grocery') //en
            or contains(name,'groceri') //en
            or contains(name,'achat') //fr
            or contains(name,'magasin') //fr
            or contains(name,'courses') //fr
            or contains(name,'compra') //es
            or contains(name,'compra') //es
            or contains(name,'spesa') //it
            or contains(name,'${listName}')`;
}

function createOutlookTaskFolder(name){
    return { "name": name };
}

async function getShoppingList(graphClient, listName){
    var shoppingListFilter = buildShoppingListFilter(listName);
    var lists = await getFolders(graphClient, shoppingListFilter);
    
    if (lists["@odata.count"] > 0){
        return lists.value[0];
    } else {
        return createFolder(graphClient, listName);
    }
}

async function getCustomList(graphClient, listName){
    var customListFilter = `startsWith(name,'${listName}')`;
    var lists = await getFolders(graphClient, customListFilter);
    
    if (lists["@odata.count"] > 0){
        return lists.value[0];
    } else {
        return createFolder(graphClient, listName);
    }
}

async function getDefaultFolder(graphClient){
    try {
        var allLists = await getFolders(graphClient,"");
        return allLists.value.find(x => x.isDefaultFolder === true);
    } catch (error) {
        console.log(error); 
    }
}

async function createFolder(graphClient, listName){
    const graphListItem = createOutlookTaskFolder(listName);
    return await addFolder(graphClient, listName);
}

async function handleDuplicates(graphClient, outlookTask, outlookTaskFolder){
    var duplicates = await getDuplicates(graphClient, outlookTask, outlookTaskFolder);
    if (duplicates["@odata.count"] > 0){
        //Set completed duplicate task back to notStarted
        var duplicate = duplicates.value.find(x => x.status === "completed");
        if (undefined === duplicate){
            //No completed task found
            return true
        }
        duplicate.status = "notStarted";
        updateTask(graphClient, duplicate)
        return true;
    }
    return false;

}

async function getDuplicates(graphClient, outlookTask, outlookTaskFolder){
    var duplicateFilter = `subject eq '${outlookTask.subject}'`
    if (undefined === outlookTaskFolder) {
        var outlookTaskFolder = await getDefaultFolder(graphClient);
    }
    return await getTasks(graphClient, duplicateFilter, outlookTaskFolder);
}

/**
* Adds an outlookTask to the given target list by name. If no shopping list exists, the
* default list will be created (Alexa shopping list)
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {outlookTask} outlookTask task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addShoppingItem = async (graphClient, alexaListName, outlookTask, consentToken) => {
    const outlookTaskFolder = await getShoppingList(graphClient, alexaListName); 
    if (false === await handleDuplicates(graphClient, outlookTask, outlookTaskFolder)){
        //No duplicates found!
 
       addTask(graphClient, outlookTask, outlookTaskFolder);
    }
};

/**
* Adds an outlookTask to the given target list by name. If the list does not exist it will be created.
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {outlookTask} outlookTask task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addCustomTaskItem = async (graphClient, alexaListName, outlookTask, consentToken) => {
    const outlookTaskFolder = await getCustomList(graphClient, alexaListName); 
    addTask(graphClient, outlookTask, outlookTaskFolder);
};

/**
* Adds an outlookTask to the default to-do list.
* @param graphClient Microsoft graph API client
* @param {outlookTask} taskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = async (graphClient, outlookTask, consentToken) => {
    if(false === await handleDuplicates(graphClient, outlookTask)){
        //No duplicates found!
        addTask(graphClient, outlookTask);
    }
};

module.exports = {
    addShoppingItem,
    addToDoItem,
    addCustomTaskItem
};