﻿$(function () {

    // The Floating header object holds pointers to the tablix and its row and col header objects
    function FloatingHeader($Tablix, $RowHeader, $ColHeader) {
        this.$Tablix = $Tablix;
        this.$RowHeader = $RowHeader;
        this.$ColHeader = $ColHeader;
    }

    // The page object holds the data for each page   
    function ReportPage($Container, ReportObj) {
        this.ReportObj = ReportObj;
        this.$Container = $Container;
        this.IsRendered = false;
    }

    // report viewer widget
    $.widget("Forerunner.reportViewer", {
        // Default options
        options: {
            ReportServerURL: null,
            ReportViewerAPI: null,
            ReportPath: null,
            PageNum: 1,
            PingInterval: 300000,
            ParameterDiv: null,
            ToolbarHeight: 0,
            SetPageDone: null,
            PageNav: null,
            ParamArea: null
        },

        _destroy: function () {
        },

        // Constructor
        _create: function () {
            var me = this;

            setInterval(function () { me.SessionPing(); }, this.options.PingInterval);

            // ReportState
            me.ActionHistory = [];
            me.CurPage = 0;
            me.Pages = new Object();
            me.SessionID = "";
            me.NumPages = 0;
            me.Lock = false;
            me.$ReportContainer = new $("<DIV class='report-container'/>");
            me.$ReportAreaContainer - null;
            me.$LoadingIndicator = new $("<div class='loading-indicator'></div>").text("Loading...");
            me.FloatingHeaders = [];
            me.ParamLoaded = false;
            me.ScrollTop = 0;
            me.ScrollLeft = 0;
            me.LoadLock = 0;
            me.Finding = false;
            me.FindStart = null;
            me.HasDocMap = false;
            me.TogglePageNum = 0;
            me.FindKeyword = null;
            me.element.append(me.$LoadingIndicator);

            $(window).scroll(function () { me.UpdateTableHeaders(me) });

            //Log in screen if needed

            //load the report Page requested  
            me.element.append(me.$ReportContainer);
            me.AddLoadingIndicator();
            me.LoadParameters(me.options.PageNum);
        },
        getCurPage: function () {
            var me = this;
            return me.CurPage;
        },
        getNumPages: function () {
            var me = this;
            return me.NumPages;
        },
        getReportViewerAPI: function () {
            var me = this;
            return me.options.ReportViewerAPI;
        },
        getReportServerURL: function () {
            var me = this;
            return me.options.ReportServerURL;
        },
        getReportPath: function () {
            var me = this;
            return me.options.ReportPath;
        },
        getSessionID: function () {
            var me = this;
            return me.SessionID;
        },
        getHasDocMap: function () {
            var me = this;
            return me.HasDocMap;
        },
        SetColHeaderOffset: function ($Tablix, $ColHeader) {
            //Update floating column headers
            var me = this;
            if ($ColHeader == null)
                return;

            offset = $Tablix.offset();
            scrollLeft = $(window).scrollLeft();
            if ((scrollLeft > offset.left) && (scrollLeft < offset.left + $Tablix.width())) {
                //$ColHeader.css("top", $Tablix.offset.top);
                $ColHeader.css("left", Math.min(scrollLeft - offset.left, $Tablix.width() - $ColHeader.width()) + "px");
                $ColHeader.fadeIn('fast');
            }
            else {
                $ColHeader.hide();

            }
        },
        SetRowHeaderOffset: function ($Tablix, $RowHeader) {
            //  Update floating row headers
            var me = this;
            if ($RowHeader == null)
                return;

            offset = $Tablix.offset();
            scrollTop = $(window).scrollTop();
            if ((scrollTop > offset.top) && (scrollTop < offset.top + $Tablix.height())) {
                $RowHeader.css("top", (Math.min((scrollTop - offset.top), ($Tablix.height() - $RowHeader.height())) + me.options.ToolbarHeight) + "px");
                $RowHeader.fadeIn('fast');
            }
            else {
                $RowHeader.hide();
            }
        },
        AddLoadingIndicator: function () {
            var me = this;
           
            me.LoadLock = 1;
            setTimeout(function () { me.ShowLoadingIndictator(me); }, 500);
        },
        ShowLoadingIndictator: function (me) {
            if (me.LoadLock == 1) {                
                //212 is static value for loading indicator width
                var scrollLeft = me.$ReportContainer.width() - 212;

                me.$LoadingIndicator.css("top", me.$ReportContainer.scrollTop() + 100 + 'px')
                    .css("left", scrollLeft > 0 ? scrollLeft / 2 : 0 + 'px');

                me.$ReportContainer.css({ opacity: 0.5 });
                me.$LoadingIndicator.show();
            }
        },
        RemoveLoadingIndicator: function () {
            var me = this;
            me.LoadLock = 0;
            me.$ReportContainer.css({ opacity: 1 });
            me.$LoadingIndicator.hide();
        },
        SetPage: function (NewPageNum) {
            //  Load a new page into the screen and udpate the toolbar
            var me = this;

            if (!me.Pages[NewPageNum].IsRendered)
                me.RenderPage(NewPageNum);
            if (me.$ReportAreaContainer == null) {
                me.$ReportAreaContainer = $("<Div/>");
                me.$ReportAreaContainer.addClass("report-area-container");
                me.$ReportContainer.append(me.$ReportAreaContainer);
                me.$ReportAreaContainer.append(me.Pages[NewPageNum].$Container);
                me.touchNav();
                me.Pages[NewPageNum].$Container.fadeIn();
            }
            else {
                me.$ReportAreaContainer.find(".Page").detach();
                me.$ReportAreaContainer.append(me.Pages[NewPageNum].$Container);

                if (me.CurPage != null && me.CurPage > NewPageNum) {
                    me.Pages[NewPageNum].$Container.show();
                } else {
                    me.Pages[NewPageNum].$Container.show();
                }

            }
                       
            me.CurPage = NewPageNum;
            // Trigger the change page event to allow any widget (E.g., toolbar) to update their view
            me._trigger('changepage', null, { newPageNum: NewPageNum, paramLoaded: me.ParamLoaded });

            $(window).scrollLeft(me.ScrollLeft);
            $(window).scrollTop(me.ScrollTop);
            me.Lock = 0;
            if (me.options.SetPageDone != null) me._trigger("SetPageDone");
        },
        touchNav: function () {
            // Touch Events
            var me = this;
            $(me.element).swipe({
                fallbackToMouseEvents: false,
                allowPageScroll: "auto",
                swipe: function (e, dir) {
                    if (dir == 'left' || dir == 'up')
                        me.NavToPage((me.CurPage + 1));
                    else
                        me.NavToPage((me.CurPage - 1));
                },
                swipeStatus: function (event, phase, direction, distance) {
                    if (phase == "start")
                        me.HideTableHeaders();
                },
                tap: function (event, target) {
                    $(target).trigger('click');
                },
               longTapThreshold: 1000,
            });
        },
        RefreshReport: function () {
            // Remove all cached data on the report and re-run
            var me = this;
            me.SessionID = "";            
            if (me.ParamLoaded == true) {
                var $ParamArea = me.options.ParamArea;
                me.LoadPage(1, false, null, $ParamArea.reportParameter("GetParamsList"),true);
            }
            else {
                me.LoadPage(1, false,null,null,true);
            }
        },
        NavToPage: function (NewPageNum) {
            var me = this;
            if (NewPageNum == me.CurPage || me.Lock == 1)
                return;

            me.ScrollLeft = 0;
            me.ScrollTop = 0;

            if (NewPageNum > me.NumPages) {
                NewPageNum = 1;
            }
            if (NewPageNum < 1) {
                NewPageNum = me.NumPages;
            }
            if (NewPageNum != me.CurPage) {
                if (me.Lock == 0) {
                    me.Lock = 1;
                    me.LoadPage(NewPageNum, false);
                }
            }
        },
        ShowDocMap: function () {
            if ($(".DocMapPanel").length > 0)
                $(".DocMapPanel").animate({ height: 'toggle' }, 100, function () {
                    $(".DocMapBorder").css("height", document.body.clientHeight - $(".DocMapPanel").offset().top);
                });
        },
        CachePages: function (InitPage) {
            var me = this;
             
            var low = InitPage - 1;
            var high = InitPage + 1;
            if (low < 1) low = 1;
            if (high > me.NumPages) high = me.NumPages;

            for (var i = low; i <= high; i++)
                if (me.Pages[i] == null)
                    if (i != InitPage)
                        me.LoadPage(i, true);

        },      
        Back: function () {
            var me = this;
            var action = me.ActionHistory.pop();
            if (action != undefined) {
                
                me.options.ReportPath = action.ReportPath;
                me.SessionID = action.SessionID;
                me.ScrollLeft = action.ScrollLeft;
                me.ScrollTop = action.ScrollTop;
                
                me._trigger('drillback');
                me.RemoveParameters();
                me.LoadPage(action.CurrentPage, false,null,null,true);
            }
            else {
                me._trigger('back', null, {path: me.options.ReportPath});
            }
        },
        ShowNav: function () {
            var me = this;
            if (me.options.PageNav != null){
                me.options.PageNav.pagenav('showNav');
            }
        },
        FlushCache: function () {
            var me = this;
            me.Pages = new Object();
            if (me.options.PageNav != null)
                me.options.PageNav.pagenav('reset');
        },
        _PrepareAction: function () {
            var me = this;

            if (me.TogglePageNum != me.CurPage || me.TogglePageNum  == 0) {
                $.ajax({
                    url: me.options.ReportViewerAPI + "/GetReportJSON/",
                    data: {
                        ReportServerURL: me.options.ReportServerURL,
                        ReportPath: me.options.ReportPath,
                        SessionID: me.SessionID,
                        PageNumber: me.CurPage,
                        ParameterList: ""
                    },
                    dataType: 'json',
                    async: false,
                    success: function (data) {
                        me.TogglePageNum = me.CurPage;
                    },
                    fail: function () { alert("Fail"); }
                });
            }
        },
        Sort: function (Direction, ID) {
            //Go the other dirction from current
            var me = this;
            var newDir;
            if (Direction == "Ascending")
                newDir = "Descending";
            else
                newDir = "Ascending";

            $.getJSON(me.options.ReportViewerAPI + "/SortReport/", {
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                SortItem: ID,
                Direction: newDir
            }).done(function (Data) {
                me.NumPages = Data.NumPages;
                me.LoadPage((Data.NewPage), false,null,null,true );
            })
            .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        ToggleItem: function (ToggleID) {
            var me = this;
            me.ToggleID = ToggleID;
            me._PrepareAction();

            $.getJSON(me.options.ReportViewerAPI + "/NavigateTo/", {
                NavType: "toggle",
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                UniqueID: ToggleID
            }).done(function (Data) {
                if (Data.Result == true) {
                    //var pc = me.Pages[me.CurPage];
                    //pc.$Container.detach();
                    me.ScrollLeft = $(window).scrollLeft();
                    me.ScrollTop = $(window).scrollTop();

                    me.Pages[me.CurPage] = null;
                    me.LoadPage(me.CurPage, false);
                }
            })
           .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        NavigateBookmark: function (BookmarkID) {
            var me = this;
            me._PrepareAction();
            $.getJSON(me.options.ReportViewerAPI + "/NavigateTo/", {
                NavType: "bookmark",
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                UniqueID: BookmarkID
            }).done(function (Data) {
                if (Data.NewPage == me.CurPage) {
                   me.NavToLink(BookmarkID);
                } else {
                    me.BackupCurPage();
                    me.LoadPage(Data.NewPage, false, BookmarkID);
                }
            })
           .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        NavigateDrillthrough: function (DrillthroughID) {
            var me = this;
            me._PrepareAction();
            $.getJSON(me.options.ReportViewerAPI + "/NavigateTo/", {
                NavType: "drillthrough",
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                UniqueID: DrillthroughID
            }).done(function (Data) {
                me.BackupCurPage();
                if (Data.Exception != null)
                    me.$ReportAreaContainer.find(".Page").reportRender("WriteError", Data);
                else {
                    me.SessionID = Data.SessionID;
                    me.options.ReportPath = Data.ReportPath;
                    if (Data.ParametersRequired) {
                        me.$ReportAreaContainer.find(".Page").detach();
                        me.SetScrollLocation(0, 0);
                        me.ShowParameters(1, Data.Parameters);
                    }
                    else {
                        me.SetScrollLocation(0, 0);
                        me.LoadPage(1, false, null, null, true);
                    }
                }

            })
           .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        NavigateDocumentMap: function (DocumentMapID) {
            var me = this;
            $.getJSON(me.options.ReportViewerAPI + "/NavigateTo/", {
                NavType: "documentMap",
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                UniqueID: DocumentMapID
            }).done(function (Data) {
                me.BackupCurPage();
                me.LoadPage(Data.NewPage, false, null);                
            })
           .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        BackupCurPage: function () {
            var me = this;

            me.ActionHistory.push({ ReportPath: me.options.ReportPath, SessionID: me.SessionID, CurrentPage: me.CurPage, ScrollTop: $(window).scrollTop(), ScrollLeft: $(window).scrollLeft() });
        },
        SetScrollLocation: function (top, left) {
            var me = this;
            me.ScrollLeft = left;
            me.ScrollTop = top;
        },
        Find: function (Keyword,StartPage, EndPage) {
            var me = this;            
            if (Keyword == '') return;

            if (me.FindKeyword == null || me.FindKeyword != Keyword) { me.FindKeyword = Keyword; me.FindStart = null; }

            if (StartPage == null) StartPage = me.getCurPage();
            if (EndPage == null) EndPage = me.getNumPages();

            if (me.FindStart == null) me.FindStart = StartPage;

            $.getJSON(me.options.ReportViewerAPI + "/FindString/", {
                ReportServerURL: me.options.ReportServerURL,
                SessionID: me.SessionID,
                StartPage: StartPage,
                EndPage: EndPage,
                FindValue: Keyword
            }).done(function (Data) {
                if (Data.NewPage != 0) {
                    me.Finding = true;
                    if (Data.NewPage != me.CurPage) {
                        me.options.SetPageDone = function () { me.SetFindHighlight(Keyword) };
                        me.Pages[Data.NewPage] = null;
                        me.LoadPage(Data.NewPage, false);
                    } else {
                        me.SetFindHighlight(Keyword);
                    }
                }
                else {
                    if (me.Finding == true) {
                        alert('The entire report has been searched.');
                        me.ResetFind();
                    }
                    else
                        alert('Keyword not found');
                }
            })
          .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); });
        },
        FindNext: function (Keyword) {
            var me = this;
            $(".Find-Keyword").filter('.Find-Highlight').first().removeClass("Find-Highlight");

            var $NextWord = $(".Find-Keyword").filter('.Unread').first();
            if ($NextWord.length > 0) {
                $NextWord.removeClass("Unread").addClass("Find-Highlight").addClass("Read");
                $(document).scrollTop($NextWord.offset().top - 100);
            }
            else {
                if (me.getNumPages() == 1) {
                    alert('The entire report has been searched.');
                    me.ResetFind();
                    return;
                }

                if (me.getCurPage() + 1 <= me.getNumPages())
                    me.Find(Keyword, me.getCurPage() + 1);
                else if (me.FindStart > 1)
                    me.Find(Keyword, 1, me.FindStart - 1);
                else {
                    alert('The entire report has been searched.');
                    me.ResetFind();
                }
            }
        },
        SetFindHighlight: function (Keyword) {
            var me = this;

            $(me).clearHighLightWord();
            me.$ReportContainer.highLightWord(Keyword);

            //Highlight the first match.
            var $item = $(".Find-Keyword").filter('.Unread').first()            
            $item.removeClass("Unread").addClass("Find-Highlight").addClass("Read");

            $(document).scrollTop($item.offset().top - 100);
            //if (me.Finding == true) me.Finding = false;
        },
        ResetFind: function () {
            var me = this;
            me.Finding = false;
            me.FindStart = null;
            me.FindKeyword = null;
        },
        ShowExport: function () {
            if ($(".Export-Panel").is(":hidden")) {
                var $Export = $(".fr-button-export").filter(":visible");
                $(".Export-Panel").css("left", $Export.offset().left).css("top", $Export.offset().top + $Export.height() + 2);
            }
            $(".Export-Panel").toggle();
        },
        Export: function (ExportType) {
            var me = this;
            $(".Export-Panel").toggle();
            var url = me.options.ReportViewerAPI + "/ExportReport/?ReportServerURL=" + me.getReportServerURL() + "&ReportPath=" + me.getReportPath() + "&SessionID=" + me.getSessionID() + "&ParameterList=&ExportType=" + ExportType;
            window.open(url);
        },

        //Page Loading
        LoadParameters: function (PageNum) {
            var me = this;
            $.getJSON(me.options.ReportViewerAPI + "/GetParameterJSON/", {
                ReportServerURL: me.options.ReportServerURL,
                ReportPath: me.options.ReportPath
            })
           .done(function (Data) {
               me.ShowParameters(PageNum, Data);
           })
           .fail(function () {
               console.log("error");
               me.RemoveLoadingIndicator();
           })
        },
        ShowParameters: function (PageNum, Data) {
            var me = this;
            if (Data.Type == "Parameters") {
                me.RemoveParameters();
                $ParamArea = me.options.ParamArea;
                if ($ParamArea != null) {
                    me._trigger('showparamarea');
                    $ParamArea.reportParameter("WriteParameterPanel", Data, me, PageNum, false);
                    me.ParamLoaded = true;
                }
            }
            else if (Data.Exception != null) {
                me.$ReportContainer.reportRender({ ReportViewer: this });
                me.$ReportContainer.reportRender("WriteError", Data);
                me.RemoveLoadingIndicator();
            }
            else {
                me.LoadPage(PageNum, false);
            }
        },
        RemoveParameters: function () {
            var me = this;
            if (me.ParamLoaded == true) {
                $ParamArea = me.options.ParamArea;
                if ($ParamArea != null) {
                    $ParamArea.reportParameter("RemoveParameter");
                    me.ParamLoaded = false;
                }
            }
        },
        LoadPage: function (NewPageNum, LoadOnly, BookmarkID, ParameterList,FlushCache) {
            var me = this;
           
            if (FlushCache != null && FlushCache)
                me.FlushCache();

            if (me.Pages[NewPageNum] != null)
                if (me.Pages[NewPageNum].$Container != null) {
                    if (!LoadOnly) {
                        me.SetPage(NewPageNum);
                        me.CachePages(NewPageNum);
                    }
                    return;
                }
            if (ParameterList == null) ParameterList = "";
            
            if (!LoadOnly) {
                me.AddLoadingIndicator();
            }
            me.TogglePageNum = NewPageNum;
            me.Lock = 1;
            $.getJSON(me.options.ReportViewerAPI + "/GetReportJSON/", {
                ReportServerURL: me.options.ReportServerURL,
                ReportPath: me.options.ReportPath,
                SessionID: me.SessionID,
                PageNumber: NewPageNum,
                ParameterList: ParameterList
            })
            .done(function (Data) {               
                me.WritePage(Data, NewPageNum, LoadOnly);
                me.Lock = 0;
                if (BookmarkID != null)
                    me.NavToLink(BookmarkID);
                
                if (!LoadOnly) me.CachePages(NewPageNum);
            })
            .fail(function () { console.log("error"); me.RemoveLoadingIndicator(); })
        },
        WritePage: function (Data, NewPageNum, LoadOnly) {
            var me = this;
            var $Report = $("<Div/>");
            $Report.addClass("Page");

            //Error, need to handle this better
            if (Data == null) return;

            $Report.reportRender({ ReportViewer: me });

            if (me.Pages[NewPageNum] == null)
                me.Pages[NewPageNum] = new ReportPage($Report, Data);
            else {
                me.Pages[NewPageNum].$Container = $Report;
                me.Pages[NewPageNum].ReportObj = Data;
            }

            if (Data.SessionID == null)
                me.SessionID = "";
            else
                me.SessionID = Data.SessionID;
            if (Data.NumPages == null)
                me.NumPages = 0
            else
                me.NumPages = Data.NumPages;
       
            if (!LoadOnly) {
                me.RenderPage(NewPageNum);
                me.RemoveLoadingIndicator();
                me.SetPage(NewPageNum);
            }
        },
        RenderPage: function (pageNum) {
            //Write Style
            var me = this;
            if (me.Pages[pageNum] != null && me.Pages[pageNum].IsRendered == true)
                return;

            if (me.Pages[pageNum].ReportObj.Exception == null) {
                if (me.$ReportContainer.find(".DocMapPanel").length == 0 && me.Pages[pageNum].ReportObj.Report.DocumentMap != null) {
                    me.HasDocMap = true;
                    me.$ReportContainer.reportDocumentMap({ ReportViewer: me });
                    me.$ReportContainer.reportDocumentMap("WriteDocumentMap", pageNum);
                }

                me.Pages[pageNum].$Container.reportRender("Render", me.Pages[pageNum].ReportObj);
            }
            else
                me.Pages[pageNum].$Container.reportRender("WriteError", me.Pages[pageNum].ReportObj);
            me.Pages[pageNum].IsRendered = true;
        },
                
        SessionPing: function () {
            // Ping each report so that the seesion does not expire on the report server
            var me = this;
            if (me.SessionID != null && me.SessionID != "")
                $.getJSON(me.options.ReportViewerAPI + "/PingSession/", {
                    ReportServerURL: me.options.ReportServerURL,
                    SessionID: me.SessionID
                })
                .done(function (Data) {
                    if (Data.Status == "Fail") {
                        me.SessionID = "";
                        alert("Your session has expired");                        
                    }
                })
                .fail(function () { console.log("error"); })

        },
        UpdateTableHeaders: function (me) {
            // Update the floating headers in this viewer
            // Update the toolbar

            $.each(me.FloatingHeaders, function (Index, Obj) {
                me.SetRowHeaderOffset(Obj.$Tablix, Obj.$RowHeader);
                me.SetColHeaderOffset(Obj.$Tablix, Obj.$ColHeader);
            });
        },
        HideTableHeaders: function () {
            // On a touch device hide the headers during a scroll if possible
            var me = this;
            $.each(me.FloatingHeaders, function (Index, Obj) {
                if (Obj.$RowHeader != null) Obj.$RowHeader.hide();
                if (Obj.$ColHeader != null) Obj.$ColHeader.hide();
            });
            if (me.$FloatingToolbar != null) me.$FloatingToolbar.hide();
        },
        NavToLink: function (ElementID) {
            $(this).scrollTop($("#" + ElementID).offset().top - 85);
        },
        StopDefaultEvent: function (e) {
            //IE
            if (window.ActiveXObject)
                window.event.returnValue = false;
            else {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        _GetHeight: function ($Obj) {
            var height;

            var $copied_elem = $Obj.clone()
                                .css({
                                    visibility: "hidden"
                                });

            //Image size cannot change so do not load.
            //$copied_elem.find('img').removeAttr('src');
            //$copied_elem.find('img').removeAttr('onload');
            //$copied_elem.find('img').removeAttr('alt');
            $copied_elem.find('img').remove();

            $("body").append($copied_elem);
            height = $copied_elem.height() + "px";

            $copied_elem.remove();

            //Return in mm
            return this._ConvertToMM(height);

        },
        _ConvertToMM: function (ConvertFrom) {

            if (ConvertFrom == null)
                return 0;

            var unit = ConvertFrom.match(/\D+$/);  // get the existing unit
            var value = ConvertFrom.match(/\d+/);  // get the numeric component

            if (unit.length == 1) unit = unit[0];
            if (value.length == 1) value = value[0];

            switch (unit) {
                case "px":
                    return value / 3.78;
                    break;
                case "pt":
                    return value * 0.352777777778;
                    break;
                case "in":
                    return value * 25.4;
                    break;
                case "mm":
                    return value;
                    break;
                case "cm":
                    return value * 10;
                    break;
                case "em":
                    return value * 4.2175176;
                    break;
            }

            //This is an error
            return value;
        },
    });  // $.widget
});   // $(function



jQuery.fn.extend({
    slideRightShow: function (delay) {
        return this.each(function () {
            $(this).show('slide', { direction: 'right', easing: 'easeInCubic' }, delay);
        });
    },
    slideLeftHide: function (delay) {
        return this.each(function () {
            $(this).hide('slide', { direction: 'left', easing: 'easeOutCubic' }, delay);
        });
    },
    slideRightHide: function (delay) {
        return this.each(function () {
            $(this).hide('slide', { direction: 'right', easing: 'easeOutCubic' }, delay);
        });
    },
    slideLeftShow: function (delay) {
        return this.each(function () {
            $(this).show('slide', { direction: 'left', easing: 'easeInCubic' }, delay);
        });
    },
    highLightWord: function (Keyword) {
        if (Keyword == undefined || Keyword == "") {
            return;
        }
        else {
            $(this).each(function () {
                elt = $(this).get(0);
                elt.normalize();
                $.each($.makeArray(elt.childNodes), function (i, node) {
                    //nodetype=3 : text node
                    if (node.nodeType == 3) {
                        var searchnode = node;
                        var pos = searchnode.data.toUpperCase().indexOf(Keyword.toUpperCase());

                        while (pos < searchnode.data.length) {
                            if (pos >= 0) {
                                var spannode = document.createElement('span');
                                spannode.className = 'Find-Keyword Unread';
                                var middlebit = searchnode.splitText(pos);
                                var searchnode = middlebit.splitText(Keyword.length);
                                var middleclone = middlebit.cloneNode(true);
                                spannode.appendChild(middleclone);
                                searchnode.parentNode.replaceChild(spannode, middlebit);
                            }
                            else {
                                break;
                            }

                            pos = searchnode.data.toUpperCase().indexOf(Keyword.toUpperCase());
                        }
                    }
                    else {
                        $(node).highLightWord(Keyword);
                    }
                })
            })
        }
        return $(this);
    },
    clearHighLightWord: function () {
        $(".Find-Keyword").each(function () {
            var text = document.createTextNode($(this).text());
            $(this).replaceWith($(text));
        });
    }
});
