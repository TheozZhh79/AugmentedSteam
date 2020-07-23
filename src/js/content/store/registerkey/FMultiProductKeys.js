import {ASFeature} from "modules/ASFeature";

import {ExtensionResources, HTML, Localization} from "core";
import {ExtensionLayer, RequestData, User} from "common";

export class FMultiProductKeys extends ASFeature {

    apply() {

        this._template = `<div id="es_activate_modal">
                <div id="es_activate_modal_content">
                    <div class="newmodal_prompt_with_textarea gray_bevel fullwidth" id="es_activate_input_text">
                        <textarea name="es_key_input" id="es_key_input" rows="24" cols="12" maxlength="1080">__alreadyentered__</textarea>
                    </div>
                    <div class="es_activate_buttons" style="float: right">
                        <div class="btn_green_white_innerfade btn_medium es_activate_modal_submit">
                            <span>${Localization.str.activate_products}</span>
                        </div>
                        <div class="es_activate_modal_close btn_grey_white_innerfade btn_medium">
                            <span>${Localization.str.cancel}</span>
                        </div>
                    </div>
                </div>
            </div>`;

        document.querySelector("#register_btn").addEventListener("click", e => {
            if (document.getElementById("product_key").value.indexOf(",") > 0) {
                e.preventDefault();
                this._showDialog();
            }
        });

        // Show note input modal
        document.addEventListener("click", e => {
            if (!e.target.closest("#es_activate_multiple")) { return; }
            this._showDialog();
        });

        // Insert the "activate multiple products" button
        HTML.beforeBegin("#registerkey_examples_text",
            `<a class="btnv6_blue_hoverfade btn_medium" id="es_activate_multiple" style="margin-bottom: 15px;">
                <span>${Localization.str.activate_multiple}</span>
            </a>
            <div style="clear: both;"></div>`);

        // Process activation

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".es_activate_modal_submit")) { return; }

            document.querySelector(".es_activate_modal_submit").style.display = "none";
            document.querySelector(".es_activate_modal_close").style.display = "none";

            const keys = [];

            // turn textbox into table to display results
            const lines = document.querySelector("#es_key_input").value.split("\n");
            const node = document.querySelector("#es_activate_input_text");
            HTML.beforeBegin(node, "<div id='es_activate_results'></div>");
            node.style.display = "none";

            lines.forEach(line => {
                const attempt = String(line);
                if (attempt === "") { // skip blank rows in the input dialog (including trailing newline)
                    return;
                }
                keys.push(attempt);

                const url = ExtensionResources.getURL("img/questionmark.png");

                HTML.beforeEnd("#es_activate_results",
                    `<div style='margin-bottom: 8px;'><span id='attempt_${attempt}_icon'><img src='${url}' style='padding-right: 10px; height: 16px;'></span>${attempt}</div><div id='attempt_${attempt}_result' style='margin-left: 26px; margin-bottom: 10px; margin-top: -5px;'></div>`);
            });

            // force recalculation of the modal's position so it doesn't extend off the bottom of the page
            setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
            }, 250);

            // attempt to activate each key in sequence
            const promises = [];

            for (let i = 0; i < keys.length; i++) {
                const current_key = keys[i];

                const formData = new FormData();
                formData.append("sessionid", User.getSessionId());
                formData.append("product_key", current_key);

                const request = RequestData.post("https://store.steampowered.com/account/ajaxregisterkey", formData).then(data => {
                    data = JSON.parse(data);
                    const attempted = current_key;
                    let message = Localization.str.register.default;
                    if (data.success === 1) {
                        document.querySelector(`#attempt_${attempted}_icon img`).setAttribute("src", ExtensionResources.getURL("img/sr/okay.png"));
                        if (data.purchase_receipt_info.line_items.length > 0) {
                            document.querySelector(`#attempt_${attempted}_result`).textContent = Localization.str.register.success.replace("__gamename__", data.purchase_receipt_info.line_items[0].line_item_description);
                            document.querySelector(`#attempt_${attempted}_result`).style.display = "block";
                        }
                    } else {
                        switch (data.purchase_result_details) {
                        case 9: message = Localization.str.register.owned; break;
                        case 13: message = Localization.str.register.notavail; break;
                        case 14: message = Localization.str.register.invalid; break;
                        case 15: message = Localization.str.register.already; break;
                        case 24: message = Localization.str.register.dlc; break;
                        case 50: message = Localization.str.register.wallet; break;
                        case 53: message = Localization.str.register.toomany; break;
                        }
                        document.querySelector(`#attempt_${attempted}_icon img`).setAttribute("src", ExtensionResources.getURL("img/sr/banned.png"));
                        document.querySelector(`#attempt_${attempted}_result`).textContent = message;
                        document.querySelector(`#attempt_${attempted}_result`).style.display = "block";
                    }

                }, () => {
                    const attempted = current_key;
                    document.querySelector(`#attempt_${attempted}_icon img`).setAttribute("src", ExtensionResources.getURL("img/sr/banned.png"));
                    document.querySelector(`#attempt_${attempted}_result`).textContent = Localization.str.error;
                    document.querySelector(`#attempt_${attempted}_result`).style.display = "block";
                });

                promises.push(request);
            }

            Promise.all(promises).then(() => {
                document.querySelector(".es_activate_modal_close span").textContent = Localization.str.close;
                document.querySelector(".es_activate_modal_close").style.display = "block";
                window.dispatchEvent(new Event("resize"));
            });
        });

        // Bind the "Cancel" button to close the modal
        document.addEventListener("click", ({target}) => {
            if (!target.closest(".es_activate_modal_close")) { return; }
            ExtensionLayer.runInPageContext(() => { CModal.DismissActiveModal(); });
        });
    }

    _showDialog() {
        ExtensionLayer.runInPageContext((header, template) => {
            ShowDialog(header, template);
        },
        [
            Localization.str.activate_multiple_header,
            this._template.replace("__alreadyentered__", document.getElementById("product_key").value.replace(/\,/g, "\n")),
        ]);
    }
}