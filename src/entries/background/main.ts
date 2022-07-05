import browser, {Action} from "webextension-polyfill";
import {initNative} from "~/lib/native";
import {
  EXTENSION_ID,
  fetchAndRoundAvatarAsCanvas, REQUEST_TYPE_CLOSE_MANAGER, STORAGE_CACHE_CUSTOM_AVATARS, STORAGE_CACHE_GLOBAL_OPTIONS,
  STORAGE_CACHE_PROFILE_LIST_KEY,
  STORAGE_NATIVE_CONNECTOR_VERSION
} from "~/lib/common";

async function handleEvent(event) {
  console.log("Incoming native event!", event);

  if(event.event === "ConnectorInformation") {
    browser.storage.local.set({[STORAGE_NATIVE_CONNECTOR_VERSION]: event.version});
  } else if(event.event === "ProfileList") {
    // Sort profiles
    event.profiles.sort((a, b) => a.name.localeCompare(b.name));

    browser.storage.local.set({[STORAGE_CACHE_PROFILE_LIST_KEY]: event});

    // Update browser action icon
    if(event.current_profile_id != null) {
      const currentProfile = event.profiles.find(it => it.id === event.current_profile_id);
      if(currentProfile != null) {
        const {canvas, context} = await fetchAndRoundAvatarAsCanvas(currentProfile.avatar);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        browser.browserAction.setIcon({imageData: imageData as Action.ImageDataType});
      }
    }
  } else if(event.event === "FocusWindow") {
    let windowId;
    if(event.url != null) {
      try {
        const newTab = await browser.tabs.create({url: event.url});
        windowId = newTab.windowId;
      } catch(e) {
        console.error("Failed to create new tab!", e);
      }
    } else {
      const curWindow = await browser.windows.getLastFocused({populate:false});
      if(curWindow != null)
        windowId = curWindow.id;
    }
    if(windowId != null)
      browser.windows.update(windowId, {focused:true});
  } else if(event.event === "CloseManager") {
    browser.runtime.sendMessage({
      type: REQUEST_TYPE_CLOSE_MANAGER
    });
  } else if(event.event === "OptionsUpdated") {
    browser.storage.local.set({[STORAGE_CACHE_GLOBAL_OPTIONS]: event.options});
  } else if(event.event === "AvatarsUpdated") {
    browser.storage.local.set({[STORAGE_CACHE_CUSTOM_AVATARS]: event.avatars});
  }
}

initNative(handleEvent);

// Listen for when the winfocus page is launched and close it as fast as possible
browser.tabs.onCreated.addListener(function(tab) {
  if(tab.title === EXTENSION_ID + "/js/winfocus/winfocus.html") {
    browser.tabs.remove(tab.id);
  }
});
