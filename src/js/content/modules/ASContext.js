import {ASFeatureManager} from "modules/ASFeatureManager";

export class ASContext {
    constructor(features) {
        this._callbacks = [];
        this.features = features.map(ref => new ref(this));
    }

    applyFeatures() {
        return ASFeatureManager.apply(this.features);
    }

    registerCallback(fn) {
        this._callbacks.push(fn);
    }

    triggerCallbacks(...params) {
        for (let callback of this._callbacks) {
            callback(...params);
        }
    }
}

export const ContextTypes = Object.freeze({
    "ACCOUNT": 1,
    "APP": 2,
    "BUNDLE": 3,
    "STORE_DEFAULT": 4,
    "FUNDS": 5,
    "REGISTER_KEY": 6,
    "SALE": 7,
    "SEARCH": 8,
    "STATS": 9,
    "STORE_FRONT": 10,
    "SUB": 11,
    "WISHLIST": 12,
    "AGECHECK": 13,
    "COMMUNITY_DEFAULT": 14,
    "WORKSHOP": 15,
    "PROFILE_ACTIVITY": 16,
    "GAMES": 17,
});