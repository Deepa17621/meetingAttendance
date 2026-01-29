let checkOutBtn = document.querySelector(".check-out-btn");
let meetingStatus = document.querySelector(".status");

let meeting_title = document.querySelector(".title-value");
let meeting_time = document.querySelector(".time-value");
let meeting_venue = document.querySelector(".venue-value");
let check_In_Time = document.querySelector(".checkIn-time-value");
let Check_Out_Time = document.querySelector(".checkOut-time-value");

let pendingProgressCircle = document.querySelector(".progress-pending");
let activeProgressCircle = document.querySelector(".progress-active");
let successProgressCircle = document.querySelector(".progress-success");

let toastVisible = false;

let detailsRow = document.querySelectorAll(".detail-row");
detailsRow = [...detailsRow];
let stageText = document.querySelectorAll(".txt");
stageText = [...stageText];
let chinese, is_English;

function showLoader() {
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "flex";
}

function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

function dynamicContent(statusContent, btnContent, langObject, stage, status) {
    checkOutBtn.disabled = false;
    checkOutBtn.style.cursor = "pointer";

    meetingStatus.id = statusContent;
    meetingStatus.innerHTML = langObject[statusContent];
    checkOutBtn.id = btnContent;
    checkOutBtn.textContent = langObject[btnContent];

    meetingStatus.classList.add(status);
    checkOutBtn.classList.add(status);

    if (stage === "Check-out-success") {
        activeProgressCircle.classList.add("success");
        pendingProgressCircle.classList.add("success");
        successProgressCircle.classList.add("success");
    } else if (stage === "VISITED" && stage != "Check-out-success") {
        pendingProgressCircle.classList.add("success");
        activeProgressCircle.classList.add("success");
        successProgressCircle.classList.add("pending");
    } else {
        activeProgressCircle.classList.add("pending");
        pendingProgressCircle.classList.add("pending");
        successProgressCircle.classList.add("pending");
    }
}

function calculateDistance(currentLocation, targetLocation) {
    let lat1 = currentLocation.coords.latitude;
    let lon1 = currentLocation.coords.longitude;
    // targetLocation = JSON.parse(targetLocation);

    // let lat2 = targetLocation.latitude;
    // let lon2 = targetLocation.longitude;

    let lat2 = targetLocation.lat;
    let lon2 = targetLocation.lng;

    const R = 6371e3; // meters
    const DEG_TO_RAD = Math.PI / 180;

    const lat1Rad = lat1 * DEG_TO_RAD;
    const lat2Rad = lat2 * DEG_TO_RAD;
    const deltaLat = (lat2 - lat1) * DEG_TO_RAD;
    const deltaLon = (lon2 - lon1) * DEG_TO_RAD;

    const sinDeltaLat = Math.sin(deltaLat / 2);
    const sinDeltaLon = Math.sin(deltaLon / 2);

    const a = sinDeltaLat * sinDeltaLat +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        sinDeltaLon * sinDeltaLon;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
let meetingDetails, currentUser, orgDetails, locale, locale_code, langObj, checkInStatus, checkOutTime, checkInTime, givenLocation, endTime, baiduMap, d;

// Page Load
ZOHO.embeddedApp.on("PageLoad", async function (data) {
    showLoader();
    checkOutBtn.disabled = true;
    checkOutBtn.style.cursor = "not-allowed";
    try {
        await new Promise(r => setTimeout(r, 150));

        currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();

        locale = await currentUser.users[0].locale;
        locale_code = await currentUser.users[0].locale_code;

        if (locale.startsWith("en")) {
            let res = await fetch("../translations/en.json");
            langObj = await res.json();
        }
        else if (locale.startsWith("zh")) {
            let res = await fetch("../translations/zh.json");
            langObj = await res.json();
        }
        if (langObj) {
            stageText.forEach(stage => {
                stage.textContent = langObj[stage.id];
            });
            detailsRow.forEach(row => {
                let firstTd = row.querySelector("td:first-child");
                if (firstTd) {
                    firstTd.textContent = langObj[firstTd.id];
                }
            });
        }

        // 1. Get Meeting Record Details
        let meetingRecordConfig = {
            Entity: "Events",
            approved: "both",
            RecordID: data.EntityId[0],
        };

        meetingDetails = await ZOHO.CRM.API.getRecord(meetingRecordConfig);
        orgDetails = await ZOHO.CRM.CONFIG.getOrgInfo();

        checkInStatus = meetingDetails.data[0].Check_In_Status;
        checkOutTime = meetingDetails.data[0].attendanceforcrmmeetings__Checkout_Time;
        checkInTime = meetingDetails.data[0].Check_In_Time;

        givenLocation = meetingDetails.data[0].Venue;
        endTime = meetingDetails.data[0].End_DateTime;

        meeting_title.textContent = meetingDetails.data[0].Event_Title;
        meeting_time.textContent = formatDateRange(getTimeToDisplay(meetingDetails.data[0].Start_DateTime, orgDetails.org[0].time_zone), getTimeToDisplay(meetingDetails.data[0].End_DateTime, orgDetails.org[0].time_zone));
        meeting_venue.textContent = givenLocation ? givenLocation : langObj["loc-not-specified"];
        check_In_Time.textContent = checkInTime ? getTimeToDisplay(meetingDetails.data[0].Check_In_Time, orgDetails.org[0].time_zone) : langObj["yet-to-check-in"];
        Check_Out_Time.textContent = checkOutTime ? getTimeToDisplay(checkOutTime, orgDetails.org[0].time_zone) : langObj["yet-to-check-out"];

        if (checkInStatus === "VISITED" && !checkOutTime) {
            activeProgressCircle.style.setProperty("--after-animation", "pulse 1.5s infinite");
            activeProgressCircle.style.setProperty("--after-border", "1px solid #2563eb");
            dynamicContent("actual-status-check-out-pending", "button-pending", langObj, "VISITED", "active");
        }
        else if (checkInStatus === "PLANNED") {
            dynamicContent("actual-status-check-in-pending", "button-pending", langObj, "PLANNED", "pending");
        }
        else if (checkOutTime != null) {
            checkOutBtn.classList.add("out");
            dynamicContent("actual-status-already-done", "button-success", langObj, "Check-out-success", "success");
        }
        hideLoader();
    } catch (error) {
        console.log(error);
    }
    hideLoader();

    // 2. Detect Platform - from Where Button is Accessed.
    // let detectPlatform = function detectPlatform() {
    //   const ua = navigator.userAgent.toLowerCase();
    //   if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("zoho") ) {
    //     return "mobile";
    //   } else if (/ZohoCRM_Desktop|Electron/i.test(ua)) {
    //     return "desktop";
    //   } else {
    //     return "web";
    //   }
    // };
    // let platform = detectPlatform();

    // if (platform === "mobile") {
    // 3. Check Checked In Or Not
    if (checkInStatus === "VISITED" && !checkOutTime) {

        checkOutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const currentDate = new Date();
            const endingTime = new Date(endTime);

            // if (currentDate > endingTime) {
            const originalText = checkOutBtn.innerHTML;
            checkOutBtn.id = "button-in-progress";
            checkOutBtn.textContent = langObj["button-in-progress"];
            checkOutBtn.disabled = true;

            let formattedCheckOutTime = getCurrentTimeInIST(currentDate, orgDetails.org[0].time_zone);

            let durationTime = function durationsTime() {
                const inTime = new Date(checkInTime);
                const outTime = new Date(currentDate);

                const duration = outTime - inTime;

                const inSeconds = duration / 1000;

                const inMinutes = Math.floor(inSeconds / 60);
                const hours = Math.floor(duration / (1000 * 60 * 60));
                const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

                if (inMinutes >= 60) {
                    return `${hours} hours ${minutes} minutes`;
                } else if (inMinutes > 0 && inMinutes < 60) {
                    return `${inMinutes} minutes`;
                }
                else {
                    return `${inSeconds} seconds`;
                }
            }

            let duration = durationTime();

            function getPointWrapper(address) {
                return new Promise((resolve, reject) => {
                    try {
                        const myGeo = new BMapGL.Geocoder();
                        myGeo.getPoint(address, function (point) {
                            if (point) {
                                resolve(point);
                            } else {
                                reject(point);
                            }
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            }

            async function geoCodeTheLocation(loc) {
                try {
                    let point = await getPointWrapper(loc);
                    return point;
                } catch (err) {
                    return err;
                }
            }

            // i. Check the Location Language

            let geoCode_OfGivenLocation;

            if (givenLocation) {
                const sanitized = sanitizeInput(givenLocation);
                chinese = isChinese(sanitized);
                is_English = isEnglish(sanitized);

                if (chinese) {
                    geoCode_OfGivenLocation = await geoCodeTheLocation(givenLocation);
                    let re = await reverseLocBaiduResponse(geoCode_OfGivenLocation.lon, geoCode_OfGivenLocation.lat);
                    let validated = validateGeocode(geoCode_OfGivenLocation);
                    if (validated.status === "LOW_CONFIDENCE") {
                        return { suggestions: geo.matches };
                    }
                }
                else if (isEnglish(sanitized)) {
                    var req_data = {
                        "arguments": JSON.stringify({
                            "location": givenLocation
                        })
                    };

                    let func_name = "attendanceforcrmmeetings__getlocation";
                    let zohoMapsResponse = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);

                    if (zohoMapsResponse.details.output != "") {
                        let parsedDATA = JSON.parse(zohoMapsResponse.details.output);
                        geoCode_OfGivenLocation = { "lat": parsedDATA.lat, "lon": parsedDATA.lon };
                        let re = await reverseLocBaiduResponse(geoCode_OfGivenLocation.lon, geoCode_OfGivenLocation.lat);
                    }

                }
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async function (position) {
                    try {
                        if (!givenLocation) {
                            await checkOutProcess(position, formattedCheckOutTime, data, duration, currentUser);
                        }
                        else if (givenLocation) {
                            // if (geoCode_OfGivenLocation !== null) {
                            //     let distance = calculateDistance(position, geoCode_OfGivenLocation);
                            //     if (distance <= 2000) {
                            await checkOutProcess(position, formattedCheckOutTime, data, duration, currentUser);
                            //     }
                            //     else {
                            //         showToast(langObj["toast-location-not-in-boundry"], "red");
                            //         btnBackToAction();
                            //     }
                            // }
                            // else {
                            //     showToast("Unable to Geocode!", "red");
                            //     btnBackToAction();
                            // }

                        }
                    } catch (err) {
                        showToast(langObj["toast-unexpected-error"], "red");
                        btnBackToAction();
                    } finally {
                        checkOutBtn.disabled = false;
                    }
                });
            } else {
                checkOutBtn.innerHTML = originalText;
                showToast(langObj["toast-geolocation-not-supported"], "red");
                btnBackToAction()
            }
            // }
            // else {
            //     showToast(langObj["toast-meeting-not-ended"], "#eed202");

            //     btnBackToAction();
            // }

        });
    }
    else if (checkInStatus === "PLANNED") {
        meetingStatus.classList.add("error");
        showToast(langObj["toast-checkin-warning"], "#eed202");
        showError();
        return;
    } else if (checkOutTime != null) {
        showToast(langObj["toast-already-checked-out"], "red");
        meetingStatus.classList.add("success");
        checkOutBtn.classList.add("out");
        successProgressCircle.classList.add("success");
        return;
    }
    else {
        showToast(langObj["toast-error-contact-support"], "red");
        btnBackToAction();
        return;
    }
    // } else {
    //   showToast("This Button Action is allowed only in mobile app", "red");
    //   showError();
    //   return;
    // }
});

async function checkOutProcess(position, formattedCheckOutTime, data, duration, currentUser) {
    // let reverseLocation = await reverseGeocode(position.coords.latitude, position.coords.longitude);
    let reverseLocation;
    if (chinese) {
        reverseLocation = await reverseLocBaiduResponse(position.coords.longitude, position.coords.latitude);
    }
    else if (isEnglish) {
        var req_data = {
            "arguments": JSON.stringify({
                "location": {
                    "lat": position.coords.latitude,
                    "lon": position.coords.longitude
                }
            })
        };

        let func_name = "attendanceforcrmmeetings__reversegeocode";
        let zohoMapsResponse = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
        reverseLocation = JSON.parse(zohoMapsResponse.details.output);
    }

    if (reverseLocation !== null) {
        let updateRecord = await updateMeetingRecord(reverseLocation, formattedCheckOutTime, data, position, duration, currentUser);
        meetingStatus.classList.add("success");
        if (updateRecord) {
            successProgressCircle.style.backgroundColor = "#16a34a";
            Check_Out_Time.textContent = getTimeToDisplay(formattedCheckOutTime, orgDetails.org[0].time_zone);

            meetingStatus.id = "actual-status-success";
            meetingStatus.textContent = langObj["actual-status-success"];
            activeProgressCircle.style.setProperty("--after-animation", "");
            activeProgressCircle.style.setProperty("--after-border", "");
            checkOutBtn.classList.add("out");
            showToast(langObj["toast-checkout-success"], "green");
        } else {
            showToast(langObj["toast-details-update-failed"], "red");
            btnBackToAction();
        }
    } else {
        showToast(langObj["toast-reverse-geocode-failed"], "red");
        btnBackToAction()
    }
}

// async function reverseGeocode(lat, lng) {
//     // const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

//     // let response = await fetch(url);
//     // if (response.status == 200) {
//     //     let data = await response.json();
//     //     return data;
//     // } else {
//     //     showToast(response.statusText, "red");
//     //     return false;
//     // }
// }

function reverseLocationBaidu(lng, lat) {
    return new Promise((resolve, reject) => {
        try {
            const myGeo = new BMapGL.Geocoder();
            myGeo.getLocation(new BMapGL.Point(lng, lat), function (loc) {
                if (loc) {
                    resolve(loc);
                } else {
                    reject(loc);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function reverseLocBaiduResponse(lng, lat) {
    try {
        let location = await reverseLocationBaidu(lng, lat);
        return location;
    } catch (err) {
        return err;
    }
}
function formatDateRange(start, end) {
    const [startTime, startDate] = start.split(", ");
    const [endTime, endDate] = end.split(", ");

    if (startDate === endDate) {
        // Same date → merge
        return `${startTime} - ${endTime}, ${startDate}`;
    } else {
        // Different dates → keep both
        return `${startTime}, ${startDate} - ${endTime}, ${endDate}`;
    }
}

async function updateMeetingRecord(location, time, currentRecord, position, durationTime, currentUser) {

    // let locationObjectKeys = Object.keys(location.address ? location.address : location.label);
    // console.log(locationObjectKeys);

    // let keys = locationObjectKeys.slice(0, 3);
    // const matchingKeys = keys.filter((key) =>
    //     key.toLowerCase().startsWith("sub")
    // );
    // let city, subLocality;
    // if (location.address.city) {
    //     city = location.address.city;
    //     subLocality = location.address[matchingKeys[0]];
    // } else {
    //     city = location.address.town;
    //     subLocality = location.address[matchingKeys[0]];
    // }
    let extensionConfig, fullAddress;
    if (chinese) {
        fullAddress = location.address;
        extensionConfig = {
            Entity: "Events",
            APIData: {
                id: currentRecord.EntityId[0],
                attendanceforcrmmeetings__Checkout_City: location.addressComponents.city,
                attendanceforcrmmeetings__Checkout_Country: location.content.address_detail.country,
                attendanceforcrmmeetings__Checkout_State: location.addressComponents.province,
                attendanceforcrmmeetings__Checkout_Address: location.address,
                attendanceforcrmmeetings__Checkout_Latitude: position.coords.latitude.toString(),
                attendanceforcrmmeetings__Checkout_Longitude: position.coords.longitude.toString(),
                attendanceforcrmmeetings__Checkout_Zipcode: location.address.postcode,
                attendanceforcrmmeetings__Checkout_Time: time.toString(),
                attendanceforcrmmeetings__Check_out_Sub_Locality: location.content.address_detail.town,
                attendanceforcrmmeetings__Meeting_Duration: durationTime,
                attendanceforcrmmeetings__Checkout_By: currentUser.users[0].full_name,
            },
            Trigger: ["workflow"],
        };
    }
    if (is_English) {
        fullAddress = location.label;
        extensionConfig = {
            Entity: "Events",
            APIData: {
                id: currentRecord.EntityId[0],
                attendanceforcrmmeetings__Checkout_City: location.city,
                attendanceforcrmmeetings__Checkout_Country: location.country,
                attendanceforcrmmeetings__Checkout_State: location.state,
                attendanceforcrmmeetings__Checkout_Address: location.label,
                attendanceforcrmmeetings__Checkout_Latitude: position.coords.latitude.toString(),
                attendanceforcrmmeetings__Checkout_Longitude: position.coords.longitude.toString(),
                attendanceforcrmmeetings__Checkout_Zipcode: location.postal_code,
                attendanceforcrmmeetings__Checkout_Time: time.toString(),
                attendanceforcrmmeetings__Check_out_Sub_Locality: location.address_line2,
                attendanceforcrmmeetings__Meeting_Duration: durationTime,
                attendanceforcrmmeetings__Checkout_By: currentUser.users[0].full_name,
            },
            Trigger: ["workflow"],
        };
    }
    // FIELDS FROM EXTENSION
    // var extensionConfig = {
    //     Entity: "Events",
    //     APIData: {
    //         id: currentRecord.EntityId[0],
    //         attendanceforcrmmeetings__Checkout_City: location.addressComponents ? location.addressComponents.city : location.city,
    //         attendanceforcrmmeetings__Checkout_Country: location.content.address_detail.country ? location.content.address_detail.country : location.country,
    //         attendanceforcrmmeetings__Checkout_State: location.addressComponents.province ? location.addressComponents.province : location.state,
    //         attendanceforcrmmeetings__Checkout_Address: location.address ? location.address : location.label,
    //         attendanceforcrmmeetings__Checkout_Latitude: position.coords.latitude.toString(),
    //         attendanceforcrmmeetings__Checkout_Longitude: position.coords.longitude.toString(),
    //         attendanceforcrmmeetings__Checkout_Zipcode: location.address.postcode ? location.address.postcode : location.postal_code,
    //         attendanceforcrmmeetings__Checkout_Time: time.toString(),
    //         attendanceforcrmmeetings__Check_out_Sub_Locality: location.content?.address_detail?.town ? location.content.address_detail.town : location.address_line2,
    //         attendanceforcrmmeetings__Meeting_Duration: durationTime,
    //         attendanceforcrmmeetings__Checkout_By: currentUser.users[0].full_name,
    //     },
    //     Trigger: ["workflow"],
    // };
    let res = await ZOHO.CRM.API.updateRecord(extensionConfig);
   
    let notesContent = "Checked Out @" + fullAddress;

    var notesConfig = {
        Entity: "Notes",
        APIData: {
            Parent_Id: currentRecord.EntityId[0],
            Note_Content: notesContent,
            Note_Title: "",
            $se_module: "Events",
        },
        Trigger: ["workflow"],
    };

    let notesRes = await ZOHO.CRM.API.insertRecord(notesConfig);
    if (notesRes.data[0].code === "SUCCESS" && res.data[0].code === "SUCCESS") {
        return true;
    } else return false;
}

function getTimeToDisplay(isoString, locale) {
    const d = new Date(isoString);

    // Force consistent parts (don’t let locale decide the order)
    const options = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    };

    // Format for given timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        ...options,
        timeZone: locale
    });

    const parts = formatter.formatToParts(d);

    // Extract parts
    const hour = parts.find(p => p.type === "hour").value;
    const minute = parts.find(p => p.type === "minute").value;
    const day = parts.find(p => p.type === "day").value;
    const month = parts.find(p => p.type === "month").value;
    const year = parts.find(p => p.type === "year").value;
    const dayPeriod = parts.find(p => p.type === "dayPeriod").value.toUpperCase();

    return `${hour}:${minute} ${langObj[dayPeriod]}, ${day}-${month}-${year}`;
}

function getUTCOffsetFromTimeZone(timeZone, date = new Date()) {
    const f = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const parts = f.formatToParts(date).reduce((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
    }, {});

    // Construct local time in that zone as UTC
    const local = Date.UTC(
        parseInt(parts.year),
        parseInt(parts.month) - 1,
        parseInt(parts.day),
        parseInt(parts.hour),
        parseInt(parts.minute),
        parseInt(parts.second)
    );

    // Difference in minutes
    let diff = (local - date.getTime()) / 60000;
    diff = Math.round(diff);

    const sign = diff >= 0 ? "+" : "-";
    const abs = Math.abs(diff);
    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const minutes = String(abs % 60).padStart(2, "0");

    return `${sign}${hours}:${minutes}`;
}

function getCurrentTimeInIST(inp, timeZone) {
    const d = inp ? new Date(inp) : new Date();

    const options = {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    };

    const formatter = new Intl.DateTimeFormat("en-GB", options);
    const parts = formatter.formatToParts(d).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    const offSet = getUTCOffsetFromTimeZone(timeZone, d);

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offSet}`;
}

let activeToast = null;

function isChinese(text) {
    return /[\u4e00-\u9fff]/.test(text);
}

function isEnglish(text) {
    return /^[A-Za-z0-9\s,.-]+$/.test(text);
}

function sanitizeInput(text) {
    return text
        .trim()
        .replace(/[^\w\s\u4e00-\u9fff,.-]/g, "");
}

function validateGeocode(result) {
    if (!result || !result.lat || !result.lng) {
        throw new Error("Invalid geocoding result");
    }

    if (result.confidence && result.confidence < 0.7) {
        return { status: "LOW_CONFIDENCE", result };
    }

    return { status: "VALID", result };
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

function showError() {
    checkOutBtn.disabled = true;
    checkOutBtn.style.cursor = "not-allowed";
}

function btnBackToAction() {
    checkOutBtn.disabled = false;
    checkOutBtn.style.cursor = "pointer";
    checkOutBtn.textContent = langObj["btn-check-out-now"];
}