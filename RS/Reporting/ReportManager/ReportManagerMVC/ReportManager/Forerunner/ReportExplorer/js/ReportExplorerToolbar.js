﻿/**
 * @file Contains the reportExplorerToolbar widget.
 *
 */

var forerunner = forerunner || {};

// Forerunner SQL Server Reports
forerunner.ssr = forerunner.ssr || {};
forerunner.ssr.tools = forerunner.ssr.tools || {};
forerunner.ssr.tools.reportExplorerToolbar = forerunner.ssr.tools.reportExplorerToolbar || {};

$(function () {
    var widgets = forerunner.ssr.constants.widgets;
    var tb = forerunner.ssr.tools.reportExplorerToolbar;
    var tg = forerunner.ssr.tools.groups;
    var btnActiveClass = "fr-toolbase-persistent-active-state";
    var locData = forerunner.localize.getLocData(forerunner.config.forerunnerFolder() + "ReportViewer/loc/ReportViewer");

    /**
     * Toolbar widget used by the Report Explorer
     *
     * @namespace $.forerunner.reportExplorerToolbar
     * @prop {Object} options - The options for toolbar
     * @prop {Object} options.navigateTo - Callback function used to navigate to a specific page
     * @prop {String} options.toolClass - The top level class for this tool (E.g., fr-toolbar)
     * @example
     * $("#reportExplorerToolbarId").reportExplorerToolbar({
     *  navigateTo: navigateTo
     * });
     */
    $.widget(widgets.getFullname(widgets.reportExplorerToolbar), $.forerunner.toolBase, /** @lends $.forerunner.reportExplorerToolbar */ {
        options: {
            navigateTo: null,
            toolClass: "fr-toolbar",
            $appContainer: null,
            $reportExplorer: null
        },
        /**
         * Set specify tool to active state
         *
         * @function $.forerunner.reportExplorerToolbar#setFolderBtnActive
         * @param {String} selectorClass - selector class name
         */
        setFolderBtnActive: function (selectorClass) {
            var me = this;
            me._clearFolderBtnState();
            if (selectorClass) {
                var $btn = me.element.find("." + selectorClass);
                $btn.addClass(btnActiveClass);
            }
        },
        setSearchKeyword: function (keyword) {
            var me = this;

            me.element.find(".fr-rm-keyword-textbox").val(keyword);
        },
        _clearFolderBtnState: function () {
            var me = this;
            $.each(me.folderBtns, function (index, $btn) {
                $btn.removeClass(btnActiveClass);
            });
        },
        _initCallbacks: function () {
            var me = this;
            // Hook up any / all custom events that the report viewer may trigger

            // Hook up the toolbar element events
            me.enableTools([tb.btnMenu, tb.btnHome, tb.btnBack, tb.btnFav, tb.btnRecent, tg.explorerFindGroup]);
            if (forerunner.ajax.isFormsAuth()) {
                me.enableTools([tb.btnLogOff]);
            }

            me.element.find(".fr-rm-keyword-textbox").watermark(locData.explorerSearch.search, { useNative: false, className: "fr-param-watermark" });
            //trigger window resize event to regulate toolbar buttons visibility
            $(window).resize();
        },
        _init: function () {
            var me = this;
            me._super();

            me.element.empty();
            me.element.append($("<div class='" + me.options.toolClass + " fr-core-widget'/>"));
            me.addTools(1, true, [tb.btnMenu, tb.btnBack, tb.btnSetup, tb.btnHome, tb.btnRecent, tb.btnFav, tg.explorerFindGroup]);
            if (forerunner.ajax.isFormsAuth()) {
                me.addTools(7, true, [tb.btnLogOff]);
            }
            me._initCallbacks();

            // Hold onto the folder buttons for later
            var $btnHome = me.element.find("." + tb.btnHome.selectorClass);
            var $btnRecent = me.element.find("." + tb.btnRecent.selectorClass);
            var $btnFav = me.element.find("." + tb.btnFav.selectorClass);
            me.folderBtns = [$btnHome, $btnRecent, $btnFav];
        },

        _destroy: function () {
        },

        _create: function () {
            var me = this;

            $(window).resize(function () {
                me.onWindowResize.call(me);
            });
        },
    });  // $.widget
});  // function()
