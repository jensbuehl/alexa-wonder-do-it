/**
* Capitalizes the first character of the input string
*
* @param {String} itemToAdd itemToAdd which shall be split into several items
* @returns {String} the capitalized string
*/
function capitalizeFirstLetter(itemToAdd) {
    return itemToAdd.charAt(0).toUpperCase() + itemToAdd.slice(1);
  }

module.exports = {
    capitalizeFirstLetter
};