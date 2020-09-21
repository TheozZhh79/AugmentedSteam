import {CCommunityBase} from "community/common/CCommunityBase";
import {ContextTypes} from "modules";

import {FBackgroundSelection} from "community/profile_edit/FBackgroundSelection";
import {FStyleSelection} from "community/profile_edit/FStyleSelection";

import {ProfileData} from "community/common";

export class CProfileEditPage extends CCommunityBase {

    constructor() {
        
        super([
            FBackgroundSelection,
            FStyleSelection,
        ]);

        this.type = ContextTypes.PROFILE_EDIT;
    }

    async applyFeatures() {

        await ProfileData.clearOwn();

        if (!document.querySelector(`[class^="profileeditshell_PageContent_"]`)) {
            await new Promise(resolve => {
                new MutationObserver((records, observer) => {
                    for (let {addedNodes} of records) {
                        for (let node of addedNodes) {
                            if (node.nodeType !== Node.ELEMENT_NODE || !node.querySelector(`[class^="profileeditshell_PageContent_"]`)) { continue; }
    
                            observer.disconnect();
                            resolve();
                        }
                    }
                }).observe(document.getElementById("application_root"), {"childList": true});
            });
        }
        
        return super.applyFeatures();
    }
}