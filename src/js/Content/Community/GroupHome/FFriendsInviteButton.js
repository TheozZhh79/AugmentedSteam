import {HTML, Localization} from "../../../core_modules";
import {Feature, User} from "../../../Modules/Content";

export default class FFriendsInviteButton extends Feature {

    checkPrerequisites() {
        return User.isSignedIn && document.querySelector(".grouppage_join_area") === null;
    }

    apply() {
        HTML.afterEnd("#join_group_form",
            `<div class="grouppage_join_area">
                <a class="btn_blue_white_innerfade btn_medium" href="https://steamcommunity.com/my/friends/?invitegid=${this.context.groupId}">
                    <span><img src="//steamcommunity-a.akamaihd.net/public/images/groups/icon_invitefriends.png">&nbsp; ${Localization.str.invite_friends}</span>
                </a>
            </div>`);
    }
}