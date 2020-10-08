const stringExtensions = require('./stringExtensions.js');

//Microsoft Graph requests
async function addTaskToList(graphClient, todoTask, todoTaskList){
    try {
        var result = await graphClient
        .api(`/me/todo/lists/${todoTaskList.id}/tasks`)
        .post(todoTask)

        console.log(`${result.title} was added to list: ${todoTaskList.displayName}`);
        return result;
    } catch (error) {
        console.log(error);
    }
}

async function addTask(graphClient, todoTask, todoTaskList){
    if (undefined === todoTaskList) {
        var todoTaskList = await getDefaultList(graphClient);
        return addTaskToList(graphClient, todoTask, todoTaskList);
    } else {
        return addTaskToList(graphClient, todoTask, todoTaskList);
    }
}

async function getTasks(graphClient, filter, todoTaskList){
    //Filter parameters does apparently only accept ISO/IEC 8859-1 characterset.
    //Still the filter clause does work to detect duplicates, apparently Microsoft uses the same translation internally.
    filter = stringExtensions.replaceUnsupportedCharacters(filter);
    //console.log(filter);
    try {
        var tasks = await graphClient
        .api(`/me/todo/lists/${todoTaskList.id}/tasks`)
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

async function getTaskLists(graphClient, filter){
    try {
        var taskLists = await graphClient
        .api('/me/todo/lists')
        .filter(filter)
        .count(true)
        .get();

        console.log("Received task lists:");
        console.log(taskLists);
        return taskLists;
    } catch (error) {
        console.log(error);
    }
}

async function updateTask(graphClient, todoTaskList, todoTask){
    try {
        var task = await graphClient
        //TODO: We need the task list id here!
        .api(`/me/todo/lists/${todoTaskList.id}/tasks/${todoTask.id}`)
        .patch(todoTask);

        console.log(`${task.title} was updated.`);
        return task;
    } catch (error) {
        console.log(error);
    }
}

async function addTodoList(graphClient, todoList){
    try {
        var newTodoList = await graphClient
        .api(`/me/todo/lists`)
        .post(todoList);

        console.log(`${newTodoList.displayName} was created.`);
        return newTodoList;
    } catch (error) {
        console.log(error);
    }
}

//Skill logic
function buildShoppingListFilter(){
    return `contains(name,'einkauf')
            or contains(name,'shop')
            or contains(name,'grocery')
            or contains(name,'groceri')
            or contains(name,'achat')
            or contains(name,'magasin')
            or contains(name,'courses')
            or contains(name,'compra')
            or contains(name,'compra')
            or contains(name,'spesa')`;
}

function buildGivenListFilter(listName){
    return `contains(name,'${listName}')`;
}

function createTodoList(name){
    return { "displayName": name };
}

async function getShoppingList(graphClient, listName){
    var shoppingListFilter = buildShoppingListFilter();
    var givenListFilter = buildGivenListFilter(listName);

    //Filter withouth given listName first! Prefer predefined lists instead of the given name!
    var lists = await getTaskLists(graphClient, shoppingListFilter); 
    
    if (lists["@odata.count"] > 0){
        return lists.value[0];
    } else {    
        //Do a second run with the given name here, if no predefined list found, then look for the given one.
        lists = await getTaskLists(graphClient, givenListFilter); 
        if (lists["@odata.count"] > 0){
            return lists.value[0];
        } else {        
            //Only if this one also is not found then create a new one!
            return createList(graphClient, listName);
        }
    }
}

async function getCustomList(graphClient, listName){
    //var customListFilter = `startsWith(name,'${listName}')`;
    var customListFilter = buildGivenListFilter(listName);
    var lists = await getTaskLists(graphClient, customListFilter);
    
    if (lists["@odata.count"] > 0){
        return lists.value[0];
    } else {
        return createList(graphClient, listName);
    }
}

async function getDefaultList(graphClient){
    try {
        var allLists = await getTaskLists(graphClient,"");
        return allLists.value.find(x => x.wellknownListName === "defaultList");
    } catch (error) {
        console.log(error); 
    }
}

async function createList(graphClient, listName){
    const todoList = createTodoList(listName);
    return await addTodoList(graphClient, todoList);
}

async function handleDuplicates(graphClient, todoTask, todoTaskList){
    var duplicates = await getDuplicates(graphClient, todoTask, todoTaskList);
    if (duplicates["@odata.count"] > 0){
        //Set completed duplicate task back to notStarted
        var duplicate = duplicates.value.find(x => x.status === "completed");
        if (undefined === duplicate){
            //No completed task found
            return true
        }
        duplicate.status = "notStarted";
        updateTask(graphClient, todoTaskList, duplicate)
        return true;
    }
    return false;

}

async function getDuplicates(graphClient, todoTask, todoTaskList){
    var duplicateFilter = `title eq '${todoTask.title}'`
    console.log(todoTask)
    if (undefined === todoTaskList) {
        var todoTaskList = await getDefaultList(graphClient);
    }
    return await getTasks(graphClient, duplicateFilter, todoTaskList);
}

/**
* Adds an todoTask to the given target list by name. If no shopping list exists, the
* default list will be created (Alexa shopping list)
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {todoTask} todoTask task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addShoppingItem = async (graphClient, alexaListName, todoTask, consentToken) => {
    console.log("alexaListName input in addShoppingItem():"); 
    console.log(alexaListName); 
    const todoTaskList = await getShoppingList(graphClient, alexaListName);
    console.log("todoTaskList after mapping in addShoppingItem():"); 
    console.log(todoTaskList); 
    if (false === await handleDuplicates(graphClient, todoTask, todoTaskList)){
        //No duplicates found!
 
       addTask(graphClient, todoTask, todoTaskList);
    }
};

/**
* Adds an todoTask to the given target list by name. If the list does not exist it will be created.
* @param graphClient Microsoft graph API client
* @param {String} alexaListName list name to which the item shall be added
* @param {todoTask} todoTask task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addCustomTaskItem = async (graphClient, alexaListName, todoTask, consentToken) => {
    const todoTaskList = await getCustomList(graphClient, alexaListName); 
    addTask(graphClient, todoTask, todoTaskList);
};

/**
* Adds an todoTask to the default to-do list.
* @param graphClient Microsoft graph API client
* @param {todoTask} todoTask task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = async (graphClient, todoTask, consentToken) => {
    if(false === await handleDuplicates(graphClient, todoTask)){
        //No duplicates found!
        addTask(graphClient, todoTask);
    }
};

module.exports = {
    addShoppingItem,
    addToDoItem,
    addCustomTaskItem
};