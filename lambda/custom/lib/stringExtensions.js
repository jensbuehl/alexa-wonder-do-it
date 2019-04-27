/**
* Capitalizes the first character of the input string
*
* @param {String} strInputString string which shall be split into several items
* @returns {String} the capitalized string
*/
function capitalize(strInputString) {
    return strInputString.charAt(0).toUpperCase() + strInputString.slice(1);
  }

/**
* Replaces unsuppoorted characters (ISO/IEC 8859-1)
* e.g.  French œ.
* This workaround is needed, since filter parameters will fail otherwise. UTF8 is not enforcable.
*
* @param {String} strInputString string which shall be prepared for filter clause
* @returns {String} the updated string
*/
function replaceUnsupportedCharacters(strInputString){
    strInputString = strInputString.replace(/œ/g, 'oe');
    strInputString = strInputString.replace(/Œ/g, 'Oe');
    
    strInputString = strInputString.replace(/d'/g, "d''");
    strInputString = strInputString.replace(/l'/g, "l''");
    return strInputString;
}


module.exports = {
    capitalize,
    replaceUnsupportedCharacters
};