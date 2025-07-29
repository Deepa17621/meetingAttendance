ZOHO.embeddedApp.on("PageLoad", async function (data) {
  console.log(data);
  //1. Get the Event Details
  let eventId = data.EntityId[0];
  let reqBody = {
    Entity: "Events",
    approved: "both",
    RecordID: eventId,
  };
  let eventDetails = await ZOHO.CRM.API.getRecord(reqBody);
  console.log(eventDetails);

  let isCheckedIn = false;
  let checkInData = null;
  let checkOutData = null;

  document.querySelector("#toggleBtn").addEventListener("click", (e) => {
    e.preventDefault();
    if (isCheckedIn) {
      checkOut();
    } else {
      checkIn();
    }
  });

  async function checkIn() {
    const btn = document.getElementById("toggleBtn");
    const status = document.getElementById("status");

    btn.textContent = "Getting location...";
    btn.disabled = true;
    const now = new Date();
    let eventTime = eventDetails.data[0].Start_DateTime;
    console.log("Event Start Time: " + eventTime);
    console.log("Current Time: " + now);
    let distance = await getLocations(eventDetails.data[0].venue, eventDetails);
    return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async function (position) {
          console.log("Position- Actual Response Of the GeoLocation: ");
          console.log(position);

          console.log(distance);
          if (distance) {
            checkInData = {
              time: now,
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
            };

            isCheckedIn = true;
            updateUI();
            showLocation(checkInData.location);
          }
        },
        function (error) {
          alert("Could not get location: " + error.message);
          btn.textContent = "Check In";
          btn.disabled = false;
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      btn.textContent = "Check In";
      btn.disabled = false;
    }
  }

  function checkOut() {
    const now = new Date();
    checkOutData = {
      time: now,
    };

    isCheckedIn = false;
    updateUI();
  }

  function updateUI() {
    const btn = document.getElementById("toggleBtn");
    const status = document.getElementById("status");
    const checkInTime = document.getElementById("checkInTime");
    const checkOutTime = document.getElementById("checkOutTime");

    if (isCheckedIn) {
      btn.textContent = "Check Out";
      btn.classList.add("checked-in");
      status.textContent = "Checked In";
      status.classList.add("checked-in");
    } else {
      btn.textContent = "Check In";
      btn.classList.remove("checked-in");
      status.textContent = "Ready to check in";
      status.classList.remove("checked-in");
    }

    btn.disabled = false;

    checkInTime.textContent = checkInData
      ? checkInData.time.toLocaleTimeString()
      : "--:--";
    checkOutTime.textContent = checkOutData
      ? checkOutData.time.toLocaleTimeString()
      : "--:--";
  }

  function showLocation(location) {
    const locationInfo = document.getElementById("locationInfo");
    const locationDetails = document.getElementById("locationDetails");

    locationDetails.innerHTML = `
                Lat: ${location.lat.toFixed(6)}<br>
                Lng: ${location.lng.toFixed(6)}<br>
                Accuracy: ${Math.round(location.accuracy)}m
            `;

    locationInfo.style.display = "block";
  }
});
async function getLocations(givenLocation, eventDetails) {
  let currentLocation;
  let venue;
  let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
  console.log(currentUser);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        currentLocation = {
          lat: userLat,
          lon: userLon,
        };
        let newDate = new Date();
        let currentAddress = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLat}&lon=${userLon}`
        );
        let address1 = await currentAddress.json();
        console.log(address1);
        let obj = {
          Entity: "Events",
          APIData: {
            meetingattendance__Event_Title: eventDetails.data[0].Event_Title,
            meetingattendance__Scheduled_End_Time:
              eventDetails.data[0].End_DateTime,
            meetingattendance__Scheduled_Start_Time:
              eventDetails.data[0].Start_DateTime,
            meetingattendance__Venue: eventDetails.data[0].venue,
            meetingattendance__Meeting_ID: eventDetails.data[0].id,
            meetingattendance__Check_In_Addressq: address1.display_name,
            meetingattendance__Check_In_City: address1.address.city,
            meetingattendance__Check_In_Country: address1.address.country,
            meetingattendance__Check_In_State: address1.address.state,
            meetingattendance__Check_In_Time: toISOWithOffset(newDate),
            meetingattendance__Check_In_Latitude: userLat,
            meetingattendance__Check_In_Longitude: userLon,
          },
        };
        console.log(obj);

        let updateResponse = await ZOHO.CRM.API.updateRecord(obj);
        console.log(updateResponse);
      },
      function (error) {
        alert("Could not get location: " + error.message);
        btn.textContent = "Check In";
        btn.disabled = false;
      },
      {
        enableHighAccuracy: true, // 🔍 Requests GPS or highest accuracy source
        timeout: 10000, // ⏱ Max wait time: 10 seconds
        maximumAge: 0, // ♻️ No cached location
      }
    );
  }

  // let givenVenue = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${givenLocation}`);
  // let res = await givenVenue.json();
  // console.log(res);
  // venue={
  //     lat: parseFloat(res[0].lat),
  //     lon: parseFloat(res[0].lon)
  // }
  // let distance = getDistance(givenLocation.lat, givenLocation.lon, currentLocation.lat, currentLocation.lon);
  // console.log(distance);
  // if(distance<=100){
  //     return true;
  // }
  // else return false;
  return "";
}
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toISOWithOffset(date) {
  const pad = (n) => n.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offset = -date.getTimezoneOffset(); // in minutes
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

//Initializing the widget.
ZOHO.embeddedApp.init();
