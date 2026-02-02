let toggle = document.getElementById("toggle");
let variableName = "attendanceforcrmmeetings__Distance_Restriction_Flag";
let connectorName = "attendanceforcrmmeetings"

ZOHO.embeddedApp.on("PageLoad", async function (data) {
    let distanceRestriction = await getVariables();
    toggle.checked = (distanceRestriction.details.output == "true") ? true : false;

    toggle.addEventListener("change", async() => {
        let currentState  = toggle.checked;
        let d = await updateState(currentState ? true:false);
    });
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

ZOHO.embeddedApp.init();