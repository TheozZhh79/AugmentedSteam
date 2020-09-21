import {Context, ContextTypes} from "modules";

import {FMultiProductKeys} from "store/registerkey/FMultiProductKeys";

export class CRegisterKeyPage extends Context {

    constructor() {
        super([
            FMultiProductKeys,
        ]);

        this.type = ContextTypes.REGISTER_KEY;
    }
}
