/**
* Capitalizes the first character of the input string
*
* @param {String} itemToAdd itemToAdd which shall be split into several items
* @returns {String} the capitalized string
*/
function capitalize(itemToAdd) {
    return itemToAdd.charAt(0).toUpperCase() + itemToAdd.slice(1);
  }

/**
* Replaces unsuppoorted characters (ISO/IEC 8859-1)
* e.g.  French œ.
* This workaround is needed, since filter parameters will fail otherwise. UTF8 is not enforcable.
*
* @param {String} itemToAdd itemToAdd which shall be split into several items
* @returns {String} the updated string
*/
function replaceUnsupportedCharacters(itemToAdd){
    return itemToAdd.replace(/œ/g, 'oe');
}


module.exports = {
    capitalize,
    replaceUnsupportedCharacters
};