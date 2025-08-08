let checkoutBtn = document.querySelector(".checkout-btn");
let checkOutStatus = document.querySelector(".checkOutStatus");
let statusSpan = document.querySelector("#status");
let actualStatus = document.querySelector(".actual-status");


ZOHO.embeddedApp.on("PageLoad", async function (data) {
  // 1. Get Meeting Record Details
  let meetingRecordConfig = {
    Entity: "Events",
    approved: "both",
    RecordID: data.EntityId[0],
  };

  let meetingDetails = await ZOHO.CRM.API.getRecord(meetingRecordConfig);
  let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
  let orgDetails = await ZOHO.CRM.CONFIG.getOrgInfo();
  let locale = await currentUser.users[0].locale;

  let langObj;

  if(locale.startsWith("en")){
    let res = await fetch("../translations/en.json");
    langObj = await res.json();
  }
  else if(locale.startsWith("zh")){
    let res = await fetch("../translations/zh.json");
    langObj = await res.json();
  }

  let checkInStatus = meetingDetails.data[0].Check_In_Status;
  let checkOutTime = meetingDetails.data[0].meetingattendance__Checkout_Time;
  let checkInTime = meetingDetails.data[0].Check_In_Time;
  let givenLocation = meetingDetails.data[0].location;
  let endTime = meetingDetails.data[0].End_DateTime;

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

      // i. Check out Button - Event Listener
      actualStatus.id = "actual-status-check-out-pending";
      actualStatus.innerHTML = langObj["actual-status-check-out-pending"];
      checkoutBtn.id = "button-pending";
      checkoutBtn.textContent = langObj["button-pending"];  

      checkoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const currentDate = new Date();
      const time = currentDate.toLocaleString();
      const endingTime = new Date(endTime);
      
      if(time > endingTime.toLocaleString()){
      const originalText = checkoutBtn.innerHTML;
      checkoutBtn.id = "button-in-progress"
      checkoutBtn.textContent = langObj["button-in-progress"];
      checkoutBtn.disabled = "true";

      let formattedCheckOutTime = getCurrentTimeInIST(time, orgDetails.org[0].time_zone);
      let durationTime = function durationsTime() {
      const inTime = new Date(checkInTime);
      const outTime = new Date(time);

      const duration = outTime - inTime;

        const inSeconds = duration / 1000;
        const inMinutes = Math.floor(inSeconds / 60);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        if (inMinutes >= 60) {
          return `${hours} hours ${minutes} minutes`;
        } else if(inMinutes>0 && inMinutes <60){
          return `${inMinutes} minutes`;
        }
        else{
          return `${inSeconds} seconds`;
        }
      }
      let duration = durationTime();
      console.log(duration);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async function (position) {
          try {
            let reverseLocation = await reverseGeocode(position.coords.latitude, position.coords.longitude);
            console.log(reverseLocation);
            // Check the Distance between given Location and current Location
            let latLongGivenLocation = await meetingattendance__getlocation(givenLocation);
            
            console.log(latLongGivenLocation);
            let arunaMahal = await reverseGeocode(latLongGivenLocation.lat, latLongGivenLocation.lon);
            console.log(arunaMahal);
            
            return;
            //---------------------------------------------------------------
            if (reverseLocation !== false) {
              let updateRecord = await updateMeetingRecord(reverseLocation, formattedCheckOutTime, data, position, duration);
              console.log(updateRecord);
              
              checkOutStatus.classList.add("out");
              checkoutBtn.disabled = "true";
              checkoutBtn.id = "button-success";
              checkoutBtn.textContent = langObj["button-success"];
              checkoutBtn.style.cursor = "not-allowed";

              if (updateRecord) {
                actualStatus.id = "actual-status-success";
                actualStatus.innerHTML = langObj["actual-status-success"];
                showToast(langObj["toast-checkout-success"], "green");
                setTimeout(async () => {
                  await ZOHO.CRM.UI.Popup.close();
                }, 4000);
              } else {
                showToast(langObj["toast-details-update-failed"], "red");
                showError();
              }
            } else {
              showToast(langObj["toast-reverse-geocode-failed"], "red");
              showError();
            }
          } catch (err) {
            console.error("Error during checkout:", err);
            showToast(langObj["toast-unexpected-error"], "red");
            showError();
          } finally {
            checkoutBtn.disabled = "false";
          }
        });
  } else {
    showToast(langObj["toast-geolocation-not-supported"], "red");
    showError();
    // Reset button here too
    checkoutBtn.innerHTML = originalText;
    checkoutBtn.textContent = langObj["button-pending"]
    checkoutBtn.disabled = "false";
  }
}
else{
    showToast(langObj["toast-meeting-not-ended"], "#eed202");
}

});
    } else if (checkInStatus === "PLANNED") {
      checkOutStatus.classList.add("error");
      actualStatus.id = "actual-status-check-in-pending";
      actualStatus.innerHTML = langObj["actual-status-check-in-pending"];
      showToast(langObj["toast-checkin-warning"], "#eed202");
      showError();
      return;
    } else if (checkOutTime != null) {
      showToast(langObj["toast-already-checked-out"], "red");
      checkOutStatus.classList.add("out");
      actualStatus.id = "actual-status-already-done";
      actualStatus.innerHTML = langObj["actual-status-already-done"];
      checkoutBtn.disabled = "true";
      checkoutBtn.style.cursor = "not-allowed";
      checkoutBtn.id = "button-success";
      checkoutBtn.innerHTML = langObj["button-success"];
      let t = new Date(checkOutTime);
      showError();
      return;
    } else {
      showToast(langObj["toast-error-contact-support"], "red");
      showError();
      return;
    }
  // } else {
  //   showToast("This Button Action is allowed only in mobile app", "red");
  //   showError();
  //   return;
  // }
});
function locationError(params) {
  showToast("Could not get location: " + params.message, "red");
}

//  async function getCoordinatesFromPlace(placeName) {
//       const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`);
//       const data = await response.json();
//       if (data.length > 0) {
//         return {
//           lat: parseFloat(data[0].lat),
//           lon: parseFloat(data[0].lon),
//         };
//       } else {
//         throw new Error("Place not found");
//       }
//     }

function calculateDuration(time, checkInTime) {
  const inTime = new Date(checkInTime);
  const outTime = new Date(time);

  const duration = outTime - inTime;

  const inSeconds = duration / 1000;
  const inMinutes = Math.floor(inSeconds / 60);
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

  if (inMinutes >= 60) {
    return `${hours} hours ${minutes} minutes`;
  } else if(inMinutes >=1 && inMinutes <60){
    return `${inMinutes} minutes`;
  }
  else if(inMinutes<=0){
    return `${inSeconds} seconds`;
  }

}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  let response = await fetch(url);
  if (response.status == 200) {
    let data = await response.json();
    return data;
  } else {
    showToast(response.statusText, "red");
    return false;
  }
}
//Initializing the widget.
ZOHO.embeddedApp.init();

async function updateMeetingRecord(location,time,currentRecord,position,durationTime) {
  let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
  console.log(currentUser.users[0]);
  
  let locationObjectKeys = Object.keys(location.address);
  let keys = locationObjectKeys.slice(0, 3);
  const matchingKeys = keys.filter((key) =>
    key.toLowerCase().startsWith("sub")
  );
  let city, subLocality;
  if (location.address.city) {
    city = location.address.city;
    subLocality = location.address[matchingKeys[0]];
  } else {
    city = location.address.town;
    subLocality = location.address[matchingKeys[0]];
  }
  // FIELDS FROM EXTENSION
  var extensionConfig = {
    Entity: "Events",
    APIData: {
      id: currentRecord.EntityId[0],
      meetingattendance__Checkout_City: city,
      meetingattendance__Checkout_Country: location.address.country,
      meetingattendance__Checkout_State: location.address.state,
      meetingattendance__Checkout_Address: location.display_name,
      meetingattendance__Checkout_Latitude: position.coords.latitude.toString(),
      meetingattendance__Checkout_Longitude: position.coords.longitude.toString(),
      meetingattendance__Checkout_Zipcode: location.address.postcode,
      meetingattendance__Checkout_Time: time.toString(),
      meetingattendance__Check_out_Sub_Locality: subLocality,
      meetingattendance__Meeting_Duration: durationTime,
      meetingattendance__Checkout_By: currentUser.users[0].full_name,
    },
    Trigger: ["workflow"],
  };

  // CRM FIELDS
  // var config = {
  //   Entity: "Events",
  //   APIData: {
  //     id: currentRecord.EntityId[0],
  //     Checkout_city: city,
  //     Checkout_Country: location.address.country,
  //     Checkout_State: location.address.state,
  //     Checkout_Address: location.display_name,
  //     Checkout_Latitude: position.coords.latitude.toString(),
  //     Checkout_Longitude: position.coords.longitude.toString(),
  //     Checkout_Zipcode: location.address.postcode,
  //     Checkout_Time: time.toString(),
  //     Checkout_Sub_Locality: subLocality,
  //     Meeting_Duration: durationTime,
  //     Checkout_By: currentUser.users[0].full_name,
  //   },
  //   Trigger: ["workflow"],
  // };

  let res = await ZOHO.CRM.API.updateRecord(extensionConfig);

  let notesContent = "Checked Out @" + location.display_name;
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

function getCurrentTimeInIST(inp, tymZone) {
  const date = inp ? new Date(inp) : new Date();
  const offSet = getUTCOffsetFromTimeZone(tymZone)
  const options = {
    timeZone: tymZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offSet}`;
}
function getUTCOffsetFromTimeZone(timeZone) {
  const date = new Date();

  // Use the DateTimeFormat API to get the local time in the target timeZone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const timeInZone = parts.reduce((acc, part) => {
    if (part.type === "hour") acc.hour = part.value;
    if (part.type === "minute") acc.minute = part.value;
    if (part.type === "second") acc.second = part.value;
    return acc;
  }, {});

  // Create date string in UTC using current UTC date
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const utcSecond = date.getUTCSeconds();

  // Calculate offset in minutes
  const offsetMinutes =
    (parseInt(timeInZone.hour) - utcHour) * 60 +
    (parseInt(timeInZone.minute) - utcMinute);

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
}

function showToast(message, color) {
  Toastify({
    text: message,
    duration: 3000, // 3 seconds
    gravity: "top", // top or bottom
    position: "center", // left, center or right
    backgroundColor: color, // light green (tailwind-like)
    stopOnFocus: true, // pause on hover
    // close: true, // show close icon
    color: "black",
  }).showToast();
}

function showError() {
  checkoutBtn.disabled = "true";
  checkoutBtn.style.cursor = "not-allowed";
  setTimeout(async () => {
    await ZOHO.CRM.UI.Popup.close();
  }, 4000);
}