import ContextType from "../../../Modules/Content/Context/ContextType";
import {CCommunityBase} from "../CCommunityBase";
import FReviewSort from "./FReviewSort";

export class CRecommended extends CCommunityBase {

    constructor() {

        super(ContextType.RECOMMENDED, [
            FReviewSort,
        ]);
    }
}