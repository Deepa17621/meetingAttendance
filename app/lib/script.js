let connectorName = "attendanceforcrmmeetings";

export async function getVariables(fieldName) {
    var req_data = {
        "arguments": JSON.stringify({
            "fieldName": fieldName,
        })
    };
    let func_name = "attendanceforcrmmeetings__getdistancerestrictionflag";
    let variableRes = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
    return variableRes
}

export async function updateVariable(fieldValue, fieldAPIName) {
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