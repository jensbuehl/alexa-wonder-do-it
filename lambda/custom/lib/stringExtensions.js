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
    strInputString = strInputString.replace(/â/g, 'a');

    strInputString = strInputString.replace(/d'a/g, "d''a");
    strInputString = strInputString.replace(/l'a/g, "l''a");

    strInputString = strInputString.replace(/d'e/g, "d''e");
    strInputString = strInputString.replace(/l'e/g, "l''e");

    strInputString = strInputString.replace(/d'i/g, "d''i");
    strInputString = strInputString.replace(/l'i/g, "l''i");

    strInputString = strInputString.replace(/d'o/g, "d''o");
    strInputString = strInputString.replace(/l'o/g, "l''o");

    strInputString = strInputString.replace(/d'u/g, "d''u");
    strInputString = strInputString.replace(/l'u/g, "l''u");

    strInputString = strInputString.replace(/'s/g, "''s");
    return strInputString;
}


module.exports = {
    capitalize,
    replaceUnsupportedCharacters
};