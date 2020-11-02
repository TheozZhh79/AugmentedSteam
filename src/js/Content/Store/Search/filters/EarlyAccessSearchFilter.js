import {Localization, SyncedStorage} from "../../../../core_modules";
import {EarlyAccess} from "../../../../Modules/Content/EarlyAccess";
import {SimpleSearchFilter} from "./searchfilters";

export class EarlyAccessSearchFilter extends SimpleSearchFilter {

    constructor(feature) {
        super("as-hide", feature, Localization.str.search_filters.hide_ea, "ea");
    }

    setState(params) {
        super.setState(params);

        if (this.active) {
            this.addRowMetadata(document.querySelectorAll(".search_result_row:not(.es_ea_checked)"));
        }
    }

    _onClick() {
        super._onClick();

        if (this.active) {
            this.addRowMetadata(document.querySelectorAll(".search_result_row:not(.es_ea_checked)"));
        }
    }

    async addRowMetadata(rows) {
        if (!this.active || SyncedStorage.get("show_early_access")) { return; }

        for (const row of await EarlyAccess.getEaNodes(rows)) {
            row.classList.add("es_early_access");
        }
    }
}