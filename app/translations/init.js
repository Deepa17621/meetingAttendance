async function getTranslatedObject(locale) {
  let langObj = async () => {
    if (locale.startsWith("en")) {
      let res = await fetch("../translations/en.json");
      let data = await res.json();
      return data;
    }
    else if (locale.startsWith("zh")) {
      let res = await fetch("../translations/zh.json");
      let data = await res.json();
      return data;
    }
  }
  return langObj();
}

async function startTranslation(langObj) {
  (document.querySelector("#title")).textContent = langObj["title"];
  (document.querySelector("#status")).textContent = langObj["status"];
  // (document.querySelector("#actual-status-check-out-pending")).innerHTML = langObj["actual-status-check-out-pending"];
  // (document.querySelector("#actual-status-success")).innerHTML = langObj["actual-status-success"];
  // (document.querySelector("#actual-status-already-done")).innerHTML = langObj["actual-status-already-done"];
  // (document.querySelector("#actual-status-check-in-pending")).innerHTML = langObj["actual-status-check-in-pending"];
  // (document.querySelector("#button-in-progress")).innerHTML = langObj["button-in-progress"];
  // (document.querySelector("#button-success")).innerHTML = langObj["button-success"];
  (document.querySelector("#button-pending")).textContent = langObj["button-pending"];

  
  console.log(stageText);
  console.log(detailsRow);
  
  stageText.forEach(stage => {
    stage.textContent = langObj[stage.id];
  });
  detailsRow.forEach(row => {
    let firstTd = row.querySelector("td:first-child"); // pick only the first td
    if (firstTd) {
      firstTd.textContent = langObj[firstTd.id]; // change text
    }
  });
}

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex"; // or "block" depending on your CSS
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

async function main() {
  showLoader();
  try {
    await ZOHO.embeddedApp.init();

    const userDetails = await ZOHO.CRM.CONFIG.getCurrentUser();
    const currentLang = userDetails.users[0].locale;
    const translations = await getTranslatedObject(currentLang);
    await startTranslation(translations);
    hideLoader();
  } catch (error) {
    console.log("Error loading translations:", error);
  }
}
main();


// async function main() {
//   try {
//     await ZOHO.embeddedApp.init();
//     let userDetails = await ZOHO.CRM.CONFIG.getCurrentUser();
//     let currentLang = await userDetails.users[0].locale;
//     let d = await getTranslatedObject(currentLang);
//     await startTranslation(d);
//   } catch (error) {
//     console.log(error);
//   }
// }
// main();
