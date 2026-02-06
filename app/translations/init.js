// Elements
// let SETTINGS_heading = document.querySelector("#SETTINGS_heading");
// let SETTINGS_row1_content = document.querySelector("#SETTINGS_row1_content");
// let SETTINGS_row2_content = document.querySelector("#SETTINGS_row2_content");
// let SETTINGS_NOTE_heading = document.querySelector("#SETTINGS_NOTE_heading");
// let SETTINGS_NOTE_row1 = document.querySelector("#SETTINGS_NOTE_row1");
// let SETTINGS_NOTE_row2 = document.querySelector("#SETTINGS_NOTE_row2");

// let elementsArray = [SETTINGS_heading, SETTINGS_row1_content, SETTINGS_row2_content, SETTINGS_NOTE_heading, SETTINGS_NOTE_row1, SETTINGS_NOTE_row2 ]
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
  //  if (langObj) {
  //           elementsArray.forEach(ele => {
  //               ele.textContent = langObj[ele.id];
  //           });
  //       }


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
    (document.querySelector("#title")).textContent = await translations["title"];
    // await startTranslation(translations);
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