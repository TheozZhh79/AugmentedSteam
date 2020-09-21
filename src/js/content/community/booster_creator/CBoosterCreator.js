import {CCommunityBase} from "community/common/CCommunityBase";
import {ContextTypes} from "modules";

import FShowGemsCost from "./FShowGemsCost";

export class CBoosterCreator extends CCommunityBase {

    constructor() {

        super([
            FShowGemsCost,
        ]);

        this.type = ContextTypes.BOOSTER_CREATOR;
    }
}