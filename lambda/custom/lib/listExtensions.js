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
const traverseListItems = (listId, listItemIds, consentToken, listClient, callback) => {
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
const getListInfo = (listId, status, consentToken, listClient, callback) => {
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

module.exports = {
    traverseListItems, 
    getListInfo,
    addToList
};