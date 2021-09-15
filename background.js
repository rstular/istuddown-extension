import { SUCCESS_ICON, WARNING_ICON, ERROR_ICON, DEFAULT_ICON } from "./js/icons.js";

chrome.alarms.create("update_health", {
    delayInMinutes: 0,
    periodInMinutes: 0.5
})

function updateHealth() {
    console.log("Updating health");
    fetch("https://istudelftdown.com/api/v1/healthcheck/latest/short/")
        .then(response => response.json())
        .then(data => {

            console.log("Received API response");

            // Log worst encountered status - to change Hero
            let worstStatus = 0;
            for (const service of data.services) {
                if (worstStatus < 1 && service.status === 1) {
                    worstStatus = 1;
                } else if (worstStatus < 2 && service.status == 2) {
                    worstStatus = 2;
                }
            }

            chrome.storage.local.set({ latestData: data, worstStatus });

            switch (worstStatus) {
                case 0:
                    chrome.action.setIcon({ path: SUCCESS_ICON });
                    chrome.action.setTitle({ title: "All services are up" });
                    break;
                case 1:
                    chrome.action.setIcon({ path: WARNING_ICON });
                    chrome.action.setTitle({ title: "Some services are degraded" });
                    break;
                case 2:
                    chrome.action.setIcon({ path: ERROR_ICON });
                    chrome.action.setTitle({ title: "Some services are down" });
                    break;
                default:
                    chrome.action.setIcon({ path: DEFAULT_ICON });
                    chrome.action.setTitle({ title: "Something weird is going on" });
            }

            chrome.runtime.sendMessage({ msgType: "render_new_data", data, worstStatus });
        })
        .catch(error => {
            console.error(error);

            chrome.action.setIcon({ path: DEFAULT_ICON });
            chrome.action.setTitle({ title: "Could not fetch healthcheck data" });

            chrome.storage.local.get(["latestData"], (result) => {
                if (result.latestData == undefined) {
                    return;
                }
                chrome.runtime.sendMessage({
                    msgType: "render_new_data",
                    data: result.latestData,
                    worstStatus: 3
                });
            });

        })
}

function requestNewData() {
    fetch("https://istudelftdown.com/api/v1/healthcheck/", { method: "POST" })
        .then(updateHealth)
        .catch(error => {
            console.error(error);
        })
}

function openUrlInTab(targetUrl, active = true) {
    chrome.tabs.create({
        url: targetUrl,
        active
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm received");
    switch (alarm.name) {
        case "update_health":
            updateHealth();
            break;
        default:
            console.warn("Unknown alarm received: ", alarm.name);
    }
});

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (!message.hasOwnProperty("msgType")) {
            return;
        }

        switch (message.msgType) {
            case "get_new_data":
                console.log("Received message get_new_data");
                updateHealth();
                break;
            case "request_new_check":
                console.log("Received message request_new_check");
                requestNewData();
                break;
            case "open_url":
                console.log("Received message open_url");
                openUrlInTab(message.targetUrl, message.tabActive);
                break;
            default:
                console.warn("Unknown message received: ", message);
        }
    }
)