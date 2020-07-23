import {CCommunityBase} from "community/common/CCommunityBase";
import {ContextTypes} from "modules/ASContext";

import {FBrowseWorkshops} from "community/workshop/FBrowseWorkshops";

export class CWorkshopPage extends CCommunityBase {

    constructor() {
        super([
            FBrowseWorkshops,
        ]);

        this.type = ContextTypes.WORKSHOP;
    }
}