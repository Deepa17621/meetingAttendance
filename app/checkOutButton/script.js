let checkoutBtn = document.querySelector(".checkout-btn");
let checkoutLocation = document.querySelector("#checkoutLocation");
let checkoutTime = document.querySelector("#checkoutTime");
let successLocation = document.querySelector("#successLocation");
let successTime = document.querySelector("#successTime");
let successMessage = document.getElementById("successMessage");

ZOHO.embeddedApp.on("PageLoad", async function (data) {
  // 1. Get Meeting Record Details
  let meetingRecordConfig = {
    Entity: "Events",
    approved: "both",
    RecordID: data.EntityId[0],
  };
  let meetingDetails = await ZOHO.CRM.API.getRecord(meetingRecordConfig);
  let checkInStatus = meetingDetails.data[0].Check_In_Status;
  let checkOutTime = meetingDetails.data[0].Checkout_Time;
  let checkInTime = meetingDetails.data[0].Check_In_Time;

  // 2. Detect Platform - from Where Button is Accessed.
  let detectPlatform = function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    // const isMobile = ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("zoho");
    if ( ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("zoho")){
      return "mobile";
    }
    else if(/ZohoCRM_Desktop|Electron/i.test(ua)){
      return "desktop";
    }
    else {
      return "web";
    }
  };
  let platform = detectPlatform();
  
  if (platform === "mobile") {
    // 3. Check Checked In Or Not
    if (checkInStatus === "VISITED" && !checkOutTime) {
      // i. Check out Button - Event Listener
      checkoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const currentDate = new Date();
        const time = currentDate.toLocaleString();

        let formattedCheckOutTime = getCurrentTimeInIST(time);
        const inTime = new Date(checkInTime);
        const outTime = new Date(formattedCheckOutTime);

        const duration = outTime - inTime;

        const inSeconds = duration / 1000;
        const inMinutes = Math.floor(inSeconds / 60);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        // Format output
        let durationTime = "";
        if (inMinutes >= 60) {
          durationTime = `${hours} hours ${minutes} minutes`;
        } else {
          durationTime = `${inMinutes} minutes`;
        }
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async function (position) {
            let reverseLocation = await reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            if (reverseLocation != false) {
              checkoutLocation.innerHTML = reverseLocation.display_name;
              successLocation.innerHTML = reverseLocation.display_name;
              successMessage.style.display = "block";
              checkoutTime.innerHTML = time;
              successTime.innerHTML = time;

              let updateRecord = await updateMeetingRecord(reverseLocation,formattedCheckOutTime,data,position,durationTime);

              if (updateRecord) {
                showToast("Checkout Success", "green");
                setTimeout(async () => {
                  await ZOHO.CRM.UI.Popup.close();
                }, 2700);
              } else {
                showToast("Checkout Details Not Updated", "red");
                showError();
              }
            } else {
              showToast("Location could not reverse", "red");
              showError();
            }
          });
        } else {
          showToast("Geolocation is not supported by this browser", "red");
          showError();
          return;
        }
      });
    } else if (checkInStatus === "PLANNED") {
      showToast("Check Out Can be Performed Only On Checked In Meeting", "red");
      showError();
      return;
    } else if (checkOutTime != null) {
      showToast("Check out can be performed only Once in a Record", "red");
      showError();
      return;
    } else {
      showToast("Error in Function. Contact Administrator", "red");
      showError();
      return;
    }
  } else {
    showToast("This Button Action is allowed only in mobile app", "red");
    showError();
    return;
  }
});
function locationError(params) {
  showToast("Could not get location: " + params.message, "red");
}

function showError() {
  checkoutBtn.disabled = "true";
  checkoutBtn.style.cursor = "not-allowed";
  setTimeout(async () => {
    await ZOHO.CRM.UI.Popup.close();
  }, 2700);
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
  // Retrieve Current User Details
  let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();

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
  // var extensionConfig = {
  //   Entity: "Events",
  //   APIData: {
  //     id: currentRecord.EntityId[0],
  //     meetingattendance__Checkout_City: city,
  //     meetingattendance__Checkout_Country: location.address.country,
  //     meetingattendance__Checkout_State: location.address.state,
  //     meetingattendance__Checkout_Address: location.display_name,
  //     meetingattendance__Checkout_Latitude: position.coords.latitude.toString(),
  //     meetingattendance__Checkout_Longitude: position.coords.longitude.toString(),
  //     meetingattendance__Checkout_Zipcode: location.address.postcode,
  //     meetingattendance__Checkout_Time: time.toString(),
  //     meetingattendance__Check_out_Sub_Locality: subLocality,
  //     meetingattendance__Meeting_Duration: durationTime,
  //     meetingattendance__Checkout_By: currentUser.users[0].full_name,
  //   },
  //   Trigger: ["workflow"],
  // };

  // CRM FIELDS
  var config = {
    Entity: "Events",
    APIData: {
      id: currentRecord.EntityId[0],
      Checkout_city: city,
      Checkout_Country: location.address.country,
      Checkout_State: location.address.state,
      Checkout_Address: location.display_name,
      Checkout_Latitude: position.coords.latitude.toString(),
      Checkout_Longitude: position.coords.longitude.toString(),
      Checkout_Zipcode: location.address.postcode,
      Checkout_Time: time.toString(),
      Checkout_Sub_Locality: subLocality,
      Meeting_Duration: durationTime,
      Checkout_By: currentUser.users[0].full_name,
    },
    Trigger: ["workflow"],
  };

  let res = await ZOHO.CRM.API.updateRecord(config);

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

function showToast(message, color) {
  Toastify({
    text: message,
    duration: 3000, // 3 seconds
    gravity: "top", // top or bottom
    position: "center", // left, center or right
    backgroundColor: color, // light green (tailwind-like)
    stopOnFocus: true, // pause on hover
    // close: true, // show close icon
    color: "white",
  }).showToast();
}
function getCurrentTimeInIST(inp) {
  const now = new Date(inp);
  const istOffset = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds
  const ist = new Date(
    now.getTime() + istOffset - now.getTimezoneOffset() * 60000
  );

  const pad = (num) => String(num).padStart(2, "0");

  const yyyy = ist.getFullYear();
  const MM = pad(ist.getMonth() + 1);
  const dd = pad(ist.getDate());
  const HH = pad(ist.getHours());
  const mm = pad(ist.getMinutes());
  const ss = pad(ist.getSeconds());

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}+05:30`;
}
