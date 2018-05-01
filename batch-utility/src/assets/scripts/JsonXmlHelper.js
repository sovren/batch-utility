// Copyright © 2018 Sovren Group, Inc. All rights reserved.
// This file is provided for use and modification by, or on behalf of, Sovren licensees
// within the terms of their license of Sovren products. This file shall not be distributed
// or published, in whole or in part, for any other purpose without prior written permission
// of Sovren Group, Inc.
//
// WARNING: This unit is part of a sample application and is provided without warranty or support of any kind from Sovren.
// Please note that there are a multitude of US and international THIRD PARTY patents that may need to be licensed
// from the patent holders in order to deploy sample applications. The purpose of the sample applications is to
// demonstrate potential usage scenarios and we expressly disclaim that the existence of the sample apps or any part thereof 
// constitutes permission to deploy such functionality without separately obtaining permission from any third party 
// patent holders. It is solely YOUR responsibility to research and obtain any required third party patent rights.

function JsonXmlHelper() {
}

//gets a value from an xml or json object
JsonXmlHelper.GetValue = function (obj, propName, bXML, bText) {
    var rVal = bXML ? obj.getElementsByTagName(propName)[0] : obj[propName];
    return (bXML && bText) ? $(rVal).text() : rVal;
};


// Changes XML to JSON
JsonXmlHelper.XmlToJson = function (xml) {
    // Create the return object
    var obj = null;

    if (xml.nodeType == 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj = (obj == null ? {} : obj);//set to non-null if null

            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@" + attribute.nodeName] = attribute.nodeValue;
            }
        }
    }
    else if (xml.nodeType == 3) { // text
        obj = xml.nodeValue;
    }

    //node contains no other nodes, only text
    var bTextOnly = (xml.hasChildNodes() && xml.childNodes.length === 1 && xml.childNodes[0].nodeType === 3);

    if (bTextOnly && xml.attributes.length == 0) {
        obj = xml.childNodes[0].nodeValue;//only one text node inside, no attributes, so use the text as the value

        if (!isNaN(obj) && obj != '') {
            obj = +obj;//convert to number equivalent
        }
    }
    else if (xml.hasChildNodes()) { // do children
        for (var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;

            //skip #text node unless this node contains only text and attributes
            if (nodeName == "#text" && !bTextOnly) {
                continue;//trash whitespace
            }

            obj = (obj == null ? {} : obj);//set to non-null if null

            if (typeof (obj.push) != "undefined") {
                //obj is an array, so the children are just items
                obj.push(JsonXmlHelper.XmlToJson(item));
            }
            else if (typeof (obj[nodeName]) == "undefined") {
                obj[nodeName] = JsonXmlHelper.XmlToJson(item);//add an object
            }
            else {
                if (typeof (obj[nodeName].push) == "undefined") {
                    //convert existing object to array
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                //add a new entry to the array
                obj[nodeName].push(JsonXmlHelper.XmlToJson(item));
            }
        }
    }
    return obj;
};