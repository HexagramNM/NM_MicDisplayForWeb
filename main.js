
import {NM_MicDisplayStarter} from "./modules/NM_MicDisplayStarter.js";

const micDisplayStarter = new NM_MicDisplayStarter();

async function VirtualBB_onload() {
    const backgroundColor = {r: 50, g: 0, b: 0};
    const backgroundColorCode = "#" + backgroundColor.r.toString(16).padStart(2, "0")
        + backgroundColor.g.toString(16).padStart(2, "0")
        + backgroundColor.b.toString(16).padStart(2, "0");
    document.bgColor = backgroundColorCode;

    await micDisplayStarter.onLoad();
}

window.addEventListener("load", VirtualBB_onload);
