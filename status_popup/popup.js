function getStyleFromStatus(intStatus) {
    switch (intStatus) {
        case 0:
            return "is-success";
        case 1:
            return "is-warning";
        case 2:
            return "is-danger";
        default:
            return "is-info";
    }
}

function removeStyleClasses(targetElement) {
    targetElement.classList.remove("is-success");
    targetElement.classList.remove("is-warning");
    targetElement.classList.remove("is-danger");
    targetElement.classList.remove("is-info");
}

function renderNewData(data, worstStatus) {
    console.log("Rendering data");
    const serviceTemplate = document.getElementById("service-template");

    const serviceContainer = document.getElementById("service-container");
    // Clear all current items in list
    serviceContainer.querySelectorAll("*").forEach(n => n.remove());

    // Construct new service DOM nodes
    for (const service of data.services) {
        let clonedServiceTemplate = serviceTemplate.content.cloneNode(true);
        clonedServiceTemplate.querySelector(".service-name").innerText = service.display_name;
        clonedServiceTemplate.querySelector(".service-ping").innerText = service.ping === -1 ? "N/A" : service.ping.toFixed(2);

        const serviceLink = clonedServiceTemplate.querySelector(".service-link");
        serviceLink.setAttribute("href", service.display_url);
        serviceLink.addEventListener("click", () => { serviceLinkClicked(service.display_url) });

        let serviceIcon;
        switch (service.status) {
            case 0:
                serviceIcon = "signal_cellular_4_bar";
                break;
            case 1:
                serviceIcon = "signal_cellular_connected_no_internet_4_bar";
                break;
            case 2:
                serviceIcon = "signal_cellular_off";
                break;
            default:
                serviceIcon = "signal_cellular_null";
        }
        clonedServiceTemplate.querySelector(".service-icon").innerText = serviceIcon;

        clonedServiceTemplate.querySelector(".status-inner").classList.add(getStyleFromStatus(service.status));

        serviceContainer.appendChild(clonedServiceTemplate);
    }

    // Calculate when was the last healthcheck
    let healthcheckTime = new Date(data.timestamp * 1000);
    let lastUpdatedString = getNiceTime(healthcheckTime, new Date(), 1, true);
    // Update text on page
    document.getElementById("hc-timestamp").innerText = lastUpdatedString;

    const hero = document.querySelector(".hero");
    removeStyleClasses(hero);
    hero.classList.add(getStyleFromStatus(worstStatus));

}

function serviceLinkClicked(targetUrl) {
    console.log(targetUrl)
    chrome.tabs.create({
        url: targetUrl,
        active: true
    });
}

function requestNewCheck() {
    chrome.runtime.sendMessage({ msgType: "request_new_check" });
}

function getNewData() {
    chrome.runtime.sendMessage({ msgType: "get_new_data" });
}

chrome.storage.local.get(["latestData", "worstStatus"], (result) => {
    if (result.latestData == undefined || result.worstStatus == undefined) {
        return;
    }
    renderNewData(result.latestData, result.worstStatus);
});

document.getElementById("refresh-button").addEventListener("click", getNewData);
document.getElementById("recheck-button").addEventListener("click", requestNewCheck);


function createRipple(event) {
    const button = event.currentTarget;

    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - (button.offsetLeft + radius)}px`;
    circle.style.top = `${event.clientY - (button.offsetTop + radius)}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];

    if (ripple) {
        ripple.remove();
    }

    button.appendChild(circle);
}

const buttons = document.querySelectorAll("button.does-ripple");
for (const button of buttons) {
    button.addEventListener("click", createRipple);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message.hasOwnProperty("msgType")) {
        return;
    }

    switch (message.msgType) {
        case "render_new_data":
            console.log("Received message render_new_data");
            renderNewData(message.data, message.worstStatus);
            break;
        default:
    }
})


/**
 * Function to print date diffs.
 * 
 * @param {Date} fromDate: The valid start date
 * @param {Date} toDate: The end date. Can be null (if so the function uses "now").
 * @param {Number} levels: The number of details you want to get out (1="in 2 Months",2="in 2 Months, 20 Days",...)
 * @param {Boolean} prefix: adds "in" or "ago" to the return string
 * @return {String} Diffrence between the two dates.
 */
function getNiceTime(fromDate, toDate, levels, prefix) {
    var lang = {
            "date.past": "{0} ago",
            "date.future": "in {0}",
            "date.now": "now",
            "date.year": "{0} year",
            "date.years": "{0} years",
            "date.years.prefixed": "{0} years",
            "date.month": "{0} month",
            "date.months": "{0} months",
            "date.months.prefixed": "{0} months",
            "date.day": "{0} day",
            "date.days": "{0} days",
            "date.days.prefixed": "{0} days",
            "date.hour": "{0} hour",
            "date.hours": "{0} hours",
            "date.hours.prefixed": "{0} hours",
            "date.minute": "{0} minute",
            "date.minutes": "{0} minutes",
            "date.minutes.prefixed": "{0} minutes",
            "date.second": "{0} second",
            "date.seconds": "{0} seconds",
            "date.seconds.prefixed": "{0} seconds",
        },
        langFn = function(id, params) {
            var returnValue = lang[id] || "";
            if (params) {
                for (var i = 0; i < params.length; i++) {
                    returnValue = returnValue.replace("{" + i + "}", params[i]);
                }
            }
            return returnValue;
        },
        toDate = toDate ? toDate : new Date(),
        diff = fromDate - toDate,
        past = diff < 0 ? true : false,
        diff = diff < 0 ? diff * -1 : diff,
        date = new Date(new Date(1970, 0, 1, 0).getTime() + diff),
        returnString = '',
        count = 0,
        years = (date.getFullYear() - 1970);
    if (years > 0) {
        var langSingle = "date.year" + (prefix ? "" : ""),
            langMultiple = "date.years" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (years > 1 ? langFn(langMultiple, [years]) : langFn(langSingle, [years]));
        count++;
    }
    var months = date.getMonth();
    if (count < levels && months > 0) {
        var langSingle = "date.month" + (prefix ? "" : ""),
            langMultiple = "date.months" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (months > 1 ? langFn(langMultiple, [months]) : langFn(langSingle, [months]));
        count++;
    } else {
        if (count > 0)
            count = 99;
    }
    var days = date.getDate() - 1;
    if (count < levels && days > 0) {
        var langSingle = "date.day" + (prefix ? "" : ""),
            langMultiple = "date.days" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (days > 1 ? langFn(langMultiple, [days]) : langFn(langSingle, [days]));
        count++;
    } else {
        if (count > 0)
            count = 99;
    }
    var hours = date.getHours();
    if (count < levels && hours > 0) {
        var langSingle = "date.hour" + (prefix ? "" : ""),
            langMultiple = "date.hours" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (hours > 1 ? langFn(langMultiple, [hours]) : langFn(langSingle, [hours]));
        count++;
    } else {
        if (count > 0)
            count = 99;
    }
    var minutes = date.getMinutes();
    if (count < levels && minutes > 0) {
        var langSingle = "date.minute" + (prefix ? "" : ""),
            langMultiple = "date.minutes" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (minutes > 1 ? langFn(langMultiple, [minutes]) : langFn(langSingle, [minutes]));
        count++;
    } else {
        if (count > 0)
            count = 99;
    }
    var seconds = date.getSeconds();
    if (count < levels && seconds > 0) {
        var langSingle = "date.second" + (prefix ? "" : ""),
            langMultiple = "date.seconds" + (prefix ? ".prefixed" : "");
        returnString += (count > 0 ? ', ' : '') + (seconds > 1 ? langFn(langMultiple, [seconds]) : langFn(langSingle, [seconds]));
        count++;
    } else {
        if (count > 0)
            count = 99;
    }
    if (prefix) {
        if (returnString == "") {
            returnString = langFn("date.now");
        } else if (past)
            returnString = langFn("date.past", [returnString]);
        else
            returnString = langFn("date.future", [returnString]);
    }
    return returnString;
}