import {ASContext, ContextTypes} from "modules/ASContext";

import {FMultiProductKeys} from "store/registerkey/FMultiProductKeys";

export class CRegisterKeyPage extends ASContext {

    constructor() {
        super([
            FMultiProductKeys,
        ]);

        this.type = ContextTypes.REGISTER_KEY;
    }
}