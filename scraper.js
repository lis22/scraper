/**
 *  Treehouse Full Stack Javascript Tech Degree
 *  Project #6: Build A Content Scraper + EXTRA CREDIT
 *  Author: lis22
 *  Date: Dec 11, 2016
 */

"use strict";
const xray = require("x-ray");
const csv = require("fast-csv");
const fs = require("fs");
const util = require("util");
const urlToScrape = "http://shirts4mike.com";

checkDir("./data");

/**
 * checkDir(): Accesses directory and if it does not exist,
 * it calls to create it.
 * @param dir: directory to check existence of
 */
function checkDir(dir) {
    fs.access(dir, function (err) {
        if(err && err.code === "ENOENT") {
            createDir(dir);
        }
        else if (err)
            logToFile("Error accessing directory: " + dir);
    });
}

/**
 * createDir(): creates directory passed into it
 * @param dir: dir to be created
 */
function createDir(dir) {
    fs.mkdir(dir, function (err) {
        if (err)
            logToFile("Error making directory: " + dir);
    });
}

/**
 * scraperRequest(): Uses xray to scrape info from a page
 * @param url: url to be scraped
 * @param scope: scope to the selector
 * @param selector: selects the page element(s) to be scraped and saved
 * @return {Promise}
 */
function scraperRequest(url, scope, selector) {
    let scraper = xray({
        filters: {
            slice: function (value, start, end) {
                return value.slice(start, end);
            },
        }
    });

    return new Promise(function(resolve, reject) {
        scraper(url, scope, selector) (function(err, response) {
            let d = new Date();
            if(err) {
                reject(err);
            }
            else {
                if (typeof(response[0]) === "object") {
                    response[0].Url = url;
                    response[0].Time = d.toLocaleTimeString();
                }
                resolve(response);
            }
        });
    });
}

/**
 * A chain of scraper requests, .then called when promise is returned successfully
 * returns value to next promise as an argument until the product data is retrieved
 * If there is an error at anytime it is caught in the catch.
 */
scraperRequest(urlToScrape, ".nav .shirts", "a@href")
    .then(function(urlCatalog) {
        return scraperRequest(urlCatalog, ".products li", ["a@href"]);
    })
    .then(function(productUrlsArr) {
        /**
         * @function getScraperRequestArray: creates an array of calls
         * to scraperRequest() It is used with Promise.all
         * @param productUrlsArr: each individual item url
         */
        let getScraperRequestArray = function(productUrlsArr) {
            let scope = ".section";
            let selector = [{
                Title: ".shirt-details h1 | slice: 4",
                Price: ".shirt-details .price",
                ImageUrl: ".shirt-picture img@src",}];

            return scraperRequest(productUrlsArr, scope, selector);
        };
        return Promise.all(productUrlsArr.map(getScraperRequestArray));
    })
    .then(function(productDataArr) {
         //needs to flatten array because each product object is in its own array
         //which is then in an outer array from the promise.all
        createCSVFile(productDataArr.reduce(function(i, j) {
            return i.concat(j);
        }, []), "./data");
    })
    .catch(function(err) {
        if (err.code == "EAI_AGAIN")
            logToFile("Could not resolve host name for " + urlToScrape +
                " Please check your internet connection.");
        else
            logToFile("Error during scraping process.");
    });

/**
 * createCSVFile(): Uses fast-csv to create a CSV file.
 * The file is named in this format: 2016-11-21.csv
 * The file has Title, Price, ImageURL, URL, and Time for each product
 * @param data: array of product details
 * @param dir: directory file will be created in
 */
function createCSVFile(data, dir) {
    let date = new Date();
    let writeStream = fs.createWriteStream(dir + "/" + date.getFullYear() + "-" +
        (date.getMonth() + 1) + "-" + date.getDate() + ".csv");
    csv.write(data, {headers: true}).pipe(writeStream);
}

/**
 * logToFile: EXTRA CREDIT log errors to file called scraper-error.log
 * Append to the bottom of the file with a time stamp and error
 * e.g. [Tue Feb 16 2016 10:02:12 GMT-0800 (PST)] <error message>
 * Tested by disconnecting internet connection
 * @param message: message to log to file
 */
function logToFile(message) {
    let writeStream = fs.createWriteStream("scraper-error.log", {flags: "a"});
    let date = new Date();
    writeStream.write("[" + date.toString() + "] <" + util.format(message) + ">\n");
}

