﻿/**
 * @file Contains the reportExplorer widget.
 *
 */

var forerunner = forerunner || {};
forerunner.ssr = forerunner.ssr || {};

$(function () {
    var widgets = forerunner.ssr.constants.widgets;
    var events = forerunner.ssr.constants.events;
    var locData = forerunner.localize.getLocData(forerunner.config.forerunnerFolder() + "ReportViewer/loc/ReportViewer");
    /**
     * Widget used to explore available reports and launch the Report Viewer
     *
     * @namespace $.forerunner.reportExplorer
     * @prop {Object} options - The options for reportExplorer
     * @prop {String} options.reportManagerAPI - Path to the report manager REST API calls
     * @prop {String} options.forerunnerPath - Path to the top level folder for the SDK
     * @prop {String} options.path - Path passed to the GetItems REST call
     * @prop {String} options.view - View passed to the GetItems REST call
     * @prop {String} options.selectedItemPath - Set to select an item in the explorer
     * @prop {Object} options.$scrollBarOwner - Used to determine the scrollTop position
     * @prop {Object} options.navigateTo - Callback function used to navigate to a selected report
     * @prop {Object} options.$appContainer - The container jQuery object that holds the application
     * @prop {Object} options.explorerSettings - Object that stores custom explorer style settings
     * @prop {String} options.rsInstance - Report service instance name
     * @prop {Object} options.userSettings - User settings used for user specific options
     * @prop {Function} options.onInputBlur - Callback function used to handle input blur event
     * @prop {Function} options.onInputFocus - Callback function used to handle input focus event 
     * @example
     * $("#reportExplorerId").reportExplorer({
     *    reportManagerAPI: "./api/ReportManager",
     *    forerunnerPath: "./forerunner/",
     *    path: "/",
     *    view: "catalog",
     *    navigateTo: navigateTo,
     *    $appContainer: me.$container,
     *    explorerSettings: explorerSettings
     * });
     */
    $.widget(widgets.getFullname(widgets.reportExplorer), /** @lends $.forerunner.reportExplorer */ {
        options: {
            reportManagerAPI: forerunner.config.forerunnerAPIBase() + "ReportManager",
            forerunnerPath: forerunner.config.forerunnerFolder(),
            path: null,
            view: null,
            selectedItemPath: null,
            $scrollBarOwner: null,
            navigateTo: null,
            $appContainer: null,
            explorerSettings: null,
            rsInstance: null,
            onInputBlur: null,
            onInputFocus: null,
            userSettings: null,
        },
        /**
         * Save the user settings
         * @function $.forerunner.reportExplorer#saveUserSettings
         *
         * @param {Object} settings - Settings object
         */
        saveUserSettings: function (settings) {
            var me = this;
            var stringified = JSON.stringify(settings);

            var url = forerunner.config.forerunnerAPIBase() + "ReportManager" + "/SaveUserSettings?settings=" + stringified;
            if (me.options.rsInstance) url += "&instance=" + me.options.rsInstance;
            forerunner.ajax.ajax({
                url: url,
                dataType: "json",
                async: false,
                success: function (data) {
                },
                error: function (data) {
                    console.log(data);
                }
            });

        },
        /**
         * Get the user settings.
         * @function $.forerunner.reportExplorer#getUserSettings
         *
         * @return {Object} - User settings
         */
        getUserSettings: function () {
            var me = this;
            return me.options.userSettings;
        },
        _generatePCListItem: function (catalogItem, isSelected) {
            var me = this; 
            var reportThumbnailPath = me.options.reportManagerAPI
              + "/Thumbnail/?ReportPath=" + encodeURIComponent(catalogItem.Path) + "&DefDate=" + catalogItem.ModifiedDate;
            if (me.options.rsInstance)
                reportThumbnailPath += "&instance=" + me.options.rsInstance;
            //Item
            var $item = new $("<div />");
            $item.addClass("fr-explorer-item");
            if (isSelected)
                $item.addClass("fr-explorer-item-selcted");

            var $anchor = new $("<a />");
            $anchor.addClass("fr-explorer-item-image-link");
            //action
            var action;
            if (catalogItem.Type === 1 || catalogItem.Type === 7) {
                    action = "explore";
            }
            else if (catalogItem.Type === 3) {
                switch (catalogItem.MimeType) {
                    case "json/forerunner-dashboard":
                        action = "openDashboard";
                        break;
                    case "json/forerunner-searchfolder":
                        action = "searchfolder";
                        break;
                    default:
                        action = "open";
                        break;
                }
            }
            else {
                action = "browse";
            }

            if (forerunner.device.isTouch()) {
                // Touch devices
                var options = { stop_browser_behavior: { userSelect: "none" }, swipe_max_touches: 22, drag_max_touches: 2 };
                $anchor.hammer(options).on("tap",
                    function (event) {
                        if (me.options.navigateTo) {
                            //On mobile use the browsers native viewer, does not work in IFrame
                            if (action === "open" && forerunner.device.isMobile()) {
                                var fileUrl = me.options.reportManagerAPI + "/Resource?path=" + encodeURIComponent(catalogItem.Path) + "&instance=" + me.options.rsInstance;
                                window.location = fileUrl;
                                return;
                            }
                            me.options.navigateTo(action, catalogItem.Path);
                            event.stopPropagation();
                        }
                    }
                );
                $anchor.hammer(options).on("hold",
                    function (event) {
                        var data = {
                            catalogItem: catalogItem,
                            clientX: event.gesture.touches[0].clientX,
                            clientY: event.gesture.touches[0].clientY
                        };
                        me._onContextMenu.call(me, event, data);
                        event.stopPropagation();
                    }
                );
            } else {
                // Non-touch (PCs)
                $anchor.on("contextmenu", function (event) {
                    // Steal the bowser context menu if we click on a report explorer item
                    var data = {
                        catalogItem: catalogItem,
                        clientX: event.clientX,
                        clientY: event.clientY
                    };
                    me._onContextMenu.call(me, event, data);

                    // Return false here so as to steal the right click from
                    // the browser. We will show the context menu for report
                    // explorer items
                    return false;
                });

                $anchor.on("click", function (event) {
                    if (me.options.navigateTo) {
                        me.options.navigateTo(action, catalogItem.Path);
                    }
                });
            }

            $item.append($anchor);

            //Image Block
            var $imageblock = new $("<div />");
            $imageblock.addClass("fr-report-item-image-block");
            $anchor.append($imageblock);
            var outerImage = new $("<div />");            
            $imageblock.append(outerImage);
           

            //Images
            
            if (catalogItem.Type === 1 || catalogItem.Type === 7) {
                if (isSelected) {
                    outerImage.addClass("fr-explorer-folder-selected");
                }
                else {
                    outerImage.addClass("fr-explorer-folder");
                }
            }
            else if (catalogItem.Type === 3) {//resource files
                var fileTypeClass = me._getFileTypeClass(catalogItem.MimeType);
                outerImage.addClass(fileTypeClass);

                if (catalogItem.MimeType === "json/forerunner-searchfolder" && isSelected) {
                    outerImage.addClass("fr-explorer-searchfolder-selected").removeClass("fr-explorer-searchfolder");
                }
            }
            else {

                var innerImage = new $("<img />");
                $imageblock.append(innerImage);
                var corner = new $("<div />");
                $imageblock.append(corner);
                corner.addClass("fr-explorer-item-earcorner");
                corner.css("background-color", me.$UL.css("background-color"));
                var EarImage = new $("<div />");
                $imageblock.append(EarImage);
                var imageSrc = reportThumbnailPath;
                innerImage.addClass("fr-report-item-inner-image");
                innerImage.addClass("fr-report-item-image-base");
                outerImage.addClass("fr-report-item-image-base");
                EarImage.addClass("fr-report-item-image-base");
                if (isSelected) {
                    outerImage.addClass("fr-report-item-outer-image-selected");
                    EarImage.addClass("fr-explorer-item-ear-selcted");
                }
                else {
                    outerImage.addClass("fr-report-item-outer-image");
                    EarImage.addClass("fr-report-item-ear-image");
                }

                innerImage.attr("src", imageSrc);
                innerImage.error(function () {
                    $(this).attr("src", me.options.forerunnerPath + "ReportExplorer/images/Report-icon.png");
                });

                innerImage.removeAttr("height"); //JQuery adds height for IE8, remove.
            }
            if (isSelected)
                me.$selectedItem = $item;
            
            //Caption
            var $caption = new $("<div />");
            $caption.addClass("fr-explorer-caption");
            var $captiontext = new $("<div />");
            $captiontext.addClass("fr-explorer-item-title");

            var name = catalogItem.Name;
            $captiontext.attr("title", name);
            $captiontext.text(name);
            $caption.append($captiontext);
            $item.append($caption);

            //Description
            var $desc = new $("<div />");
            $desc.addClass("fr-explorer-desc-container");
            var $desctext = new $("<div />");
            $desctext.addClass("fr-explorer-item-desc");

            var description = catalogItem.Description;
            if (description) {
                description = forerunner.helper.htmlDecode(description);

                $desctext.attr("title", description);
                $desctext.text(description);
            }
            $desc.append($desctext);
            $item.append($desc);
           
            return $item;
        },
        _onContextMenu: function (e, data) {
            var me = this;

            if (!me.getUserSettings().adminUI) {
                return;
            }

            var $dlg = me.options.$appContainer.find(".fr-ctx-section");
            if ($dlg.length === 0) {
                $dlg = $("<div class='fr-ctx-section'/>");
                me.options.$appContainer.append($dlg);
                me._contextMenu = $dlg;
            }

            // Aways re-initialize the dialog even if it was created before
            $dlg.reportExplorerContextMenu({
                $appContainer: me.options.$appContainer,
                $reportExplorer: me.element,
                reportManagerAPI: me.options.reportManagerAPI,
                rsInstance: me.options.rsInstance,
                catalogItem: data.catalogItem
            });
            me._contextMenu.reportExplorerContextMenu("openMenu", data.clientX, data.clientY);
        },
        _renderPCView: function (catalogItems) {
            var me = this;

            me.$UL = me.element.find(".fr-report-explorer");
            var decodedPath = me.options.selectedItemPath ? decodeURIComponent(me.options.selectedItemPath) : null;
            me.rmListItems = new Array(catalogItems.length);
            
            for (var i = 0; i < catalogItems.length; i++) {
                var catalogItem = catalogItems[i];
                var isSelected = false;
                if (decodedPath && decodedPath === decodeURIComponent(catalogItem.Path)) {
                    me.selectedItem = i;
                    isSelected = true;
                }
                me.rmListItems[i] = me._generatePCListItem(catalogItem, isSelected);
                me.$UL.append(me.rmListItems[i]);
            }
            me.$UL.find(".fr-explorer-item-title").multiLineEllipsis();
            me.$UL.find(".fr-explorer-item-desc").multiLineEllipsis();
        },
        _render: function (catalogItems) {
            var me = this;
            me.element.html("<div class='fr-report-explorer fr-core-widget'></div>");
            if (me.colorOverrideSettings && me.colorOverrideSettings.explorer) {
                $(".fr-report-explorer", me.element).addClass(me.colorOverrideSettings.explorer);
            }
            me._renderPCView(catalogItems);
            if (me.$selectedItem) {
                setTimeout(function () { me.$explorer.scrollTop(me.$selectedItem.offset().top - 50); }, 100);  //This is a hack for now
                setTimeout(function () { me.$explorer.scrollLeft(me.$selectedItem.offset().left - 20); }, 100);  //This is a hack for now
            } else {
                setTimeout(function () { me.$explorer.scrollTop(0); }, 100);
                setTimeout(function () { me.$explorer.scrollLeft(0); }, 100);
            }
        },
        _renderResource: function (path) {
            var me = this;

            var url = me.options.reportManagerAPI + "/Resource?";
            url += "path=" + encodeURIComponent(path);
            url += "&instance=" + me.options.rsInstance;

            var $if = $("<iframe/>");
            $if.addClass("fr-report-explorer fr-core-widget fr-explorer-iframe");
            $if.attr("src", url);
            //$if.attr("scrolling", "no");
            me.element.append($if);

            //for IE iframe onload is not working so used below compatible code to detect readyState
            if (forerunner.device.isMSIE()) {
                var frame = $if[0];

                var fmState = function () {
                    var state = null;
                    if (document.readyState) {
                        try {
                            state = frame.document.readyState;
                        }
                        catch (e) { state = null; }

                        if (state === "complete" || !state) {//loading,interactive,complete       
                            me._setIframeHeight(frame);
                        }
                        else {
                            //check frame document state until it turn to complete
                            setTimeout(fmState, 10);
                        }
                    }
                };

                if (fmState.TimeoutInt) {
                    clearTimeout(fmState.timeoutInt);
                    fmState.TimeoutInt = null;
                }

                fmState.timeoutInt = setTimeout(fmState, 100);
            }
            else {
                $if.load(function () {
                    me._setIframeHeight(this);
                });
            }
        },
        //set iframe height with body height
        _setIframeHeight: function (frame) {
            var me = this;
            //use app container height minus toolbar height
            //also there is an offset margin-botton:-20px defined in ReportExplorer.css 
            //to prevent document scroll bar (except IE8)
            var iframeHeight = me.options.$appContainer.height() - 38;
            frame.style.height = iframeHeight + "px";
        },
        /**
         * Returns the last fetch view and path
         *
         * @function $.forerunner.reportExplorer#getLastFetched
         * @return {Object} - Last fetch object that contain view and path, return null if not exist.
         */
        getLastFetched: function () {
            var me = this;
            if (me.lastFetched) {
                return me.lastFetched;
            }

            return null;
        },
        /*
         * Will refresh the current report explorer view from the server
         *
         * @function $.forerunner.reportExplorer#refresh
         */
        refresh: function() {
            var me = this;
            me._fetch(me.lastFetched.view, me.lastFetched.path);
        },
        _fetch: function (view, path) {
            var me = this;
            me.lastFetched = {
                view: view,
                path: path
            };
            me._trigger(events.beforeFetch, null, { reportExplorer: me, lastFetched: me.lastFetched, newPath: path });

            if (view === "resource") {
                me._renderResource(path);
                return;
            }

            if (view === "search") {
                me._searchItems(path);
                return;
            }

            me.parentPath = null;
            if (view === "searchfolder") {
                me.parentPath = forerunner.helper.getParentPath(me.options.path) || "/";
            }

            var url = me.options.reportManagerAPI + "/GetItems";
            if (me.options.rsInstance) url += "?instance=" + me.options.rsInstance;
            forerunner.ajax.ajax({
                dataType: "json",
                url: url,
                async: false,
                data: {
                    view: view,
                    path: path
                }
            }).done(
                 function (data) {
                     if (data.Exception) {
                         forerunner.dialog.showMessageBox(me.options.$appContainer, data.Exception.Message, locData.messages.catalogsLoadFailed);
                     }
                     else {
                         me._render(data);
                     }
                 }).fail(
                function (jqXHR, textStatus, errorThrown) {
                    console.log(textStatus);
                    forerunner.dialog.showMessageBox(me.options.$appContainer, textStatus + " - " + errorThrown, locData.messages.catalogsLoadFailed);
                });
        },
        _initCallbacks: function () {
            var me = this;
            // Hook up any / all custom events that the report viewer may trigger
        },
        _initOverrides: function () {
            var me = this;
            if (me.options.explorerSettings.CustomColors) {
                var decodedPath = decodeURIComponent(me.options.path);
                var colorOverrideSettings = me.options.explorerSettings.CustomColors[decodedPath];
                if (colorOverrideSettings) {
                    me.colorOverrideSettings = colorOverrideSettings;
                    // Optimize for an exact match
                    return;
                }
                for (var key in me.options.explorerSettings.CustomColors) {
                    if (decodedPath.indexOf(key, 0) === 0) {
                        me.colorOverrideSettings = me.options.explorerSettings.CustomColors[key];
                        return;
                    }
                }
            }
        },
        _init: function () {
            var me = this;
            me.$RMList = null;
            me.$UL = null;
            me.rmListItems = null;
            me.colorOverrideSettings = null;
            me.selectedItem = 0;
            me.isRendered = false;
            me.$explorer = me.options.$scrollBarOwner ? me.options.$scrollBarOwner : $(window);
            me.$selectedItem = null;

            if (me.options.view === "catalog" || me.options.view === "searchfolder") {
                me._checkPermission();
            }

            if (me.options.explorerSettings) {
                me._initOverrides();
            }
            me._fetch(me.options.view, me.options.path);

            if (!me.subscriptionModel) {
                me.subscriptionModel = $({}).subscriptionModel({ rsInstance: me.options.rsInstance });
            }

            var $dlg = me.options.$appContainer.find(".fr-us-section");
            if ($dlg.length === 0) {
                $dlg = new $("<div class='fr-us-section fr-dialog-id fr-core-dialog-layout fr-core-widget'/>");
                $dlg.userSettings({
                    $appContainer: me.options.$appContainer,
                    $reportExplorer: me.element
                });
                me.options.$appContainer.append($dlg);
            }
            me._userSettingsDialog = $dlg;

            $dlg = me.options.$appContainer.find(".fr-mms-section");
            if ($dlg.length === 0) {
                $dlg = new $("<div class='fr-mms-section fr-dialog-id fr-core-dialog-layout fr-core-widget'/>");
                $dlg.manageMySubscriptions({
                    $appContainer: me.options.$appContainer,
                    $reportExplorer: me.element
                });
                me.options.$appContainer.append($dlg);
            }
            me._manageMySubscriptionsDialog = $dlg;

            $dlg = me.options.$appContainer.find(".fr-sf-section");
            if ($dlg.length === 0) {
                $dlg = new $("<div class='fr-sf-section fr-dialog-id fr-core-dialog-layout fr-core-widget'/>");
                $dlg.reportExplorerSearchFolder({
                    $appContainer: me.options.$appContainer,
                    subscriptionModel: me.subscriptionModel
                });
                me.options.$appContainer.append($dlg);
            }
            me._searchFolderDialog = $dlg;
        },
        _checkPermission: function () {
            var me = this;
            //create resource: create resource file (search folder/dashboard)
            //update properties: update report properties (tags)
            //for more properties, add to the list
            var permissionList = ["Create Resource", "Update Properties"];
            me.permissions = forerunner.ajax.hasPermission(me.options.path, permissionList.join(","));
        },
        /**
         * Get user permission for current path
         *
         * @function $.forerunner.reportExplorer#getPermission
         * 
         * @return {Object} - Permission jQuery object
         */
        getPermission: function () {
            var me = this;
            return me.permissions;
        },
        /**
         * Show the create dashboard modal dialog.
         *
         * @function $.forerunner.reportExplorer#showCreateDashboardDialog
         */
        showCreateDashboardDialog: function () {
            var me = this;
            var $dlg = me.options.$appContainer.find(".fr-cdb-section");
            if ($dlg.length === 0) {
                $dlg = $("<div class='fr-cdb-section fr-dialog-id fr-core-dialog-layout fr-core-widget'/>");
                me.options.$appContainer.append($dlg);
                me._createDashboardDialog = $dlg;
            }

            // Aways re-initialize the dialog even if it was created before
            $dlg.createDashboard({
                $appContainer: me.options.$appContainer,
                $reportExplorer: me.element,
                parentFolder: me.lastFetched.path,
                reportManagerAPI: me.options.reportManagerAPI,
                rsInstance: me.options.rsInstance
            });
            me._createDashboardDialog.createDashboard("openDialog");
        },
        /**
         * Show the user settings modal dialog.
         *
         * @function $.forerunner.reportExplorer#showUserSettingsDialog
         */
        showUserSettingsDialog: function () {
            var me = this;
            me._userSettingsDialog.userSettings("openDialog");
        },
        /**
         * Show the manage my subscriptions modal dialog.
         *
         * @function $.forerunner.reportExplorer#showManageMySubscriptionsDialog
         */
        showManageMySubscriptionsDialog: function () {
            var me = this;
            me._manageMySubscriptionsDialog.userSettings("openDialog");
        },
        /**
         * Show the search folder modal dialog.
         *
         * @function $.forerunner.reportExplorer#showExplorerSearchFolderDialog
         */
        showExplorerSearchFolderDialog: function () {
            var me = this;
            me._searchFolderDialog.reportExplorerSearchFolder("openDialog");
        },
        /**
         * Set search folder content, it not exist then create it, if exist then update the content.
         *
         * @function $.forerunner.reportExplorer#setSearchFolder
         *
         * @param {Object} searchFolder - Search folder object.
         */
        setSearchFolder: function (searchFolder) {
            var me = this;
            var url = me.options.reportManagerAPI + "/SaveResource";
            
            forerunner.ajax.ajax({
                url: url,
                async: false,
                type: "POST",
                dataType: "text",
                data: {
                    resourceName: searchFolder.searchFolderName,
                    parentFolder: me.parentPath || me.options.path,
                    contents: JSON.stringify(searchFolder.content),
                    mimetype: "json/forerunner-searchfolder",
                    instance: me.options.rsInstance,
                    overwrite: searchFolder.overwrite
                },
                success: function (data) {
                    //refresh the page if search folder created succeeded
                    location.reload(true);
                    //bug 1078, not show succeeded dialig, instead just close current dialog
                    //forerunner.dialog.showMessageBox(me.options.$appContainer, locData.messages.saveSearchFolderSucceeded, locData.toolbar.searchFolder);
                },
                error: function (data) {
                    forerunner.dialog.showMessageBox(me.options.$appContainer, locData.messages.saveSearchFolderFailed, locData.toolbar.searchFolder);
                }
            });
        },
        _searchItems: function (keyword) {
            var me = this;

            if (keyword === "") {
                forerunner.dialog.showMessageBox(me.options.$appContainer, locData.explorerSearch.emptyError, locData.dialog.title);
                return;
            }
            
            var url = me.options.reportManagerAPI + "/FindItems";
            if (me.options.rsInstance) url += "?instance=" + me.options.rsInstance;
            var searchCriteria = { SearchCriteria: [{ Key: "Name", Value: keyword }, { Key: "Description", Value: keyword }] };

            //specify the search folder, not default to global
            //var folder = me.priorExplorerPath ? me.priorExplorerPath : "";
            //folder = folder.replace("%2f", "/");

            forerunner.ajax.ajax({
                dataType: "json",
                url: url,
                async: false,
                data: {
                    folder: "",
                    searchOperator: "",
                    searchCriteria: JSON.stringify(searchCriteria)
                },
                success: function (data) {
                    if (data.Exception) {
                        forerunner.dialog.showMessageBox(me.options.$appContainer, data.Exception.Message, locData.messages.catalogsLoadFailed);
                    }
                    else {
                        if (data.length) {
                            me._render(data);
                        }
                        else {
                            me._showNotFound();
                        }
                    }
                },
                error: function (data) {
                    console.log(data);
                    forerunner.dialog.showMessageBox(me.options.$appContainer, locData.messages.catalogsLoadFailed);
                }
            });
        },
        _showNotFound:function(){
            var me = this;
            var $explorer = new $("<div class='fr-report-explorer fr-core-widget'></div>");
            var $notFound = new $("<div class='fr-explorer-notfound'>" + locData.explorerSearch.notFound + "</div>");
            $explorer.append($notFound);            
            me.element.append($explorer);
        },
        /**
         * Function execute when input element blur
         *
         * @function $.forerunner.reportExplorer#onInputBlur
         */
        onInputBlur: function () {
            var me = this;
            if (me.options.onInputBlur)
                me.options.onInputBlur();
        },
        /**
         * Function execute when input element focus
         *
         * @function $.forerunner.reportExplorer#onInputFocus
         */
        onInputFocus: function () {
            var me = this;
            if (me.options.onInputFocus)
                me.options.onInputFocus();
        },
        /**
         * Get current explorer page path
         *
         * @function $.forerunner.reportExplorer#getCurrentPath
         */
        getCurrentPath: function () {
            var me = this;
            return decodeURIComponent(me.options.path);
        },
        /**
         * Get current explorer page view
         *
         * @function $.forerunner.reportExplorer#getCurrentView
         */
        getCurrentView: function () {
            var me = this;
            return me.options.view;
        },
        _getFileTypeClass: function (mimeType) {
            var fileTypeClass = null,
                isFeatureIcon = false;

            switch (mimeType) {
                case "application/pdf":
                    fileTypeClass = "fr-icons128x128-file-pdf";
                    break;
                case "application/vnd.ms-excel":
                    fileTypeClass = "fr-icons128x128-file-xls";
                    break;
                case "application/msword":
                    fileTypeClass = "fr-icons128x128-file-doc";
                    break;
                case "application/vnd.ms-powerpoint":
                    fileTypeClass = "fr-icons128x128-file-ppt";
                    break;
                case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"://xlsx
                    fileTypeClass = "fr-icons128x128-file-xls";
                    break;
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document"://docx
                    fileTypeClass = "fr-icons128x128-file-doc";
                    break;
                case "application/vnd.openxmlformats-officedocument.presentationml.presentation"://pptx
                    fileTypeClass = "fr-icons128x128-file-ppt";
                    break;
                case "text/html":
                    fileTypeClass = "fr-icons128x128-file-html";
                    break;
                case "audio/mpeg":
                    fileTypeClass = "fr-icons128x128-file-mp3";
                    break;
                case "image/tiff":
                    fileTypeClass = "fr-icons128x128-file-tiff";
                    break;
                case "application/xml":
                    fileTypeClass = "fr-icons128x128-file-xml";
                    break;
                case "image/jpeg":
                    fileTypeClass = "fr-icons128x128-file-jpeg";
                    break;
                case "application/x-zip-compressed":
                    fileTypeClass = "fr-icons128x128-file-zip";
                    break;
                case "application/octet-stream":
                    fileTypeClass = "fr-icons128x128-file-ini";
                    break;
                case "image/gif":
                    fileTypeClass = "fr-icons128x128-file-gif";
                    break;
                case "image/png":
                    fileTypeClass = "fr-icons128x128-file-png";
                    break;
                case "image/bmp":
                    fileTypeClass = "fr-icons128x128-file-bmp";
                    break;
                case "text/plain":
                    fileTypeClass = "fr-icons128x128-file-text";
                    break;
                case "text/css":
                    fileTypeClass = "fr-icons128x128-file-css";
                    break;
                case "json/forerunner-dashboard":
                    isFeatureIcon = true;
                    fileTypeClass = "fr-icons128x128-file-dashboard";
                    break;
                case "json/forerunner-searchfolder":
                    isFeatureIcon = true;
                    fileTypeClass = "fr-explorer-searchfolder";
                    break;
                default://unknown
                    fileTypeClass = "fr-icons128x128-file-unknown";
                    break;
            }

            if (isFeatureIcon === false) {
                fileTypeClass = "fr-icons128x128 " + fileTypeClass;
            }

            return fileTypeClass;
        }
    });  // $.widget
});  // function()