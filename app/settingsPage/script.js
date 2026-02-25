// import { updateVariable, getVariables } from "../lib/script";

let toggle = document.getElementById("toggle");
let timeRestrictionToggle = document.querySelector("#time-restriction-toggle");
let distance_restriction_flag = "attendanceforcrmmeetings__Distance_Restriction_Flag";
let distance_value = "attendanceforcrmmeetings__Distance";
let time_restriction_flag = "attendanceforcrmmeetings__TimeRestrictionOption";
let connectorName = "attendanceforcrmmeetings";
let currentUser, locale, locale_code, langObj;

let existingDistanceValue;

// Elements
let SETTINGS_heading = document.querySelector("#SETTINGS_heading");
let SETTINGS_row1_content = document.querySelector("#SETTINGS_row1_content");
let SETTINGS_row2_content = document.querySelector("#SETTINGS_row2_content");
let SETTINGS_NOTE_heading = document.querySelector("#SETTINGS_NOTE_heading");
let SETTINGS_NOTE_row1 = document.querySelector("#SETTINGS_NOTE_row1");
let SETTINGS_NOTE_row2 = document.querySelector("#SETTINGS_NOTE_row2");

let SETTINGS_Configure_Label = document.querySelector("#SETTINGS_Configure_Label");

let SETTINGS_Time_NOTE_heading = document.querySelector("#SETTINGS_Time_NOTE_heading");
let SETTINGS_Time_NOTE_row1 = document.querySelector("#SETTINGS_Time_NOTE_row1");
let SETTINGS_Time_NOTE_row2 = document.querySelector("#SETTINGS_Time_NOTE_row2");


let elementsArray = [SETTINGS_heading, SETTINGS_row1_content, SETTINGS_row2_content, SETTINGS_NOTE_heading, SETTINGS_NOTE_row1, SETTINGS_NOTE_row2, SETTINGS_Configure_Label, SETTINGS_Time_NOTE_heading,SETTINGS_Time_NOTE_row1, SETTINGS_Time_NOTE_row2];

ZOHO.embeddedApp.on("PageLoad", async function (data) {
    showLoader();
    let distanceRestriction = await getVariables(distance_restriction_flag);
    let configured_distance = await getVariables(distance_value);
    let ExistingTimeRestriction = await getVariables(time_restriction_flag);
    existingDistanceValue = configured_distance.details.output;

    // Time Based Restriction to Check-out
    timeRestrictionToggle.checked = (ExistingTimeRestriction.details.output == "true") ? true : false;

    // Distance Based Restrictions to check-out
    toggle.checked = (distanceRestriction.details.output == "true") ? true : false;

    if (distanceRestriction.details.output == "true") {
        document.querySelector(".SETTINGS_configure_distance").classList.remove("hidden");
        document.querySelector("#distanceValue").textContent = configured_distance.details.output + "km";
    }
    else {
        document.querySelector(".SETTINGS_configure_distance").classList.add("hidden");
    }
    try {
        await new Promise(r => setTimeout(r, 150));

        currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
        locale = await currentUser.users[0].locale;
        if (locale.startsWith("en")) {
            let res = await fetch("../translations/en.json");
            langObj = await res.json();
        }
        else if (locale.startsWith("zh")) {
            let res = await fetch("../translations/zh.json");
            langObj = await res.json();
        }

        if (langObj) {
            elementsArray.forEach(ele => {
                ele.textContent = langObj[ele.id];
            });
        }
        hideLoader();
    } catch (error) {

    }
    hideLoader();

    toggle.addEventListener("change", async () => {
        let currentState = toggle.checked;
        if (!currentState) {
            document.querySelector(".SETTINGS_configure_distance").classList.add("hidden");
        }
        else {
            document.querySelector(".SETTINGS_configure_distance").classList.remove("hidden");
        }
        let d = await updateVariable(currentState ? true : false, distance_restriction_flag);
        if(d.status_code == 200 && currentState){
            showToast(langObj["toast-distance-restriction-enable"], "rgb(30, 137, 230)");
        }
        else{
            showToast(langObj["toast-distance-restriction-disable"], "rgb(30, 137, 230)");
        }
    });

    timeRestrictionToggle.addEventListener("click", async(e)=>{
        let timeRestrictionFlag = timeRestrictionToggle.checked;
        let d = await updateVariable(timeRestrictionFlag ? true : false, time_restriction_flag);
        if(d.status_code == 200 && timeRestrictionFlag){
            showToast(langObj["toast-time-restriction-enable"], "rgb(30, 137, 230)");
        }
        else{
            showToast(langObj["toast-time-restriction-disable"], "rgb(30, 137, 230)");
        }
    })
});

document.querySelector(".distance-save").addEventListener("click", async (e) => {
    e.preventDefault();
    let distance = document.querySelector("#distance").value;
    if (!distance) {
        showToast(langObj["toast-distance-not-entered"], "red");
        return;
    }
    else if(distance >=11 || distance <=0){
        showToast(langObj["toast-distance-not-in-range"], "red");
        return;
    }
    else if(Number(distance) % 1 !== 0){
        showToast(langObj["toast-distance-decimal"], "red");
        return;
    }
    else {
        let updateVariableRes = await updateVariable(Number(distance), distance_value);
        let updatedValue = JSON.parse(updateVariableRes.response);

        if (updateVariableRes.status_code == 200) {
            showToast(langObj["toast-distance-updated"], "green");
            document.querySelector(".view-mode-wrapper").classList.remove("hidden");
            document.querySelector(".distance-edit-wrapper").classList.add("hidden");
            document.querySelector("#distanceValue").textContent = updatedValue["attendanceforcrmmeetings__Distance"];
            existingDistanceValue = updatedValue["attendanceforcrmmeetings__Distance"];
        }
    }

});
document.querySelector(".distance-cancel").addEventListener("click", async (e) => {
    e.preventDefault();
    document.querySelector(".view-mode-wrapper").classList.remove("hidden");
    document.querySelector(".distance-edit-wrapper").classList.add("hidden");
});

document.querySelector(".distance-edit").addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector(".distance-edit-wrapper").classList.remove("hidden");
    document.querySelector(".view-mode-wrapper").classList.add("hidden");
    document.querySelector("#distance").value = existingDistanceValue;
})

async function getVariables(fieldName) {
    var req_data = {
        "arguments": JSON.stringify({
            "fieldName": fieldName,
        })
    };
    let func_name = "attendanceforcrmmeetings__getdistancerestrictionflag";
    let variableRes = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
    return variableRes
}

async function updateVariable(fieldValue, fieldAPIName) {
    try {
        var req_data = {
            "arguments": JSON.stringify({
                "value": fieldValue,
                "fieldName": fieldAPIName
            })
        };
        let func_name = "attendanceforcrmmeetings__updatevariable";
        let updateCustomVariable = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
        let res = await JSON.parse(updateCustomVariable.details.output);
        if (res.status_code == 200) {
            return res;
        }
    } catch (error) {
        return error;
    }

}
let activeToast = null;
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