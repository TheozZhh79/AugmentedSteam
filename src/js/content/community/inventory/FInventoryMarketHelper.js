import {Feature} from "modules";

import {GameId, HTML, HTMLParser, Localization, SyncedStorage} from "core";
import {Background, Currency, ExtensionLayer, Messenger, Price, RequestData, User} from "common";

// TODO Split this up
export class FInventoryMarketHelper extends Feature {

    apply() {

        ExtensionLayer.runInPageContext(() => {

            $J(document).on("click", ".inventory_item_link, .newitem", () => {
                if (!g_ActiveInventory.selectedItem.description.market_hash_name) {
                    g_ActiveInventory.selectedItem.description.market_hash_name = g_ActiveInventory.selectedItem.description.name;
                }
                let market_expired = false;
                if (g_ActiveInventory.selectedItem.description) {
                    market_expired = g_ActiveInventory.selectedItem.description.descriptions.reduce((acc, el) => (acc || el.value === "This item can no longer be bought or sold on the Community Market."), false);
                }

                window.Messenger.postMessage("sendMessage", [
                    iActiveSelectView,
                    g_ActiveInventory.selectedItem.description.marketable,
                    g_ActiveInventory.appid,
                    g_ActiveInventory.selectedItem.description.market_hash_name,
                    g_ActiveInventory.selectedItem.description.type,
                    g_ActiveInventory.selectedItem.assetid,
                    g_sessionID,
                    g_ActiveInventory.selectedItem.contextid,
                    g_rgWalletInfo.wallet_currency,
                    g_ActiveInventory.m_owner.strSteamId,
                    g_ActiveInventory.selectedItem.description.market_marketable_restriction,
                    market_expired
                ]);
            });
        });
        
        Messenger.addMessageListener("sendMessage", info => { this._inventoryMarketHelper(info) });

        Messenger.addMessageListener("sendFee", async ({ feeInfo, sessionID, global_id, contextID, assetID }) => {
            let sellPrice = feeInfo.amount - feeInfo.fees;
            let formData = new FormData();
            formData.append("sessionid", sessionID);
            formData.append("appid", global_id);
            formData.append("contextid", contextID);
            formData.append("assetid", assetID);
            formData.append("amount", 1);
            formData.append("price", sellPrice);

            /*
            * TODO test what we need to send in request, this is original:
            * mode: "cors", // CORS to cover requests sent from http://steamcommunity.com
            * credentials: "include",
            * headers: { origin: window.location.origin },
            * referrer: window.location.origin + window.location.pathname
            */

            await RequestData.post("https://steamcommunity.com/market/sellitem/", formData, { withCredentials: true });

            document.querySelector(`#es_instantsell${assetID}`).parentNode.style.display = "none";

            let node = document.querySelector(`[id="${global_id}_${contextID}_${assetID}"]`);
            node.classList.add("btn_disabled", "activeInfo");
            node.style.pointerEvents = "none";
        });
    }

    _inventoryMarketHelper([item, marketable, globalId, hashName, assetType, assetId, sessionId, contextId, walletCurrency, ownerSteamId, restriction, expired]) {

        marketable = parseInt(marketable);
        globalId = parseInt(globalId);
        contextId = parseInt(contextId);
        restriction = parseInt(restriction);
        let isGift = assetType && /Gift/i.test(assetType);
        let isBooster = hashName && /Booster Pack/i.test(hashName);
        let ownsInventory = User.isSignedIn && (ownerSteamId === User.steamId);

        let hm;
        let appid = (hm = hashName.match(/^([0-9]+)-/)) ? hm[1] : null;

        let thisItem = document.querySelector(`[id="${globalId}_${contextId}_${assetId}"]`);
        let itemActions = document.querySelector("#iteminfo" + item + "_item_actions");
        let marketActions = document.querySelector("#iteminfo" + item + "_item_market_actions");
        marketActions.style.overflow = "hidden";

        // Set as background option
        if (ownsInventory) {
            this._setBackgroundOption(thisItem, assetId, itemActions);
        }

        // Show prices for gifts
        if (isGift) {
            this._addPriceToGifts(itemActions);
            return;
        }

        if (ownsInventory) {
            // If is a booster pack add the average price of three cards
            if (isBooster) {
                this._addBoosterPackProgress(item, appid);
            }

            this._addOneClickGemsOption(item, appid, assetId);
            this._addQuickSellOptions(marketActions, thisItem, marketable, contextId, globalId, assetId, sessionId, walletCurrency);
        }

        if ((ownsInventory && restriction > 0 && !marketable && !expired && hashName !== "753-Gems") || marketable) {
            this._showMarketOverview(thisItem, marketActions, globalId, hashName, appid, isBooster, walletCurrency);
        }
    }

    _setBackgroundOption(thisItem, assetId, itemActions) {

        if (!document.querySelector(".inventory_links")) { return; }
        if (itemActions.querySelector(".es_set_background")) { return; }

        let viewFullBtn = itemActions.querySelector("a");
        if (!viewFullBtn) { return; }

        if (!/public\/images\/items/.test(viewFullBtn.href)) { return; }

        let linkClass =  thisItem.classList.contains('es_isset_background') ? "btn_disabled" : "";
        HTML.afterEnd(viewFullBtn,
            `<a class="es_set_background btn_small btn_darkblue_white_innerfade ${linkClass}"><span>${Localization.str.set_as_background}</span></a>
                  <img class="es_background_loading" src="https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif">`);

        viewFullBtn.parentNode.querySelector(".es_set_background").addEventListener("click", async function(e) {
            e.preventDefault();
            let el = e.target.closest(".es_set_background");

            if (el.classList.contains("btn_disabled")) { return; }

            let loading = viewFullBtn.parentNode.querySelector(".es_background_loading");
            if (loading.classList.contains("esi-shown")) { return;}

            loading.classList.add("esi-shown");

            // Do nothing if loading or already done
            let setBackground = document.querySelector(".es_isset_background");
            if (setBackground) {
                setBackground.classList.remove("es_isset_background");
            }
            thisItem.classList.add("es_isset_background");

            let result = await RequestData.getHttp(User.profileUrl + "/edit");

            // Make sure the background we are trying to set is not set already
            let m = result.match(/SetCurrentBackground\( {\"communityitemid\":\"(\d+)\"/i);
            let currentBg = m ? m[1] : false;

            if (currentBg !== assetId) {
                let dom = HTMLParser.htmlToDOM(result);

                dom.querySelector("#profile_background").value = assetId;
                let form = dom.querySelector("#editForm");
                let formData = new FormData(form);

                RequestData.post(User.profileUrl + "/edit", formData, {withCredentials: true}).then(result => {
                    // Check if it was truly a succesful change
                    if (/"saved_changes_msg"/i.test(result)) {
                        el.classList.add("btn_disabled");
                    }
                }).catch(() => {
                    console.error("Edit background failed");
                }).finally(() => {
                    loading.classList.remove("esi-shown");
                });
            } else {
                el.classList.add("btn_disabled");
                loading.classList.remove("esi-shown");
            }
        });
    }

    async _addPriceToGifts(itemActions) {

        let action = itemActions.querySelector("a");
        if (!action) { return; }

        let giftAppid = GameId.getAppid(action.href);
        if (!giftAppid) { return; }
        // TODO: Add support for package(sub)

        let result = await Background.action("appdetails", giftAppid, "price_overview");
        if (!result || !result.success) { return; }

        let overview = result.data.price_overview;
        if (!overview) { return; }

        let discount = overview.discount_percent;
        let price = new Price(overview.final / 100, overview.currency);

        itemActions.style.display = "flex";
        itemActions.style.alignItems = "center";
        itemActions.style.justifyContent = "space-between";

        if (discount > 0) {
            let originalPrice = new Price(overview.initial / 100, overview.currency);
            HTML.beforeEnd(itemActions,
                `<div class='es_game_purchase_action' style='margin-bottom:16px'>
                    <div class='es_game_purchase_action_bg'>
                        <div class='es_discount_block es_game_purchase_discount'>
                            <div class='es_discount_pct'>-${discount}%</div>
                            <div class='es_discount_prices'>
                                <div class='es_discount_original_price'>${originalPrice}</div>
                                <div class='es_discount_final_price'>${price}</div>
                            </div>
                        </div>
                    </div>
                </div>`);
        } else {
            HTML.beforeEnd(itemActions,
                `<div class='es_game_purchase_action' style='margin-bottom:16px'>
                    <div class='es_game_purchase_action_bg'>
                        <div class='es_game_purchase_price es_price'>${price}</div>
                    </div>
                </div>`);
        }
    }

    _addBoosterPackProgress(item, appid) {
        HTML.afterBegin(`#iteminfo${item}_item_owner_actions`,
            `<a class="btn_small btn_grey_white_innerfade" href="https://steamcommunity.com/my/gamecards/${appid}/"><span>${Localization.str.view_badge_progress}</span></a>`);
    }

    _addOneClickGemsOption(item, appid, assetid) {
        if (!SyncedStorage.get("show1clickgoo")) { return; }

        let quickGrind = document.querySelector("#es_quickgrind");
        if (quickGrind) { quickGrind.parentNode.remove(); }

        let scrapActions = document.querySelector("#iteminfo" + item + "_item_scrap_actions");

        let divs = scrapActions.querySelectorAll("div");
        HTML.beforeBegin(divs[divs.length-1],
            `<div><a class='btn_small btn_green_white_innerfade' id='es_quickgrind'><span>${Localization.str.oneclickgoo}</span></div>`);

        // TODO: Add prompt?
        document.querySelector("#es_quickgrind").addEventListener("click", () => {
            ExtensionLayer.runInPageContext((appid, assetid) => {
                let rgAJAXParams = {
                    sessionid: g_sessionID,
                    appid,
                    assetid,
                    contextid: 6
                };

                let strActionURL = `${g_strProfileURL}/ajaxgetgoovalue/`;

                $J.get(strActionURL, rgAJAXParams).done(data => {
                    strActionURL = `${g_strProfileURL}/ajaxgrindintogoo/`;
                    rgAJAXParams.goo_value_expected = data.goo_value;

                    $J.post(strActionURL, rgAJAXParams).done(() => {
                        ReloadCommunityInventory();
                    });
                });
            }, [appid, assetid]);
        });
    }

    async _addQuickSellOptions(marketActions, thisItem, marketable, contextId, globalId, assetId, sessionId, walletCurrency) {
        if (!SyncedStorage.get("quickinv")) { return; }
        if (!marketable) { return; }
        if (contextId !== 6 || globalId !== 753) { return; }
        // 753 is the appid for "Steam" in the Steam Inventory
        // 6 is the context used for "Community Items"; backgrounds, emoticons and trading cards

        if (!thisItem.classList.contains("es-loading")) {
            let url = marketActions.querySelector("a").href;

            thisItem.classList.add("es-loading");

            // Add the links with no data, so we can bind actions to them, we add the data later
            let diff = SyncedStorage.get("quickinv_diff");
            HTML.beforeEnd(marketActions, this._makeMarketButton("es_quicksell" + assetId, Localization.str.quick_sell_desc.replace("__modifier__", diff)));
            HTML.beforeEnd(marketActions, this._makeMarketButton("es_instantsell" + assetId, Localization.str.instant_sell_desc));

            ExtensionLayer.runInPageContext(() => { SetupTooltips({ tooltipCSSClass: "community_tooltip" }); });

            // Check if price is stored in data
            if (thisItem.classList.contains("es-price-loaded")) {
                let priceHighValue = thisItem.dataset.priceHigh;
                let priceLowValue = thisItem.dataset.priceLow;

                this._updateMarketButtons(assetId, priceHighValue, priceLowValue, walletCurrency);
            } else {
                let result = await RequestData.getHttp(url);

                let m = result.match(/Market_LoadOrderSpread\( (\d+) \)/);

                if (m) {
                    let marketId = m[1];

                    let marketUrl = "https://steamcommunity.com/market/itemordershistogram?language=english&currency=" + walletCurrency + "&item_nameid=" + marketId;
                    let market = await RequestData.getJson(marketUrl);

                    let priceHigh = parseFloat(market.lowest_sell_order / 100) + parseFloat(diff);
                    let priceLow = market.highest_buy_order / 100;
                    // priceHigh.currency == priceLow.currency == Currency.customCurrency, the arithmetic here is in walletCurrency

                    if (priceHigh < 0.03) priceHigh = 0.03;

                    // Store prices as data
                    if (priceHigh > priceLow) {
                        thisItem.dataset.priceHigh = priceHigh;
                    }
                    if (market.highest_buy_order) {
                        thisItem.dataset.priceLow = priceLow;
                    }

                    // Fixes multiple buttons
                    if (document.querySelector(".item.activeInfo") === thisItem) {
                        this._updateMarketButtons(assetId, priceHigh, priceLow, walletCurrency);
                    }

                    thisItem.classList.add("es-price-loaded");
                }
            }
            // Loading request either succeeded or failed, no need to flag as still in progress
            thisItem.classList.remove("es-loading");
        }

        // Bind actions to "Quick Sell" and "Instant Sell" buttons

        let nodes = document.querySelectorAll("#es_quicksell" + assetId + ", #es_instantsell" + assetId);
        for (let node of nodes) {
            node.addEventListener("click", function(e) {
                e.preventDefault();

                let buttonParent = e.target.closest(".item_market_action_button[data-price]");
                if (!buttonParent) { return; }

                let sellPrice = buttonParent.dataset.price * 100;

                let buttons = document.querySelectorAll("#es_quicksell" + assetId + ", #es_instantsell" + assetId);
                for (let button of buttons) {
                    button.classList.add("btn_disabled");
                    button.style.pointerEvents = "none";
                }

                HTML.inner(
                    marketActions.querySelector("div"),
                    "<div class='es_loading' style='min-height: 66px;'><img src='https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif'><span>" + Localization.str.selling + "</div>"
                );

                ExtensionLayer.runInPageContext((sellPrice, sessionID, global_id, contextID, assetID) => {
                    window.Messenger.postMessage("sendFee",
                        {
                            feeInfo: CalculateFeeAmount(sellPrice, 0.10),
                            sessionID,
                            global_id,
                            contextID,
                            assetID,
                        }
                    );
                },
                [
                    sellPrice,
                    sessionId,
                    globalId,
                    contextId,
                    assetId,
                ]);
            });
        }
    }

    _makeMarketButton(id, tooltip) {
        return `<a class="item_market_action_button item_market_action_button_green" id="${id}" data-tooltip-text="${tooltip}" style="display:none">
                    <span class="item_market_action_button_edge item_market_action_button_left"></span>
                    <span class="item_market_action_button_contents"></span>
                    <span class="item_market_action_button_edge item_market_action_button_right"></span>
                </a>`;
    }

    _updateMarketButtons(assetId, priceHighValue, priceLowValue, walletCurrency) {
        let quickSell = document.getElementById("es_quicksell" + assetId);
        let instantSell = document.getElementById("es_instantsell" + assetId);
        
        // Add Quick Sell button
        if (quickSell && priceHighValue && priceHighValue > priceLowValue) {
            quickSell.dataset.price = priceHighValue;
            quickSell.querySelector(".item_market_action_button_contents").textContent = Localization.str.quick_sell.replace("__amount__", new Price(priceHighValue, Currency.currencyNumberToType(walletCurrency)));
            quickSell.style.display = "block";
        }

        // Add Instant Sell button
        if (instantSell && priceLowValue) {
            instantSell.dataset.price = priceLowValue;
            instantSell.querySelector(".item_market_action_button_contents").textContent = Localization.str.instant_sell.replace("__amount__", new Price(priceLowValue, Currency.currencyNumberToType(walletCurrency)));
            instantSell.style.display = "block";
        }
    }

    async _showMarketOverview(thisItem, marketActions, globalId, hashName, appid, isBooster, walletCurrencyNumber) {

        marketActions.style.display = "block";
        let firstDiv = marketActions.querySelector("div");
        if (!firstDiv) {
            firstDiv = document.createElement("div");
            marketActions.insertAdjacentElement("afterbegin", firstDiv);
        }

        // "View in market" link
        let html = '<div style="height:24px;"><a href="https://steamcommunity.com/market/listings/' + globalId + '/' + encodeURIComponent(hashName) + '">' + Localization.str.view_in_market + '</a></div>';

        // Check if price is stored in data
        if (!thisItem.dataset.lowestPrice) {
            firstDiv.innerHTML = "<img class='es_loading' src='https://steamcommunity-a.akamaihd.net/public/images/login/throbber.gif' />";

            let overviewPromise = RequestData.getJson(`https://steamcommunity.com/market/priceoverview/?currency=${walletCurrencyNumber}&appid=${globalId}&market_hash_name=${encodeURIComponent(hashName)}`);

            if (isBooster) {
                thisItem.dataset.cardsPrice = "nodata";

                try {
                    let walletCurrency = Currency.currencyNumberToType(walletCurrencyNumber);
                    let result = await Background.action("market.averagecardprice", { 'appid': appid, 'currency': walletCurrency, } );
                    thisItem.dataset.cardsPrice = new Price(result.average, walletCurrency);
                } catch (error) {
                    console.error(error);
                }
            }

            try {
                let data = await overviewPromise;

                thisItem.dataset.lowestPrice = "nodata";
                if (data && data.success) {
                    thisItem.dataset.lowestPrice = data.lowest_price || "nodata";
                    thisItem.dataset.soldVolume = data.volume;
                }
            } catch (error) {
                console.error("Couldn't load price overview from market", error);
                HTML.inner(firstDiv, html); // add market link anyway
                return;
            }
        }

        html += this._getMarketOverviewHtml(thisItem);

        HTML.inner(firstDiv, html);
    }

    _getMarketOverviewHtml(node) {

        let html = '<div style="min-height:3em;margin-left:1em;">';

        if (node.dataset.lowestPrice && node.dataset.lowestPrice !== "nodata") {
            html += Localization.str.starting_at.replace("__price__", node.dataset.lowestPrice);

            if (node.dataset.dataSold) {
                html += '<br>' + Localization.str.volume_sold_last_24.replace("__sold__", node.dataset.dataSold);
            }

            if (node.dataset.cardsPrice) {
                html += '<br>' + Localization.str.avg_price_3cards.replace("__price__", node.dataset.cardsPrice);
            }
        } else {
            html += Localization.str.no_price_data;
        }

        html += '</div>';
        return html;
    }
}