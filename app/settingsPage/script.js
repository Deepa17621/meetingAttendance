let toggle = document.getElementById("toggle");
let variableName = "attendanceforcrmmeetings__Distance_Restriction_Flag";
let connectorName = "attendanceforcrmmeetings";
let currentUser, locale, locale_code, langObj;

// Elements
let SETTINGS_heading = document.querySelector("#SETTINGS_heading");
let SETTINGS_row1_content = document.querySelector("#SETTINGS_row1_content");
let SETTINGS_row2_content = document.querySelector("#SETTINGS_row2_content");
let SETTINGS_NOTE_heading = document.querySelector("#SETTINGS_NOTE_heading");
let SETTINGS_NOTE_row1 = document.querySelector("#SETTINGS_NOTE_row1");
let SETTINGS_NOTE_row2 = document.querySelector("#SETTINGS_NOTE_row2");

let elementsArray = [SETTINGS_heading, SETTINGS_row1_content, SETTINGS_row2_content, SETTINGS_NOTE_heading, SETTINGS_NOTE_row1, SETTINGS_NOTE_row2 ]

ZOHO.embeddedApp.on("PageLoad", async function (data) {
    showLoader();
    let distanceRestriction = await getVariables();
    try {
        await new Promise(r => setTimeout(r, 150));

        currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
        locale = await currentUser.users[0].locale;
        locale_code = await currentUser.users[0].locale_code;
        console.log(locale);
        console.log(locale_code);
        

        if (locale_code.startsWith("en")) {
            let res = await fetch("../translations/en.json");
            langObj = await res.json();
        }
        else if (locale_code.startsWith("zh")) {
            let res = await fetch("../translations/zh.json");
            langObj = await res.json();
        }
        console.log(langObj);
        
        if (langObj) {
            elementsArray.forEach(ele => {
                ele.textContent = langObj[ele.id];
                console.log(ele.textContent);
                
            });
        }
         hideLoader();
    } catch (error) {

    }
     hideLoader();
    toggle.checked = (distanceRestriction.details.output == "true") ? true : false;

    toggle.addEventListener("change", async () => {
        let currentState = toggle.checked;
        let d = await updateState(currentState ? true : false);
    });
    hideLoader();
});

async function updateState(currentState) {
    try {
        var req_data = {
            "arguments": JSON.stringify({
                "current_state": currentState
            })
        };
        let func_name = "attendanceforcrmmeetings__updatevariable";
        let updateCurrentState = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
        if (updateCurrentState.status_code == 200) {
            showToast(langObj["toast-distance-restriction-enable"], "green");
            return updateCurrentState;
        }
    } catch (error) {

    }

}
async function getVariables() {
    var req_data = {};
    let func_name = "attendanceforcrmmeetings__getdistancerestrictionflag";
    currentStateOfDistanceRestriction = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
    return currentStateOfDistanceRestriction
}

function showToast(message, color) {
    // Remove previous toast if still visible
    if (activeToast) {
        activeToast.hideToast(); // Toastify provides this method
        activeToast = null;
    }

    // Create new toast and store reference
    activeToast = Toastify({
        text: message,
        duration: 6000,
        gravity: "top",
        position: "center",
        backgroundColor: color,
        stopOnFocus: true,
        color: "black",
    });
    activeToast.showToast();
}

function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "flex";
}

function hideLoader() {
    document.getElementById("loader").style.display = "none";
}
ZOHO.embeddedApp.init();