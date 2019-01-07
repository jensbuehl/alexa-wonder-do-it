/**
* Adds an outlookTask to the given target list by name. If the list does not 
* exist it will be created.
* 
* @param graphClient Microsoft graph API client
* @param {String} listName list name to which the item shall be added
* @param {outlookTask} graphTaskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addShoppingItem = (graphClient, listName, graphTaskItem, consentToken) => {
  //Use existing list if available
  var filter = `contains(name,'Einkauf')
  or contains(name,'Shop')
  or contains(name,'einkauf')
  or contains(name,'shop')
  or contains(name,'${listName}')`; 
  //startswith(name,'${listName}')`;

  graphClient
  .api('/me/outlook/taskFolders')
  .filter(filter)
  .count(true)
  .get()
  .then((res) => {
      if (res["@odata.count"] > 0) {
          //Add to existing list
          graphClient
          .api(`/me/outlook/taskFolders/${res.value[0].id}/tasks`)
          .post(graphTaskItem)
          .then((res) => {
              console.log(`${res.subject} was added to list ${listName}`);
          }).catch((err) => {
              console.log(err);
          });
      } else {
          //Create new list
          const graphListItem = {
              "name": listName,
          };
          graphClient
          .api(`/me/outlook/taskFolders`)
          .post(graphListItem)
          .then((res) => {
              console.log(`${listName} was created`);
              //Add to created list
              graphClient
              .api(`/me/outlook/taskFolders/${res.id}/tasks`)
              .post(graphTaskItem)
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
* Adds an outlookTask to the default to-do list.
* 
* @param graphClient Microsoft graph API client
* @param {outlookTask} taskItem task item which shall be added
* @param {String} consentToken consent token from Alexa request
*/
const addToDoItem = (graphClient, graphTaskItem, consentToken) => {
    graphClient
        .api(`/me/outlook/tasks`)
        .post(graphTaskItem)
        .then((res) => {
            console.log(`${graphTaskItem.subject} was added to default To-Do list}`);
        }).catch((err) => {
            console.log(err);
    });
};

module.exports = {
    addShoppingItem,
    addToDoItem
};