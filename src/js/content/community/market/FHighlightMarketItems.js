import {CallbackFeature} from "modules";

import {SyncedStorage} from "core";
import {Inventory} from "common";

import {FHighlightsTags} from "common/FHighlightsTags";

export class FHighlightMarketItems extends CallbackFeature {

    constructor(context) {

        super(context, true, () => {
            new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (let node of mutation.addedNodes) {
                        if (node.classList && node.classList.contains("market_listing_row_link")) {
                            this.callback();
                            return;
                        }
                    }
                }
            }).observe(
                document.getElementById("mainContents"),
                {"childList": true, "subtree": true},
            );
        });
    }

    checkPrerequisites() {
        return SyncedStorage.get("highlight_owned");
    }

    async callback() {

        for (let node of document.querySelectorAll(".market_listing_row_link")) {
            let m = node.href.match(/market\/listings\/753\/(.+?)(\?|$)/);
            if (!m) { continue; }

            // todo Collect hashes and query them all at once
            if (await Inventory.hasInInventory6(decodeURIComponent(m[1]))) {
                FHighlightsTags.highlightOwned(node.querySelector("div"));
            }
        }
    }
}