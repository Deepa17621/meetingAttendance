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
