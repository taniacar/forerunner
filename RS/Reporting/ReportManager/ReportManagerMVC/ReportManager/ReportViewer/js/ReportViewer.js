﻿// Assign or create the single globally scoped variable
var forerunner = forerunner || {};

// Forerunner SQL Server Reports
forerunner.ssr = forerunner.ssr || {};

$(function () {
    var widgets = forerunner.ssr.constants.widgets;
    var events = forerunner.ssr.constants.events;
    var messages = forerunner.ssr.constants.messages;
    var navigateType = forerunner.ssr.constants.navigateType;

    // The Floating header object holds pointers to the tablix and its row and col header objects
    function floatingHeader($tablix, $rowHeader, $colHeader) {
        this.$tablix = $tablix;
        this.$rowHeader = $rowHeader;
        this.$colHeader = $colHeader;
    }

    // The page object holds the data for each page
    function reportPage($container, reportObj) {
        this.reportObj = reportObj;
        this.$container = $container;
        this.isRendered = false;
    }

    // report viewer widget
    $.widget(widgets.getFullname(widgets.reportViewer), {
        // Default options
        options: {
            reportServerURL: null,
            reportViewerAPI: null,
            reportPath: null,
            pageNum: 1,
            pingInterval: 300000,
            toolbarHeight: 0,
            setPageDone: null,
            pageNav: null,
            paramArea: null
        },

        _destroy: function () {
        },

        // Constructor
        _create: function () {
            var me = this;

            setInterval(function () { me._sessionPing(); }, this.options.pingInterval);

            // ReportState
            me.actionHistory = [];
            me.curPage = 0;
            me.pages = {};
            me.sessionID = "";
            me.numPages = 0;
            me.lock = 0;
            me.$reportContainer = new $("<DIV class='fr-report-container'/>");
            me.$reportAreaContainer = null;
            me.$loadingIndicator = new $("<div class='fr-report-loading-indicator'></div>").text(messages.loading);
            me.floatingHeaders = [];
            me.paramLoaded = false;
            me.scrollTop = 0;
            me.scrollLeft = 0;
            me.loadLock = 0;
            me.finding = false;
            me.findStart = null;
            me.hasDocMap = false;
            me.togglePageNum = 0;
            me.findKeyword = null;
            me.element.append(me.$loadingIndicator);
  
            $(window).scroll(function () { me._updateTableHeaders(me); });

            //Log in screen if needed

            //load the report Page requested
            me.element.append(me.$reportContainer);
            me._addLoadingIndicator();
            me._loadParameters(me.options.pageNum);
        },
        getCurPage: function () {
            var me = this;
            return me.curPage;
        },
        getNumPages: function () {
            var me = this;
            return me.numPages;
        },
        getReportViewerAPI: function () {
            var me = this;
            return me.options.reportViewerAPI;
        },
        getReportServerURL: function () {
            var me = this;
            return me.options.reportServerURL;
        },
        getReportPath: function () {
            var me = this;
            return me.options.reportPath;
        },
        getSessionID: function () {
            var me = this;
            return me.sessionID;
        },
        getHasDocMap: function () {
            var me = this;
            return me.hasDocMap;
        },
        _setColHeaderOffset: function ($tablix, $colHeader) {
            //Update floating column headers
            //var me = this;
            if (!$colHeader)
                return;

            var offset = $tablix.offset();
            var scrollLeft = $(window).scrollLeft();
            if ((scrollLeft > offset.left) && (scrollLeft < offset.left + $tablix.width())) {
                //$colHeader.css("top", $tablix.offset.top);
                $colHeader.css("left", Math.min(scrollLeft - offset.left, $tablix.width() - $colHeader.width()) + "px");
                $colHeader.fadeIn("fast");
            }
            else {
                $colHeader.hide();

            }
        },
        _setRowHeaderOffset: function ($tablix, $rowHeader) {
            //  Update floating row headers
            var me = this;
            if (!$rowHeader)
                return;

            var offset = $tablix.offset();
            var scrollTop = $(window).scrollTop();
            if ((scrollTop > offset.top) && (scrollTop < offset.top + $tablix.height())) {
                $rowHeader.css("top", (Math.min((scrollTop - offset.top), ($tablix.height() - $rowHeader.height())) + me.options.toolbarHeight) + "px");
                $rowHeader.fadeIn("fast");
            }
            else {
                $rowHeader.hide();
            }
        },
        _addLoadingIndicator: function () {
            var me = this;
           
            me.loadLock = 1;
            setTimeout(function () { me.showLoadingIndictator(me); }, 500);
        },
        showLoadingIndictator: function (me) {
            if (me.loadLock === 1) {
                //212 is static value for loading indicator width
                var scrollLeft = me.$reportContainer.width() - 212;

                me.$loadingIndicator.css("top", me.$reportContainer.scrollTop() + 100 + "px")
                    .css("left", scrollLeft > 0 ? scrollLeft / 2 : 0 + "px");

                me.$reportContainer.css({ opacity: 0.5 });
                me.$loadingIndicator.show();
            }
        },
        removeLoadingIndicator: function () {
            var me = this;
            me.loadLock = 0;
            me.$reportContainer.css({ opacity: 1 });
            me.$loadingIndicator.hide();
        },
        _setPage: function (pageNum) {
            //  Load a new page into the screen and udpate the toolbar
            var me = this;

            if (!me.pages[pageNum].isRendered)
                me._renderPage(pageNum);
            if (!me.$reportAreaContainer) {
                me.$reportAreaContainer = $("<Div/>");
                me.$reportAreaContainer.addClass("fr-report-areacontainer");
                me.$reportContainer.append(me.$reportAreaContainer);
                me.$reportAreaContainer.append(me.pages[pageNum].$container);
                me._touchNav();
                me.pages[pageNum].$container.fadeIn();
            }
            else {
                me.$reportAreaContainer.find(".Page").detach();
                me.$reportAreaContainer.append(me.pages[pageNum].$container);

                if (me.curPage !== null && me.curPage > pageNum) {
                    me.pages[pageNum].$container.show();
                } else {
                    me.pages[pageNum].$container.show();
                }

            }
                       
            me.curPage = pageNum;

            // Trigger the change page event to allow any widget (E.g., toolbar) to update their view
            if (me.options.setPageDone) {
                me._trigger(events.setPageDone);
            }
            me._trigger(events.changePage, null, { newPageNum: pageNum, paramLoaded: me.paramLoaded });

            $(window).scrollLeft(me.scrollLeft);
            $(window).scrollTop(me.scrollTop);
            me.lock = 0;
        },
        _touchNav: function () {
            // Touch Events
            var me = this;
            $(me.element).swipe({
                fallbackToMouseEvents: false,
                allowPageScroll: "auto",
                swipe: function (event, direction, distance, duration, fingerCount) {
                    alert(direction);
                    if (direction === "left" || direction === "up")
                        me.navToPage(me.curPage + 1);
                    else
                        me.navToPage(me.curPage - 1);
                },
                swipeStatus: function (event, phase, direction, distance) {
                    if (phase === "start")
                        me._hideTableHeaders();
                },
                tap: function (event, target) {
                    $(target).trigger("click");
                },
                longTapThreshold: 1000,
                threshold: 0,
            });
        },
        refreshReport: function () {
            // Remove all cached data on the report and re-run
            var me = this;
            var paramList = null;

            if (me.lock === 1)
                return;

            me.sessionID = "";
            me.lock = 1;

            if (me.paramLoaded === true) {                
                paramList = me.options.paramArea.reportParameter("getParamsList");
            }
            me._resetViewer(true);
            me._loadPage(1, false, null, paramList,true);            
        },
        navToPage: function (newPageNum) {
            var me = this;
            if (newPageNum === me.curPage || me.lock === 1)
                return;

            me.scrollLeft = 0;
            me.scrollTop = 0;

            if (newPageNum > me.numPages) {
                newPageNum = 1;
            }
            if (newPageNum < 1) {
                newPageNum = me.numPages;
            }
            
            if (newPageNum !== me.curPage) {
                if (me.lock === 0) {
                    me.lock = 1;
                    me._loadPage(newPageNum, false);
                }
            }
        },
        showDocMap: function () {
            if ($(".fr-docmap-panel").length > 0)
                $(".fr-docmap-panel").animate({ height: "toggle" }, 100, function () {
                    $(".fr-docmap-border").css("height", document.body.clientHeight - $(".fr-docmap-panel").offset().top);
                });
        },
        _cachePages: function (initPage) {
            var me = this;
             
            var low = initPage - 1;
            var high = initPage + 1;
            if (low < 1) low = 1;
            if (high > me.numPages) high = me.numPages;

            for (var i = low; i <= high; i++) {
                if (!me.pages[i])
                    if (i !== initPage)
                        me._loadPage(i, true);
            }

        },
        back: function () {
            var me = this;
            var action = me.actionHistory.pop();
            if (action) {
                
                me.options.reportPath = action.ReportPath;
                me.sessionID = action.SessionID;
                me.scrollLeft = action.ScrollLeft;
                me.scrollTop = action.ScrollTop;
                
                me._trigger(events.drillBack);
                me._removeParameters();
                me._loadPage(action.CurrentPage, false, null, null, true);
            }
            else {
                me._trigger(events.back, null, { path: me.options.reportPath });
            }
        },
        showNav: function () {
            var me = this;
            if (me.options.pageNav){
                me.options.pageNav.pageNav("showNav");
            }
        },
        flushCache: function () {
            var me = this;
            me.pages = {};
            if (me.options.pageNav)
                me.options.pageNav.pageNav("reset");
        },
        _prepareAction: function () {
            var me = this;

            if (me.togglePageNum !== me.curPage || me.togglePageNum  === 0) {
                $.ajax({
                    url: me.options.reportViewerAPI + "/GetReportJSON/",
                    data: {
                        ReportServerURL: me.options.reportServerURL,
                        ReportPath: me.options.reportPath,
                        SessionID: me.sessionID,
                        PageNumber: me.curPage,
                        ParameterList: ""
                    },
                    dataType: "json",
                    async: false,
                    success: function (data) {
                        me.togglePageNum = me.curPage;
                    },
                    fail: function () { alert("Fail"); }
                });
            }
        },
        sort: function (direction, id) {
            //Go the other dirction from current
            var me = this;
            var newDir;
            var sortDirection = forerunner.ssr.constants.sortDirection;

            if (direction === sortDirection.asc)
                newDir = sortDirection.desc;
            else
                newDir = sortDirection.asc;

            $.getJSON(me.options.reportViewerAPI + "/SortReport/", {
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                SortItem: id,
                Direction: newDir
            }).done(function (data) {
                me.numPages = data.NumPages;
                me._loadPage((data.NewPage), false, null, null, true);
            })
            .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        toggleItem: function (toggleID) {
            var me = this;
            me._prepareAction();

            $.getJSON(me.options.reportViewerAPI + "/NavigateTo/", {
                NavType: navigateType.toggle,
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                UniqueID: toggleID
            }).done(function (data) {
                if (data.Result === true) {
                    me.scrollLeft = $(window).scrollLeft();
                    me.scrollTop = $(window).scrollTop();

                    me.pages[me.curPage] = null;
                    me._loadPage(me.curPage, false);
                }
            })
           .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        navigateBookmark: function (bookmarkID) {
            var me = this;
            me._prepareAction();
            $.getJSON(me.options.reportViewerAPI + "/NavigateTo/", {
                NavType: navigateType.bookmark,
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                UniqueID: bookmarkID
            }).done(function (data) {
                if (data.NewPage === me.curPage) {
                    me._navToLink(bookmarkID);
                } else {
                    me.backupCurPage();
                    me._loadPage(data.NewPage, false, bookmarkID);
                }
            })
           .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        navigateDrillthrough: function (drillthroughID) {
            var me = this;
            me._prepareAction();
            $.getJSON(me.options.reportViewerAPI + "/NavigateTo/", {
                NavType: navigateType.drillThrough,
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                UniqueID: drillthroughID
            }).done(function (data) {
                me.backupCurPage();
                if (data.Exception)
                    me.$reportAreaContainer.find(".Page").reportRender("writeError", data);
                else {
                    me.sessionID = data.SessionID;
                    me.options.reportPath = data.ReportPath;
                    
                    if (data.ParametersRequired) {
                        me.$reportAreaContainer.find(".Page").detach();
                        me._setScrollLocation(0, 0);
                        me._showParameters(1, data.Parameters);
                    }
                    else {
                        me._setScrollLocation(0, 0);
                        me._loadPage(1, false, null, null, true);
                    }
                }

            })
           .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        navigateDocumentMap: function (docMapID) {
            var me = this;
            $.getJSON(me.options.reportViewerAPI + "/NavigateTo/", {
                NavType: navigateType.docMap,
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                UniqueID: docMapID
            }).done(function (data) {
                me.backupCurPage();
                me._loadPage(data.NewPage, false, null);
            })
           .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        backupCurPage: function () {
            var me = this;
            me.actionHistory.push({ ReportPath: me.options.reportPath, SessionID: me.sessionID, CurrentPage: me.curPage, ScrollTop: $(window).scrollTop(), ScrollLeft: $(window).scrollLeft() });
        },
        _setScrollLocation: function (top, left) {
            var me = this;
            me.scrollLeft = left;
            me.scrollTop = top;
        },
        find: function (keyword,startPage, endPage) {
            var me = this;
            if (keyword === "") return;

            if (!me.findKeyword || me.findKeyword !== keyword) { me.findKeyword = keyword; me.findStart = null; }

            if (startPage === undefined) startPage = me.getCurPage();
            if (endPage === undefined) endPage = me.getNumPages();

            if (me.findStart === null) me.findStart = startPage;

            $.getJSON(me.options.reportViewerAPI + "/FindString/", {
                ReportServerURL: me.options.reportServerURL,
                SessionID: me.sessionID,
                StartPage: startPage,
                EndPage: endPage,
                FindValue: keyword
            }).done(function (data) {
                if (data.NewPage !== 0) {
                    me.finding = true;
                    if (data.NewPage !== me.curPage) {
                        me.options.setPageDone = function () { me.setFindHighlight(keyword); };
                        me.pages[data.NewPage] = null;
                        me._loadPage(data.NewPage, false);
                    } else {
                        me.setFindHighlight(keyword);
                    }
                }
                else {
                    if (me.finding === true) {
                        alert(messages.completeFind);
                        me.resetFind();
                    }
                    else
                        alert(messages.keyNotFound);
                }
            })
          .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        findNext: function (keyword) {
            var me = this;
            $(".fr-render-find-keyword").filter(".fr-render-find-highlight").first().removeClass("fr-render-find-highlight");

            var $nextWord = $(".fr-render-find-keyword").filter(":visible").filter(".Unread").first();
            if ($nextWord.length > 0) {
                $nextWord.removeClass("Unread").addClass("fr-render-find-highlight").addClass("Read");
                $(document).scrollTop($nextWord.offset().top - 100);
            }
            else {
                if (me.getNumPages() === 1) {
                    alert(messages.completeFind);
                    me.resetFind();
                    return;
                }

                if (me.getCurPage() + 1 <= me.getNumPages())
                    me.find(keyword, me.getCurPage() + 1);
                else if (me.findStart > 1)
                    me.find(keyword, 1, me.findStart - 1);
                else {
                    alert(messages.completeFind);
                    me.resetFind();
                }
            }
        },
        setFindHighlight: function (keyword) {
            var me = this;
            $(me).clearHighLightWord();
            me.$reportContainer.highLightWord(keyword);

            //Highlight the first match.
            var $item = $(".fr-render-find-keyword").filter(":visible").filter(".Unread").first();
            $item.removeClass("Unread").addClass("fr-render-find-highlight").addClass("Read");

            $(document).scrollTop($item.offset().top - 100);
        },
        resetFind: function () {
            var me = this;
            me.finding = false;
            me.findStart = null;
            me.findKeyword = null;
        },
        showExport: function () {
            if ($(".fr-render-export-panel").is(":hidden")) {
                var $export = $(".fr-button-export").filter(":visible");
                $(".fr-render-export-panel").css("left", $export.offset().left);
            }
            $(".fr-render-export-panel").toggle();
        },
        exportReport: function (exportType) {
            var me = this;
            $(".fr-render-export-panel").toggle();
            var url = me.options.reportViewerAPI + "/ExportReport/?ReportServerURL=" + me.getReportServerURL() + "&ReportPath=" + me.getReportPath() + "&SessionID=" + me.getSessionID() + "&ParameterList=&ExportType=" + exportType;
            window.open(url);
        },

        //Page Loading
        _loadParameters: function (pageNum) {
            var me = this;
            $.getJSON(me.options.reportViewerAPI + "/GetParameterJSON/", {
                ReportServerURL: me.options.reportServerURL,
                ReportPath: me.options.reportPath
            })
           .done(function (data) {
               me._addLoadingIndicator();
               me._showParameters(pageNum, data);
           })
           .fail(function () {
               console.log("error");
               me.removeLoadingIndicator();
           });
        },
        _showParameters: function (pageNum, data) {
            var me = this;
            if (data.Type === "Parameters") {
                me._removeParameters();
               
                var $paramArea = me.options.paramArea;
                if ($paramArea) {
                    me._trigger(events.showParamArea);
                    $paramArea.reportParameter("writeParameterPanel", data, me, pageNum, false);
                    me.paramLoaded = true;
                }
            }
            else if (data.Exception) {
                me.$reportContainer.reportRender({ reportViewer: this });
                me.$reportContainer.reportRender("writeError", data);
                me.removeLoadingIndicator();
            }
            else {
                me._loadPage(pageNum, false);
            }
        },
        _removeParameters: function () {
            var me = this;
            if (me.paramLoaded === true) {
                var $paramArea = me.options.paramArea;
                if ($paramArea) {
                    $paramArea.reportParameter("removeParameter");
                    me.paramLoaded = false;
                }
            }
        },
        _resetViewer: function(isSameReport){
            var me = this;

            //me.sessionID = "";
            me.numPages = 0;
            me.floatingHeaders = [];
            if (!isSameReport)
                me.paramLoaded = false;
            me.scrollTop = 0;
            me.scrollLeft = 0;
            me.finding = false;
            me.findStart = null;
            me.hasDocMap = false;
            me.togglePageNum = 0;
            me.findKeyword = null;
        },
        loadReport: function (reportPath,pageNum) {
            var me = this;

            me._resetViewer();            
            me.options.reportPath = reportPath;
            me.options.pageNum = pageNum;
            me._loadParameters(pageNum);            
            
        },
        loadReportWithNewParameters: function(paramList){
            var me = this;
           
            me._resetViewer(true);            
            me._loadPage(1, false, null, paramList, true);
        },
        _loadPage: function (newPageNum, loadOnly, bookmarkID, paramList, flushCache) {
            var me = this;

            if (flushCache !== undefined && flushCache)
                me.flushCache();

            if (me.pages[newPageNum])
                if (me.pages[newPageNum].$container) {
                    if (!loadOnly) {
                        me._setPage(newPageNum);
                        me._cachePages(newPageNum);
                    }
                    return;
                }
            if (!paramList) paramList = "";

            if (!loadOnly) {
                me._addLoadingIndicator();
            }
            me.togglePageNum = newPageNum;
            me.lock = 1;
            $.getJSON(me.options.reportViewerAPI + "/GetReportJSON/", {
                ReportServerURL: me.options.reportServerURL,
                ReportPath: me.options.reportPath,
                SessionID: me.sessionID,
                PageNumber: newPageNum,
                ParameterList: paramList
            })
            .done(function (data) {
                me._writePage(data, newPageNum, loadOnly);
                me.lock = 0;
                if (bookmarkID)
                    me._navToLink(bookmarkID);

                if (!loadOnly) me._cachePages(newPageNum);
            })
            .fail(function () { console.log("error"); me.removeLoadingIndicator(); });
        },
        _writePage: function (data, newPageNum, loadOnly) {
            var me = this;
            var $report = $("<Div/>");
            $report.addClass("Page");

            //Error, need to handle this better
            if (!data) return;

            $report.reportRender({ reportViewer: me });

            if (!me.pages[newPageNum])
                me.pages[newPageNum] = new reportPage($report, data);
            else {
                me.pages[newPageNum].$container = $report;
                me.pages[newPageNum].reportObj = data;
            }

            if (!data.SessionID)
                me.sessionID = "";
            else
                me.sessionID = data.SessionID;
            if (data.NumPages === undefined)
                me.numPages = 0;
            else
                me.numPages = data.NumPages;

            if (!loadOnly) {
                me._renderPage(newPageNum);
                me.removeLoadingIndicator();
                me._setPage(newPageNum);
            }
        },
        _renderPage: function (pageNum) {
            //Write Style
            var me = this;
            if (me.pages[pageNum] && me.pages[pageNum].isRendered === true)
                return;

            if (!me.pages[pageNum].reportObj.Exception) {                
                me.hasDocMap = me.pages[pageNum].reportObj.HasDocMap;
                me.pages[pageNum].$container.reportRender("render", me.pages[pageNum].reportObj);
            }
            else
                me.pages[pageNum].$container.reportRender("writeError", me.pages[pageNum].reportObj);
            me.pages[pageNum].isRendered = true;
        },
                
        _sessionPing: function () {
            // Ping each report so that the seesion does not expire on the report server
            var me = this;
            if (me.sessionID && me.sessionID !== "")
                $.getJSON(me.options.reportViewerAPI + "/PingSession/", {
                    ReportServerURL: me.options.reportServerURL,
                    SessionID: me.sessionID
                })
                .done(function (data) {
                    if (data.Status === "Fail") {
                        me.sessionID = "";
                        alert(messages.sessionExpired);
                    }
                })
                .fail(function () { me.sessionID = ""; console.log("error"); alert(messages.sessionExpired); });

        },
        _updateTableHeaders: function (me) {
            // Update the floating headers in this viewer
            // Update the toolbar

            $.each(me.floatingHeaders, function (index, obj) {
                me._setRowHeaderOffset(obj.$tablix, obj.$rowHeader);
                me._setColHeaderOffset(obj.$tablix, obj.$colHeader);
            });
        },
        _hideTableHeaders: function () {
            // On a touch device hide the headers during a scroll if possible
            var me = this;
            $.each(me.floatingHeaders, function (index, obj) {
                if (obj.$rowHeader) obj.$rowHeader.hide();
                if (obj.$colHeader) obj.$colHeader.hide();
            });
            if (me.$floatingToolbar) me.$floatingToolbar.hide();
        },
        _navToLink: function (elementID) {
            $(document).scrollTop($("#" + elementID).offset().top - 85);
        },
        _stopDefaultEvent: function (e) {
            //IE
            if (window.ActiveXObject)
                window.event.returnValue = false;
            else {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        _getHeight: function ($obj) {
            var height;

            var $copiedElem = $obj.clone()
                                .css({
                                    visibility: "hidden"
                                });

            //Image size cannot change so do not load.
            //$copiedElem.find("img").removeAttr("src");
            //$copiedElem.find("img").removeAttr("onload");
            //$copiedElem.find("img").removeAttr("alt");
            $copiedElem.find("img").remove();

            $("body").append($copiedElem);
            height = $copiedElem.height() + "px";

            $copiedElem.remove();

            //Return in mm
            return this._convertToMM(height);

        },
        _convertToMM: function (convertFrom) {

            if (!convertFrom)
                return 0;

            var unit = convertFrom.match(/\D+$/);  // get the existing unit
            var value = convertFrom.match(/\d+/);  // get the numeric component

            if (unit.length === 1) unit = unit[0];
            if (value.length === 1) value = value[0];

            switch (unit) {
                case "px":
                    return value / 3.78;
                case "pt":
                    return value * 0.352777777778;
                case "in":
                    return value * 25.4;
                case "mm":
                    return value;
                case "cm":
                    return value * 10;
                case "em":
                    return value * 4.2175176;
            }

            //This is an error
            return value;
        }
    });  // $.widget
});   // $(function


